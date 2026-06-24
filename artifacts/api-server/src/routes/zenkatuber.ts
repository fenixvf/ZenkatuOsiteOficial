import { Router } from "express";
import { db } from "@workspace/db";
import { zenkatuberRequestsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const ADMIN_EMAIL = "souzawalisonlopes52@gmail.com";

async function isAdmin(uid: string): Promise<boolean> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.uid, uid));
  return user?.role === "admin";
}

// Enviar solicitação de Zenkatuber
router.post("/zenkatuber/solicitar", async (req, res) => {
  try {
    const { uid, email, username, whatsapp, instagram, discord, fandubLink, categoria, equipe, aceitouTermos } = req.body;

    if (!uid || !email || !fandubLink || !categoria) {
      res.status(400).json({ error: "uid, email, fandubLink e categoria são obrigatórios" });
      return;
    }

    if (!aceitouTermos) {
      res.status(400).json({ error: "É necessário aceitar os termos" });
      return;
    }

    // Verifica se já existe solicitação pendente
    const [existing] = await db
      .select()
      .from(zenkatuberRequestsTable)
      .where(eq(zenkatuberRequestsTable.uid, uid));

    if (existing) {
      res.status(409).json({ error: "Você já tem uma solicitação em andamento" });
      return;
    }

    // Verifica se já é Zenkatuber
    const [user] = await db.select().from(usersTable).where(eq(usersTable.uid, uid));
    if (user?.isZenkatuber) {
      res.status(409).json({ error: "Você já é um Zenkatuber" });
      return;
    }

    const [request] = await db
      .insert(zenkatuberRequestsTable)
      .values({
        uid,
        email,
        username: username || email,
        whatsapp: whatsapp || null,
        instagram: instagram || null,
        discord: discord || null,
        fandubLink,
        categoria,
        equipe: equipe || null,
        aceitouTermos: true,
        status: "pending",
      })
      .returning();

    res.status(201).json(request);
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Listar solicitações (admin)
router.get("/zenkatuber/requests/:adminUid", async (req, res) => {
  try {
    const admin = await isAdmin(req.params.adminUid);
    if (!admin) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }

    const requests = await db
      .select()
      .from(zenkatuberRequestsTable)
      .orderBy(zenkatuberRequestsTable.createdAt);

    res.json(requests.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Verificar se uid tem solicitação pendente
router.get("/zenkatuber/status/:uid", async (req, res) => {
  try {
    const [request] = await db
      .select()
      .from(zenkatuberRequestsTable)
      .where(eq(zenkatuberRequestsTable.uid, req.params.uid));

    const [user] = await db
      .select({ isZenkatuber: usersTable.isZenkatuber, verifiedAt: usersTable.verifiedAt })
      .from(usersTable)
      .where(eq(usersTable.uid, req.params.uid));

    res.json({
      hasPendingRequest: !!request,
      isZenkatuber: user?.isZenkatuber ?? false,
      verifiedAt: user?.verifiedAt ? user.verifiedAt.toISOString() : null,
    });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Aprovar solicitação (admin)
router.post("/zenkatuber/approve/:id", async (req, res) => {
  try {
    const { adminUid } = req.body;
    const admin = await isAdmin(adminUid);
    if (!admin) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }

    const id = parseInt(req.params.id);
    const [request] = await db
      .select()
      .from(zenkatuberRequestsTable)
      .where(eq(zenkatuberRequestsTable.id, id));

    if (!request) {
      res.status(404).json({ error: "Solicitação não encontrada" });
      return;
    }

    // Atualiza o usuário
    await db
      .update(usersTable)
      .set({
        isZenkatuber: true,
        verifiedAt: new Date(),
        contactWhatsapp: request.whatsapp,
        contactInstagram: request.instagram,
        contactDiscord: request.discord,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.uid, request.uid));

    // Deleta a solicitação
    await db
      .delete(zenkatuberRequestsTable)
      .where(eq(zenkatuberRequestsTable.id, id));

    res.json({ ok: true, message: `${request.username} agora é Zenkatuber!` });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Rejeitar solicitação (admin)
router.post("/zenkatuber/reject/:id", async (req, res) => {
  try {
    const { adminUid } = req.body;
    const admin = await isAdmin(adminUid);
    if (!admin) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }

    const id = parseInt(req.params.id);
    const [request] = await db
      .select()
      .from(zenkatuberRequestsTable)
      .where(eq(zenkatuberRequestsTable.id, id));

    if (!request) {
      res.status(404).json({ error: "Solicitação não encontrada" });
      return;
    }

    await db
      .delete(zenkatuberRequestsTable)
      .where(eq(zenkatuberRequestsTable.id, id));

    res.json({ ok: true, message: `Solicitação de ${request.username} rejeitada.` });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Revogar Zenkatuber (admin)
router.post("/zenkatuber/revoke/:uid", async (req, res) => {
  try {
    const { adminUid } = req.body;
    const admin = await isAdmin(adminUid);
    if (!admin) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }

    await db
      .update(usersTable)
      .set({
        isZenkatuber: false,
        verifiedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.uid, req.params.uid));

    res.json({ ok: true });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
