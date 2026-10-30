import { Router } from "express";
import { db } from "@workspace/db";
import { avaliacoesTable, obrasTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";

const router = Router();

/** Quantidade de obras exibidas no carrossel "Mais bem avaliados da zenkatu". */
const LIMITE_MAIS_AVALIADAS = 5;

function parseObraId(raw: string): number | null {
  const id = Number.parseInt(raw, 10);
  return Number.isNaN(id) ? null : id;
}

/** Média de estrelas, total de votos e (opcional) a nota do usuário logado. */
async function resumo(obraId: number, uid?: string) {
  const [agg] = await db
    .select({
      media: sql<string>`coalesce(avg(${avaliacoesTable.estrelas}), 0)`,
      total: sql<number>`count(*)::int`,
    })
    .from(avaliacoesTable)
    .where(eq(avaliacoesTable.obraId, obraId));

  let minha: number | null = null;
  if (uid) {
    const [minhaRow] = await db
      .select({ estrelas: avaliacoesTable.estrelas })
      .from(avaliacoesTable)
      .where(
        and(
          eq(avaliacoesTable.obraId, obraId),
          eq(avaliacoesTable.uid, uid),
        ),
      );
    minha = minhaRow?.estrelas ?? null;
  }

  return {
    media: Number(agg?.media ?? 0),
    total: Number(agg?.total ?? 0),
    minha,
  };
}

/** Top obras por média de estrelas (desempate por quantidade de votos). */
router.get("/avaliacoes/mais-avaliadas", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: obrasTable.id,
        titulo: obrasTable.titulo,
        slug: obrasTable.slug,
        ano: obrasTable.ano,
        status: obrasTable.status,
        capaUrl: obrasTable.capaUrl,
        bannerUrl: obrasTable.bannerUrl,
        tipografiaUrl: obrasTable.tipografiaUrl,
        media: sql<string>`avg(${avaliacoesTable.estrelas})`,
        total: sql<number>`count(*)::int`,
      })
      .from(avaliacoesTable)
      .innerJoin(obrasTable, eq(avaliacoesTable.obraId, obrasTable.id))
      .groupBy(obrasTable.id)
      .orderBy(
        sql`avg(${avaliacoesTable.estrelas}) desc`,
        sql`count(*) desc`,
      )
      .limit(LIMITE_MAIS_AVALIADAS);

    res.json(
      rows.map((r) => ({
        ...r,
        media: Number(r.media),
        total: Number(r.total),
      })),
    );
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/obras/:obraId/avaliacao", async (req, res) => {
  try {
    const obraId = parseObraId(req.params.obraId);
    if (obraId === null) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const uid = typeof req.query.uid === "string" ? req.query.uid : undefined;
    res.json(await resumo(obraId, uid));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/obras/:obraId/avaliacao", async (req, res) => {
  try {
    const obraId = parseObraId(req.params.obraId);
    if (obraId === null) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const { uid } = req.body;
    if (!uid || typeof uid !== "string") {
      res.status(400).json({ error: "uid is required" });
      return;
    }
    const estrelas = Number(req.body.estrelas);
    if (!Number.isInteger(estrelas) || estrelas < 1 || estrelas > 5) {
      res.status(400).json({ error: "estrelas must be an integer between 1 and 5" });
      return;
    }

    const [obra] = await db
      .select({ id: obrasTable.id })
      .from(obrasTable)
      .where(eq(obrasTable.id, obraId));
    if (!obra) {
      res.status(404).json({ error: "Obra não encontrada" });
      return;
    }

    // Uma avaliação por conta e por obra: reenviar troca a nota.
    await db
      .insert(avaliacoesTable)
      .values({ obraId, uid, estrelas })
      .onConflictDoUpdate({
        target: [avaliacoesTable.obraId, avaliacoesTable.uid],
        set: { estrelas, updatedAt: new Date() },
      });

    res.status(201).json(await resumo(obraId, uid));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/obras/:obraId/avaliacao", async (req, res) => {
  try {
    const obraId = parseObraId(req.params.obraId);
    if (obraId === null) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const uid = typeof req.query.uid === "string" ? req.query.uid : "";
    if (!uid) {
      res.status(400).json({ error: "uid is required" });
      return;
    }
    await db
      .delete(avaliacoesTable)
      .where(
        and(
          eq(avaliacoesTable.obraId, obraId),
          eq(avaliacoesTable.uid, uid),
        ),
      );
    res.json(await resumo(obraId, uid));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
