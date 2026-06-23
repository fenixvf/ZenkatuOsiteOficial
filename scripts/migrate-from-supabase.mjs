import pg from '/home/runner/workspace/node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/index.js';

const { Client } = pg;

const SRC_URL = 'postgresql://postgres.uaggmlgoyhqmzlycfpyo:M4ur1c18m1m2@aws-1-sa-east-1.pooler.supabase.com:6543/postgres';
const DST_URL = process.env.DATABASE_URL;

const TABLES = [
  'users',
  'generos',
  'obras',
  'episodios',
  'comentarios',
  'lista_obras',
  'historico',
  'profile_images',
  'site_config',
];

// jsonb columns per table that need JSON.stringify before insert
const JSONB_COLS = {
  obras: ['cast'],
  episodios: [],
  users: [],
};

async function getJsonbCols(client, table) {
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = $1 AND data_type = 'jsonb'`,
    [table]
  );
  return rows.map(r => r.column_name);
}

async function migrate() {
  const src = new Client({ connectionString: SRC_URL, ssl: { rejectUnauthorized: false } });
  const dst = new Client({ connectionString: DST_URL });

  console.log('Conectando ao Supabase...');
  await src.connect();
  console.log('Conectando ao Replit DB...');
  await dst.connect();

  for (const table of TABLES) {
    console.log(`\n→ Migrando tabela: ${table}`);
    try {
      const { rows } = await src.query(`SELECT * FROM ${table}`);
      if (rows.length === 0) {
        console.log(`  Vazia, pulando.`);
        continue;
      }

      const jsonbCols = await getJsonbCols(dst, table);

      await dst.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);

      const cols = Object.keys(rows[0]);
      let count = 0;

      for (const row of rows) {
        const values = cols.map((c) => {
          const v = row[c];
          if (jsonbCols.includes(c) && v !== null && typeof v === 'object') {
            return JSON.stringify(v);
          }
          return v;
        });
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
        const colNames = cols.map((c) => `"${c}"`).join(', ');

        await dst.query(
          `INSERT INTO ${table} (${colNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          values
        );
        count++;
      }
      console.log(`  ${count} registros migrados.`);
    } catch (e) {
      console.error(`  ERRO em ${table}: ${e.message}`);
    }
  }

  // Fix sequences after bulk insert
  console.log('\n→ Atualizando sequences...');
  for (const table of TABLES) {
    try {
      await dst.query(`
        SELECT setval(
          pg_get_serial_sequence('${table}', 'id'),
          COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1,
          false
        )
      `);
    } catch (_) {}
  }

  await src.end();
  await dst.end();
  console.log('\nMigração concluída!');
}

migrate().catch((e) => {
  console.error('Falha na migração:', e.message);
  process.exit(1);
});
