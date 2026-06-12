import { Router } from "express";
import { db } from "@workspace/db";
import { historicoTable, episodiosTable, obrasTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

router.get("/usuarios/:uid/historico", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: historicoTable.id,
        uid: historicoTable.uid,
        episodioId: historicoTable.episodioId,
        obraId: historicoTable.obraId,
        watchedAt: historicoTable.watchedAt,
        episodioNumero: episodiosTable.numero,
        episodioTitulo: episodiosTable.titulo,
        episodioTemporada: episodiosTable.temporada,
        obraTitulo: obrasTable.titulo,
        obraSlug: obrasTable.slug,
        obraCapaUrl: obrasTable.capaUrl,
      })
      .from(historicoTable)
      .innerJoin(episodiosTable, eq(historicoTable.episodioId, episodiosTable.id))
      .innerJoin(obrasTable, eq(historicoTable.obraId, obrasTable.id))
      .where(eq(historicoTable.uid, req.params.uid))
      .orderBy(desc(historicoTable.watchedAt))
      .limit(50);

    res.json(rows.map(r => ({
      ...r,
      watchedAt: r.watchedAt.toISOString(),
    })));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/usuarios/:uid/historico", async (req, res) => {
  try {
    const { episodioId, obraId } = req.body;
    if (!episodioId || !obraId) {
      res.status(400).json({ error: "episodioId and obraId are required" });
      return;
    }
    const [row] = await db
      .insert(historicoTable)
      .values({
        uid: req.params.uid,
        episodioId: Number(episodioId),
        obraId: Number(obraId),
        watchedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [historicoTable.uid, historicoTable.episodioId],
        set: { watchedAt: new Date() },
      })
      .returning();
    res.status(201).json({ ...row, watchedAt: row.watchedAt.toISOString() });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/usuarios/:uid/historico", async (req, res) => {
  try {
    await db
      .delete(historicoTable)
      .where(eq(historicoTable.uid, req.params.uid));
    res.status(204).send();
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
