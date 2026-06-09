import { Router } from "express";
import { db } from "@workspace/db";
import { listaObrasTable, obrasTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/usuarios/:uid/lista", async (req, res) => {
  try {
    const rows = await db
      .select({ obra: obrasTable })
      .from(listaObrasTable)
      .innerJoin(obrasTable, eq(listaObrasTable.obraId, obrasTable.id))
      .where(eq(listaObrasTable.uid, req.params.uid))
      .orderBy(listaObrasTable.createdAt);

    res.json(rows.map(r => serializeObra(r.obra)));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/usuarios/:uid/lista", async (req, res) => {
  try {
    const { obraId } = req.body;
    if (!obraId) {
      res.status(400).json({ error: "obraId is required" });
      return;
    }
    const [item] = await db
      .insert(listaObrasTable)
      .values({ uid: req.params.uid, obraId: Number(obraId) })
      .onConflictDoNothing()
      .returning();
    res.status(201).json(item ?? { uid: req.params.uid, obraId: Number(obraId) });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/usuarios/:uid/lista/:obraId", async (req, res) => {
  try {
    const obraId = parseInt(req.params.obraId);
    if (isNaN(obraId)) {
      res.status(400).json({ error: "Invalid obraId" });
      return;
    }
    await db
      .delete(listaObrasTable)
      .where(and(eq(listaObrasTable.uid, req.params.uid), eq(listaObrasTable.obraId, obraId)));
    res.status(204).send();
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

function serializeObra(obra: typeof obrasTable.$inferSelect) {
  return {
    id: obra.id,
    titulo: obra.titulo,
    slug: obra.slug,
    sinopse: obra.sinopse,
    generos: obra.generos ?? [],
    status: obra.status,
    ano: obra.ano,
    nota: obra.nota,
    totalEps: obra.totalEps,
    capaUrl: obra.capaUrl,
    bannerUrl: obra.bannerUrl,
    tipografiaUrl: obra.tipografiaUrl,
    showInBanner: obra.showInBanner,
    bannerOrder: obra.bannerOrder,
    views: obra.views,
    createdAt: obra.createdAt.toISOString(),
    updatedAt: obra.updatedAt.toISOString(),
  };
}

export default router;
