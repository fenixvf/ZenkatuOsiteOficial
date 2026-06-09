import { Router } from "express";
import { db } from "@workspace/db";
import { comentariosTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/obras/:obraId/comentarios", async (req, res) => {
  try {
    const obraId = parseInt(req.params.obraId);
    if (isNaN(obraId)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const rows = await db
      .select()
      .from(comentariosTable)
      .where(eq(comentariosTable.obraId, obraId))
      .orderBy(desc(comentariosTable.createdAt));
    res.json(rows.map(serializeComentario));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/obras/:obraId/comentarios", async (req, res) => {
  try {
    const obraId = parseInt(req.params.obraId);
    if (isNaN(obraId)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const { userId, username, userPhoto, texto, parentId } = req.body;
    if (!userId || !username || !texto) {
      res.status(400).json({ error: "userId, username and texto are required" });
      return;
    }
    const [comentario] = await db.insert(comentariosTable).values({
      obraId, userId, username, userPhoto,
      texto, parentId: parentId ?? null,
    }).returning();
    res.status(201).json(serializeComentario(comentario));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/comentarios/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const { texto } = req.body;
    if (!texto) {
      res.status(400).json({ error: "texto is required" });
      return;
    }
    const [comentario] = await db
      .update(comentariosTable)
      .set({ texto, editado: true, updatedAt: new Date() })
      .where(eq(comentariosTable.id, id))
      .returning();
    if (!comentario) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(serializeComentario(comentario));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/comentarios/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    await db.delete(comentariosTable).where(eq(comentariosTable.id, id));
    res.status(204).send();
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

function serializeComentario(c: typeof comentariosTable.$inferSelect) {
  return {
    id: c.id,
    obraId: c.obraId,
    userId: c.userId,
    username: c.username,
    userPhoto: c.userPhoto,
    texto: c.texto,
    parentId: c.parentId,
    editado: c.editado,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export default router;
