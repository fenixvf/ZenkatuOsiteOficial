import { Router } from "express";
import { db } from "@workspace/db";
import { obrasTable, episodiosTable, usersTable, comentariosTable } from "@workspace/db";
import { count, gte } from "drizzle-orm";
import { sql } from "drizzle-orm";

const router = Router();

// GET /stats/admin
router.get("/stats/admin", async (req, res) => {
  try {
    const [[obraCount], [epCount], [userCount], [commentCount]] = await Promise.all([
      db.select({ count: count() }).from(obrasTable),
      db.select({ count: count() }).from(episodiosTable),
      db.select({ count: count() }).from(usersTable),
      db.select({ count: count() }).from(comentariosTable).where(
        gte(comentariosTable.createdAt, sql`NOW() - INTERVAL '1 day'`)
      ),
    ]);

    res.json({
      totalObras: obraCount?.count ?? 0,
      totalEpisodios: epCount?.count ?? 0,
      totalUsuarios: userCount?.count ?? 0,
      comentariosHoje: commentCount?.count ?? 0,
    });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
