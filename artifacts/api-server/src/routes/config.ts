import { Router } from "express";
import { db } from "@workspace/db";
import { siteConfigTable } from "@workspace/db";

const router = Router();

async function getConfigMap(): Promise<Record<string, string>> {
  const rows = await db.select().from(siteConfigTable);
  const config: Record<string, string> = {};
  for (const row of rows) {
    config[row.key] = row.value;
  }
  return config;
}

router.get("/config", async (req, res) => {
  try {
    res.json(await getConfigMap());
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/config", async (req, res) => {
  try {
    const updates = req.body as Record<string, string>;
    for (const [key, value] of Object.entries(updates)) {
      await db
        .insert(siteConfigTable)
        .values({ key, value })
        .onConflictDoUpdate({ target: siteConfigTable.key, set: { value } });
    }
    res.json(await getConfigMap());
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
