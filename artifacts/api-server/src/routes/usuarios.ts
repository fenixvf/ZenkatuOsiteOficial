import { Router } from "express";
// Todo o conteúdo desta rota são dados de usuários, então usa o segundo banco
// (Supabase #2). `db2` cai para o primeiro banco quando SUPABASE2_DATABASE_URL
// ainda não estiver configurado.
import { db2 as db } from "@workspace/db";
import { usersTable, profileImagesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

const ADMIN_EMAIL = "souzawalisonlopes52@gmail.com";

function normalizeUsername(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20) || "usuario";
}

async function createUniqueUsername(name: string, email: string, uid: string) {
  const base = normalizeUsername(name || email.split("@")[0]);
  const uidSuffix = uid.toLowerCase().replace(/[^a-z0-9]/g, "");
  const candidates = [base];

  for (let suffixLength = 4; suffixLength <= Math.min(18, uidSuffix.length); suffixLength += 1) {
    const prefix = base.slice(0, 19 - suffixLength) || "u";
    candidates.push(`${prefix}_${uidSuffix.slice(-suffixLength)}`);
  }

  for (const username of candidates) {
    const [owner] = await db
      .select({ uid: usersTable.uid })
      .from(usersTable)
      .where(eq(usersTable.username, username));
    if (!owner || owner.uid === uid) return username;
  }

  throw new Error("Unable to allocate a unique username");
}

// Public directory of linked accounts (safe fields only — no e-mail or private data)
router.get("/usuarios", async (req, res) => {
  try {
    const users = await db
      .select()
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt));
    res.json(users.map(serializePublicUser));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

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
    const { username, photoUrl, bio, voicePortfolio } = req.body;
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (username !== undefined) updateData.username = username;
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl;

    if (bio !== undefined) {
      if (bio !== null && typeof bio !== "string") {
        res.status(400).json({ error: "Bio inválida" });
        return;
      }
      updateData.bio = bio === null ? null : bio.slice(0, 1000);
    }

    if (voicePortfolio !== undefined) {
      if (!Array.isArray(voicePortfolio)) {
        res.status(400).json({ error: "Portfólio de voz inválido" });
        return;
      }
      const invalid = voicePortfolio.find(
        (item: any) =>
          !item ||
          typeof item.titulo !== "string" ||
          typeof item.url !== "string" ||
          !isDriveUrl(item.url),
      );
      if (invalid) {
        res.status(400).json({
          error: "O portfólio aceita apenas URLs do Google Drive.",
        });
        return;
      }
      updateData.voicePortfolio = voicePortfolio.map((item: any) => ({
        titulo: String(item.titulo).trim().slice(0, 80),
        url: String(item.url).trim(),
      }));
    }
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
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!uid || !normalizedEmail) {
      res.status(400).json({ error: "uid and email required" });
      return;
    }
    const role = normalizedEmail === ADMIN_EMAIL ? "admin" : "user";
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.uid, uid));
    if (existing) {
      const [updated] = await db
        .update(usersTable)
        .set({ email: normalizedEmail, role, updatedAt: new Date() })
        .where(eq(usersTable.uid, uid))
        .returning();
      res.json(serializeUser(updated));
      return;
    }
    const username = await createUniqueUsername(
      typeof displayName === "string" ? displayName : "",
      normalizedEmail,
      uid,
    );
    const [user] = await db.insert(usersTable).values({
      uid,
      email: normalizedEmail,
      username,
      photoUrl: photoUrl ?? null,
      role,
    }).returning();
    res.json(serializeUser(user));
  } catch (e: any) {
    req.log.error(e);
    if (e?.code === "23505") {
      res.status(409).json({ error: "E-mail já vinculado a outra conta." });
      return;
    }
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

// Somente links do Google Drive são aceitos no portfólio de voz.
const DRIVE_HOSTS = [
  "drive.google.com",
  "docs.google.com",
  "drive.usercontent.google.com",
  "docs.googleusercontent.com",
];

function isDriveUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      DRIVE_HOSTS.includes(url.hostname)
    );
  } catch {
    return false;
  }
}

function serializePublicUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    uid: u.uid,
    username: u.username,
    photoUrl: u.photoUrl,
    role: u.role,
    isZenkatuber: u.isZenkatuber ?? false,
    verifiedAt: u.verifiedAt ? u.verifiedAt.toISOString() : null,
    bio: u.bio ?? null,
    voicePortfolio: u.voicePortfolio ?? [],
    createdAt: u.createdAt.toISOString(),
  };
}

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
    bio: u.bio ?? null,
    voicePortfolio: u.voicePortfolio ?? [],
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

export default router;
