import { Router } from "express";
import { db } from "@workspace/db";
import { comentariosTable, usersTable } from "@workspace/db";
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
      .select({
        id: comentariosTable.id,
        obraId: comentariosTable.obraId,
        userId: comentariosTable.userId,
        username: comentariosTable.username,
        userPhoto: comentariosTable.userPhoto,
        texto: comentariosTable.texto,
        parentId: comentariosTable.parentId,
        editado: comentariosTable.editado,
        createdAt: comentariosTable.createdAt,
        updatedAt: comentariosTable.updatedAt,
        isZenkatuber: usersTable.isZenkatuber,
        verifiedAt: usersTable.verifiedAt,
      })
      .from(comentariosTable)
      .leftJoin(usersTable, eq(comentariosTable.userId, usersTable.uid))
      .where(eq(comentariosTable.obraId, obraId))
      .orderBy(desc(comentariosTable.createdAt));
    res.json(rows.map(r => ({
      id: r.id,
      obraId: r.obraId,
      userId: r.userId,
      username: r.username,
      userPhoto: r.userPhoto,
      texto: r.texto,
      parentId: r.parentId,
      editado: r.editado,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      isZenkatuber: r.isZenkatuber ?? false,
      verifiedAt: r.verifiedAt ? r.verifiedAt.toISOString() : null,
    })));
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
    const [user] = await db
      .select({ isZenkatuber: usersTable.isZenkatuber, verifiedAt: usersTable.verifiedAt })
      .from(usersTable)
      .where(eq(usersTable.uid, userId));
    res.status(201).json({
      id: comentario.id,
      obraId: comentario.obraId,
      userId: comentario.userId,
      username: comentario.username,
      userPhoto: comentario.userPhoto,
      texto: comentario.texto,
      parentId: comentario.parentId,
      editado: comentario.editado,
      createdAt: comentario.createdAt.toISOString(),
      updatedAt: comentario.updatedAt.toISOString(),
      isZenkatuber: user?.isZenkatuber ?? false,
      verifiedAt: user?.verifiedAt ? user.verifiedAt.toISOString() : null,
    });
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
    const [user] = await db
      .select({ isZenkatuber: usersTable.isZenkatuber, verifiedAt: usersTable.verifiedAt })
      .from(usersTable)
      .where(eq(usersTable.uid, comentario.userId));
    res.json({
      id: comentario.id,
      obraId: comentario.obraId,
      userId: comentario.userId,
      username: comentario.username,
      userPhoto: comentario.userPhoto,
      texto: comentario.texto,
      parentId: comentario.parentId,
      editado: comentario.editado,
      createdAt: comentario.createdAt.toISOString(),
      updatedAt: comentario.updatedAt.toISOString(),
      isZenkatuber: user?.isZenkatuber ?? false,
      verifiedAt: user?.verifiedAt ? user.verifiedAt.toISOString() : null,
    });
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

export default router;
