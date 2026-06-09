import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

const router = Router();

const ADMIN_EMAIL = "souzawalisonlopes52@gmail.com";
const AVATARS_DIR = path.join(process.cwd(), "dist", "avatars");

router.get("/usuarios/:uid", async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.uid, req.params.uid));
    if (!user) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(serializeUser(user));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/usuarios/:uid", async (req, res) => {
  try {
    const { username, photoUrl } = req.body;
    const [user] = await db
      .update(usersTable)
      .set({ username, photoUrl, updatedAt: new Date() })
      .where(eq(usersTable.uid, req.params.uid))
      .returning();
    if (!user) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(serializeUser(user));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/usuarios", async (req, res) => {
  try {
    const { uid, email, displayName, photoUrl } = req.body;
    if (!uid || !email) {
      res.status(400).json({ error: "uid and email required" });
      return;
    }
    const role = email === ADMIN_EMAIL ? "admin" : "user";
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.uid, uid));
    if (existing) {
      const [updated] = await db
        .update(usersTable)
        .set({ role, updatedAt: new Date() })
        .where(eq(usersTable.uid, uid))
        .returning();
      res.json(serializeUser(updated));
      return;
    }
    const baseUsername = ((displayName ?? email.split("@")[0]) as string)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .slice(0, 20);
    const [user] = await db.insert(usersTable).values({
      uid, email,
      username: baseUsername,
      photoUrl: photoUrl ?? null,
      role,
    }).returning();
    res.json(serializeUser(user));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/usuarios/:uid/avatar", async (req, res) => {
  try {
    const { imageData } = req.body;
    if (!imageData) {
      res.status(400).json({ error: "imageData required" });
      return;
    }
    const base64Data = (imageData as string).replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    if (!fs.existsSync(AVATARS_DIR)) {
      fs.mkdirSync(AVATARS_DIR, { recursive: true });
    }
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.uid, req.params.uid));
    if (existing?.photoUrl) {
      const oldFilename = existing.photoUrl.replace("/api/avatars/", "");
      const oldFile = path.join(AVATARS_DIR, oldFilename);
      if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
    }
    const filename = `${req.params.uid}-${Date.now()}.webp`;
    fs.writeFileSync(path.join(AVATARS_DIR, filename), buffer);
    const photoUrl = `/api/avatars/${filename}`;
    const [user] = await db
      .update(usersTable)
      .set({ photoUrl, updatedAt: new Date() })
      .where(eq(usersTable.uid, req.params.uid))
      .returning();
    if (!user) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(serializeUser(user));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

function serializeUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    uid: u.uid,
    email: u.email,
    username: u.username,
    photoUrl: u.photoUrl,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

export default router;
