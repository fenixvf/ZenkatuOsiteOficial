// Migra as tabelas de usuários do 1º banco (Supabase #1) para o 2º banco
// (Supabase #2), que passa a ser a casa dos dados de pessoas da Zenkatu.
//
// Uso:
//   SUPABASE_DATABASE_URL="postgresql://..."      # origem  (1º banco)
//   SUPABASE2_DATABASE_URL="postgresql://..."     # destino (2º banco)
//   node scripts/migrate-users-to-supabase2.mjs [--dry-run] [--upsert]
//
//   --dry-run  apenas mostra contagens, não escreve nada
//   --upsert   atualiza no destino o que já existe (padrão: só insere o que falta)
//
// O script é idempotente: rodar de novo não duplica nem apaga dados. Ele NÃO
// apaga nada da origem — a cópia antiga continua lá até você validá-lo.
//
// Antes de rodar, crie as tabelas no destino:
//   pnpm --filter @workspace/db run push:users
import pg from "pg";

const { Client } = pg;

const SRC_URL = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
const DST_URL = process.env.SUPABASE2_DATABASE_URL;

const DRY_RUN = process.argv.includes("--dry-run");
const UPSERT = process.argv.includes("--upsert");

// Tabelas de usuários que vivem no 2º banco.
const TABLES = [
  "users",
  "profile_images",
  "push_subscriptions",
  "onesignal_subscriptions",
  "zenkatuber_requests",
];

// Tabelas do 1º banco que apontavam para users.uid e precisam perder a FK
// (o Postgres não permite chave estrangeira entre bancos diferentes).
const TABELAS_COM_FK_PARA_USERS = ["lista_obras", "historico"];

const LOTE_LEITURA = 500;
const LOTE_ESCRITA = 100;

if (!SRC_URL) {
  console.error("Defina SUPABASE_DATABASE_URL (1º banco) para continuar.");
  process.exit(1);
}
if (!DST_URL) {
  console.error("Defina SUPABASE2_DATABASE_URL (2º banco) para continuar.");
  process.exit(1);
}
if (SRC_URL === DST_URL) {
  console.error(
    "SUPABASE_DATABASE_URL e SUPABASE2_DATABASE_URL são iguais — confira as chaves.",
  );
  process.exit(1);
}

function conectar(url) {
  return new Client({
    connectionString: url,
    ssl: url.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
  });
}

async function existeTabela(client, tabela) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
    [tabela],
  );
  return rows.length > 0;
}

async function colunas(client, tabela) {
  const { rows } = await client.query(
    `SELECT column_name, data_type
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position`,
    [tabela],
  );
  return rows;
}

async function chavePrimaria(client, tabela) {
  const { rows } = await client.query(
    `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = $1
        AND tc.constraint_type = 'PRIMARY KEY'
      ORDER BY kcu.ordinal_position`,
    [tabela],
  );
  return rows.map((r) => r.column_name);
}

async function contar(client, tabela) {
  const { rows } = await client.query(`SELECT count(*)::int AS n FROM ${tabela}`);
  return rows[0].n;
}

function valor(col, value) {
  if (value === null || value === undefined) return null;
  if ((col.data_type === "jsonb" || col.data_type === "json") && typeof value !== "string") {
    return JSON.stringify(value);
  }
  return value;
}

