import { Router } from "express";
import { db } from "@workspace/db";
import { episodiosTable, obrasTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/episodios", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: episodiosTable.id,
        obraId: episodiosTable.obraId,
        obraTitulo: obrasTable.titulo,
        obraSlug: obrasTable.slug,
        obraCapaUrl: obrasTable.capaUrl,
        obraTipografiaUrl: obrasTable.tipografiaUrl,
        temporada: episodiosTable.temporada,
        numero: episodiosTable.numero,
        titulo: episodiosTable.titulo,
        thumbnailUrl: episodiosTable.thumbnailUrl,
        playerContent: episodiosTable.playerContent,
        publishedAt: episodiosTable.publishedAt,
      })
      .from(episodiosTable)
      .leftJoin(obrasTable, eq(episodiosTable.obraId, obrasTable.id))
      .orderBy(desc(episodiosTable.publishedAt))
      .limit(7);
    res.json(rows.map(serializeEpisodio));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/obras/:obraId/episodios", async (req, res) => {
  try {
    const obraId = parseInt(req.params.obraId);
    if (isNaN(obraId)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const rows = await db
      .select({
        id: episodiosTable.id,
        obraId: episodiosTable.obraId,
        obraTitulo: obrasTable.titulo,
        obraCapaUrl: obrasTable.capaUrl,
        temporada: episodiosTable.temporada,
        numero: episodiosTable.numero,
        titulo: episodiosTable.titulo,
        thumbnailUrl: episodiosTable.thumbnailUrl,
        playerContent: episodiosTable.playerContent,
        publishedAt: episodiosTable.publishedAt,
      })
      .from(episodiosTable)
      .leftJoin(obrasTable, eq(episodiosTable.obraId, obrasTable.id))
      .where(eq(episodiosTable.obraId, obraId))
      .orderBy(episodiosTable.temporada, episodiosTable.numero);
    res.json(rows.map(serializeEpisodio));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/obras/:obraId/episodios", async (req, res) => {
  try {
    const obraId = parseInt(req.params.obraId);
    if (isNaN(obraId)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const { temporada, numero, titulo, thumbnailUrl, playerContent, publishedAt } = req.body;
    const [ep] = await db.insert(episodiosTable).values({
      obraId,
      temporada: temporada ?? 1,
      numero,
      titulo,
      thumbnailUrl,
      playerContent,
      publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
    }).returning();
    res.status(201).json(serializeEpisodio({ ...ep, obraTitulo: null, obraCapaUrl: null }));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/episodios/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const [row] = await db
      .select({
        id: episodiosTable.id,
        obraId: episodiosTable.obraId,
        obraTitulo: obrasTable.titulo,
        obraCapaUrl: obrasTable.capaUrl,
        temporada: episodiosTable.temporada,
        numero: episodiosTable.numero,
        titulo: episodiosTable.titulo,
        thumbnailUrl: episodiosTable.thumbnailUrl,
        playerContent: episodiosTable.playerContent,
        publishedAt: episodiosTable.publishedAt,
      })
      .from(episodiosTable)
      .leftJoin(obrasTable, eq(episodiosTable.obraId, obrasTable.id))
      .where(eq(episodiosTable.id, id));
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(serializeEpisodio(row));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/episodios/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const updateData: Record<string, unknown> = { ...req.body };
    if (updateData.publishedAt) updateData.publishedAt = new Date(updateData.publishedAt as string);
    const [ep] = await db
      .update(episodiosTable)
      .set(updateData)
      .where(eq(episodiosTable.id, id))
      .returning();
    if (!ep) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(serializeEpisodio({ ...ep, obraTitulo: null, obraCapaUrl: null }));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/episodios/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    await db.delete(episodiosTable).where(eq(episodiosTable.id, id));
    res.status(204).send();
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

function serializeEpisodio(ep: {
  id: number;
  obraId: number;
  obraTitulo: string | null;
  obraSlug?: string | null;
  obraCapaUrl: string | null;
  obraTipografiaUrl?: string | null;
  temporada: number;
  numero: number;
  titulo: string;
  thumbnailUrl: string | null;
  playerContent: string;
  publishedAt: Date;
}) {
  return {
    id: ep.id,
    obraId: ep.obraId,
    obraTitulo: ep.obraTitulo,
    obraSlug: ep.obraSlug ?? null,
    obraCapaUrl: ep.obraCapaUrl,
    obraTipografiaUrl: ep.obraTipografiaUrl ?? null,
    temporada: ep.temporada,
    numero: ep.numero,
    titulo: ep.titulo,
    thumbnailUrl: ep.thumbnailUrl,
    playerContent: ep.playerContent,
    publishedAt: ep.publishedAt.toISOString(),
  };
}

export default router;
