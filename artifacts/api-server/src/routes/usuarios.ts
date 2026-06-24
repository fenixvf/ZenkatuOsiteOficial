import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, profileImagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const ADMIN_EMAIL = "souzawalisonlopes52@gmail.com";

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
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (username !== undefined) updateData.username = username;
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
    const [user] = await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.uid, req.params.uid))
      .returning();
    if (!user) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(serializeUser(user));
  } catch (e: any) {
    req.log.error(e);
    if (e?.code === "23505") {
      res.status(409).json({ error: "Nome de usuário já está em uso." });
      return;
    }
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

router.get("/avatars/:uid", async (req, res) => {
  try {
    const [img] = await db
      .select()
      .from(profileImagesTable)
      .where(eq(profileImagesTable.uid, req.params.uid));
    if (!img) {
      res.status(404).end();
      return;
    }
    const buffer = Buffer.from(img.imageData, "base64");
    res.set("Content-Type", "image/webp");
    res.set("Cache-Control", "public, max-age=86400");
    res.send(buffer);
  } catch (e) {
    req.log.error(e);
    res.status(500).end();
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

    await db
      .insert(profileImagesTable)
      .values({ uid: req.params.uid, imageData: base64Data })
      .onConflictDoUpdate({
        target: profileImagesTable.uid,
        set: { imageData: base64Data, updatedAt: new Date() },
      });

    const photoUrl = `/api/avatars/${req.params.uid}?v=${Date.now()}`;
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
    isZenkatuber: u.isZenkatuber ?? false,
    verifiedAt: u.verifiedAt ? u.verifiedAt.toISOString() : null,
    contactWhatsapp: u.contactWhatsapp ?? null,
    contactInstagram: u.contactInstagram ?? null,
    contactDiscord: u.contactDiscord ?? null,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

export default router;