async function copiarTabela(src, dst, tabela) {
  const srcCols = await colunas(src, tabela);
  const dstCols = await colunas(dst, tabela);
  const dstNomes = new Set(dstCols.map((c) => c.column_name));
  const pk = await chavePrimaria(dst, tabela);

  // Só copia colunas que existem nos dois lados.
  const cols = srcCols.filter((c) => dstNomes.has(c.column_name));
  const ignoradas = srcCols.filter((c) => !dstNomes.has(c.column_name));

  if (cols.length === 0) {
    console.log("  ⚠ Nenhuma coluna em comum — pulando.");
    return 0;
  }

  const ordem = pk.length > 0 ? pk.map((c) => `"${c}"`).join(", ") : "ctid";
  const colNames = cols.map((c) => `"${c.column_name}"`);
  const alvos = pk.map((c) => `"${c}"`);

  let inseridos = 0;
  let offset = 0;

  // Lê em lotes para não carregar avatares inteiros na memória de uma vez.
  for (;;) {
    const { rows } = await src.query(
      `SELECT * FROM ${tabela} ORDER BY ${ordem} LIMIT ${LOTE_LEITURA} OFFSET ${offset}`,
    );
    if (rows.length === 0) break;
    offset += rows.length;

    const valores = rows.flatMap((row) => cols.map((c) => valor(c, row[c.column_name])));
    const placeholders = rows
      .map(
        (_, r) =>
          `(${cols.map((_, c) => `$${r * cols.length + c + 1}`).join(", ")})`,
      )
      .join(", ");

    let sql = `INSERT INTO ${tabela} (${colNames.join(", ")}) VALUES ${placeholders}`;

    if (UPSERT && alvos.length > 0) {
      const update = cols
        .filter((c) => !pk.includes(c.column_name))
        .map((c) => `"${c.column_name}" = excluded."${c.column_name}"`);
      sql +=
        update.length > 0
          ? ` ON CONFLICT (${alvos.join(", ")}) DO UPDATE SET ${update.join(", ")}`
          : ` ON CONFLICT (${alvos.join(", ")}) DO NOTHING`;
    } else {
      sql += " ON CONFLICT DO NOTHING";
    }

    try {
      const res = await dst.query(sql, valores);
      inseridos += res.rowCount ?? 0;
    } catch (e) {
      // Lote falhou: refaz linha a linha para não derrubar o resto da cópia.
      console.log(`  ⚠ Lote refeito linha a linha (${e.message.split("\n")[0]})`);
      for (const row of rows) {
        const vals = cols.map((c) => valor(c, row[c.column_name]));
        const ph = cols.map((_, c) => `$${c + 1}`).join(", ");
        let single = `INSERT INTO ${tabela} (${colNames.join(", ")}) VALUES (${ph}) ON CONFLICT DO NOTHING`;
        if (UPSERT && alvos.length > 0) {
          const update = cols
            .filter((c) => !pk.includes(c.column_name))
            .map((c) => `"${c.column_name}" = excluded."${c.column_name}"`);
          if (update.length > 0) {
            single += ` ON CONFLICT (${alvos.join(", ")}) DO UPDATE SET ${update.join(", ")}`;
          }
        }
        try {
          const r = await dst.query(single, vals);
          inseridos += r.rowCount ?? 0;
        } catch (e2) {
          console.error(`  ✗ Linha rejeitada em ${tabela}: ${e2.message}`);
        }
      }
    }
  }

  if (ignoradas.length > 0) {
    console.log(
      `  Colunas só na origem (ignoradas): ${ignoradas.map((c) => c.column_name).join(", ")}`,
    );
  }
  return inseridos;
}

async function removerFksParaUsers(src) {
  for (const tabela of TABELAS_COM_FK_PARA_USERS) {
    if (!(await existeTabela(src, tabela))) continue;
    const { rows } = await src.query(
      `SELECT c.conname
         FROM pg_constraint c
         WHERE c.conrelid = $1::regclass
           AND c.confrelid = 'users'::regclass
           AND c.contype = 'f'`,
      [tabela],
    );
    for (const { conname } of rows) {
      if (DRY_RUN) {
        console.log(`  (dry-run) removeria ${tabela}.${conname}`);
        continue;
      }
      await src.query(`ALTER TABLE ${tabela} DROP CONSTRAINT IF EXISTS "${conname}"`);
      console.log(`  ✓ FK removida: ${tabela}.${conname}`);
    }
  }
}

async function main() {
  console.log("Migração de usuários → 2º Supabase");
  console.log(
    `Modo: ${DRY_RUN ? "dry-run (nada será escrito)" : "real"}${UPSERT ? " / upsert" : ""}\n`,
  );

  const src = conectar(SRC_URL);
  const dst = conectar(DST_URL);

  console.log("Conectando ao 1º banco...");
  await src.connect();
  console.log("Conectando ao 2º banco...");
  await dst.connect();

  const resumo = [];

  for (const tabela of TABLES) {
    console.log(`\n→ ${tabela}`);

    if (!(await existeTabela(src, tabela))) {
      console.log("  Não existe na origem — pulando.");
      continue;
    }
    if (!(await existeTabela(dst, tabela))) {
      console.error(
        "  ✗ Tabela ausente no destino. Rode antes: pnpm --filter @workspace/db run push:users",
      );
      process.exit(1);
    }

    const antesDst = await contar(dst, tabela);

    let inseridos = 0;
    if (!DRY_RUN) {
      inseridos = await copiarTabela(src, dst, tabela);
    }

    const origem = await contar(src, tabela);
    const destino = await contar(dst, tabela);
    resumo.push({ tabela, origem, destino, inseridos });
    console.log(
      `  origem=${origem}  destino=${destino}  ${DRY_RUN ? "" : `novos=${inseridos}`}`,
    );

    if (destino < antesDst) {
      console.error("  ✗ Contagem do destino caiu — abortando.");
      process.exit(1);
    }
    if (!DRY_RUN && destino < origem) {
      console.error(
        `  ⚠ Destino (${destino}) menor que origem (${origem}) — rode de novo com --upsert.`,
      );
    }
  }

  console.log("\n→ Removendo FKs do 1º banco que apontam para users...");
  await removerFksParaUsers(src);

  console.log("\n──────── Resumo ────────");
  for (const r of resumo) {
    console.log(
      `${r.tabela.padEnd(26)} origem=${String(r.origem).padStart(6)}  destino=${String(r.destino).padStart(6)}  copiados=${r.inseridos}`,
    );
  }
  console.log(
    "\nValide destino ≥ origem em todas as tabelas antes de apontar o site para o 2º banco.",
  );
  if (DRY_RUN) console.log("(dry-run: nada foi escrito)");

  await src.end();
  await dst.end();
}

main().catch((e) => {
  console.error("Falha na migração:", e.message);
  process.exit(1);
});
