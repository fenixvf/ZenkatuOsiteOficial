import { Router } from "express";
import { db } from "@workspace/db";
import { obrasTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

router.get("/obras", async (req, res) => {
  try {
    const obras = await db.select().from(obrasTable).orderBy(desc(obrasTable.updatedAt));
    res.json(obras.map(serializeObra));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/obras/banner", async (req, res) => {
  try {
    const obras = await db
      .select()
      .from(obrasTable)
      .where(eq(obrasTable.showInBanner, true))
      .orderBy(obrasTable.bannerOrder);
    res.json(obras.map(serializeObra));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/obras/top10", async (req, res) => {
  try {
    const obras = await db
      .select()
      .from(obrasTable)
      .orderBy(desc(obrasTable.views))
      .limit(10);
    res.json(obras.map(serializeObra));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/obras/recentes", async (req, res) => {
  try {
    const obras = await db
      .select()
      .from(obrasTable)
      .orderBy(desc(obrasTable.createdAt))
      .limit(12);
    res.json(obras.map(serializeObra));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/obras/busca/:term", async (req, res) => {
  try {
    const term = req.params.term;
    const obras = await db
      .select()
      .from(obrasTable)
      .where(sql`lower(${obrasTable.titulo}) like ${"%" + term.toLowerCase() + "%"}`)
      .orderBy(desc(obrasTable.views))
      .limit(10);
    res.json(obras.map(serializeObra));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/obras/slug/:slug", async (req, res) => {
  try {
    const [obra] = await db
      .select()
      .from(obrasTable)
      .where(eq(obrasTable.slug, req.params.slug));
    if (!obra) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(serializeObra(obra));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/obras/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const [obra] = await db.select().from(obrasTable).where(eq(obrasTable.id, id));
    if (!obra) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(serializeObra(obra));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/obras", async (req, res) => {
  try {
    const {
      titulo, slug, sinopse, generos, status, ano, nota, totalEps,
      capaUrl, bannerUrl, tipografiaUrl, showInBanner, bannerOrder,
    } = req.body;
    const [obra] = await db.insert(obrasTable).values({
      titulo, slug, sinopse,
      generos: generos ?? [],
      status: status ?? "Em Exibição",
      ano, nota, totalEps, capaUrl, bannerUrl, tipografiaUrl,
      showInBanner: showInBanner ?? false,
      bannerOrder,
    }).returning();
    res.status(201).json(serializeObra(obra));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/obras/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const [obra] = await db
      .update(obrasTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(obrasTable.id, id))
      .returning();
    if (!obra) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(serializeObra(obra));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/obras/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    await db.delete(obrasTable).where(eq(obrasTable.id, id));
    res.status(204).send();
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/obras/:id/view", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const [obra] = await db
      .update(obrasTable)
      .set({ views: sql`${obrasTable.views} + 1` })
      .where(eq(obrasTable.id, id))
      .returning();
    if (!obra) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(serializeObra(obra));
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
