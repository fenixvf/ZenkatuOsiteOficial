import { Router } from "express";
import { db } from "@workspace/db";
import { generosTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/generos", async (req, res) => {
  try {
    const generos = await db.select().from(generosTable).orderBy(generosTable.nome);
    res.json(generos.map(serialize));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/generos", async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome || typeof nome !== "string" || nome.trim().length === 0) {
      res.status(400).json({ error: "nome is required" });
      return;
    }
    const trimmed = nome.trim();
    const slug = trimmed
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");

    const [genero] = await db
      .insert(generosTable)
      .values({ nome: trimmed, slug })
      .returning();
    res.status(201).json(serialize(genero));
  } catch (e: any) {
    req.log.error(e);
    if (e?.code === "23505") {
      res.status(409).json({ error: "Gênero já existe." });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/generos/:generoId", async (req, res) => {
  try {
    const id = Number(req.params.generoId);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [deleted] = await db.delete(generosTable).where(eq(generosTable.id, id)).returning();
    if (!deleted) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).end();
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

function serialize(g: typeof generosTable.$inferSelect) {
  return { id: g.id, nome: g.nome, slug: g.slug, createdAt: g.createdAt.toISOString() };
}

export default router;
