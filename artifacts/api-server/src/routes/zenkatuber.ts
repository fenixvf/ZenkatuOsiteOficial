import { Router } from "express";
import { db } from "@workspace/db";
import { zenkatuberRequestsTable, usersTable, siteConfigTable, obrasTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function isAdmin(uid: string): Promise<boolean> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.uid, uid));
  return user?.role === "admin";
}

// Chaves de configuração usadas no site_config
const CONFIG_KEYS = {
  minFollowers: "zenkatuber_min_followers",
  minAge: "zenkatuber_min_age",
  requireFandub: "zenkatuber_require_fandub",
  enabled: "zenkatuber_enabled",
};

const CONFIG_DEFAULTS: Record<string, string> = {
  zenkatuber_min_followers: "500",
  zenkatuber_min_age: "16",
  zenkatuber_require_fandub: "true",
  zenkatuber_enabled: "true",
};

async function getConfig(): Promise<Record<string, string>> {
  const rows = await db
    .select()
    .from(siteConfigTable)
    .where(
      eq(siteConfigTable.key, CONFIG_KEYS.minFollowers)
    );

  // Busca todas as chaves relevantes
  const allRows = await db.select().from(siteConfigTable);
  const map: Record<string, string> = { ...CONFIG_DEFAULTS };
  for (const row of allRows) {
    if (Object.values(CONFIG_KEYS).includes(row.key)) {
      map[row.key] = row.value;
    }
  }
  return map;
}

// GET configurações públicas do programa Zenkatuber
router.get("/zenkatuber/config", async (req, res) => {
  try {
    const cfg = await getConfig();
    res.json({
      minFollowers: parseInt(cfg[CONFIG_KEYS.minFollowers] ?? "500"),
      minAge: parseInt(cfg[CONFIG_KEYS.minAge] ?? "16"),
      requireFandub: cfg[CONFIG_KEYS.requireFandub] !== "false",
      enabled: cfg[CONFIG_KEYS.enabled] !== "false",
    });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH configurações (admin only)
router.patch("/zenkatuber/config", async (req, res) => {
  try {
    const { adminUid, minFollowers, minAge, requireFandub, enabled } = req.body;
    const admin = await isAdmin(adminUid);
    if (!admin) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }

    const updates: { key: string; value: string }[] = [];
    if (minFollowers !== undefined) updates.push({ key: CONFIG_KEYS.minFollowers, value: String(minFollowers) });
    if (minAge !== undefined) updates.push({ key: CONFIG_KEYS.minAge, value: String(minAge) });
    if (requireFandub !== undefined) updates.push({ key: CONFIG_KEYS.requireFandub, value: String(requireFandub) });
    if (enabled !== undefined) updates.push({ key: CONFIG_KEYS.enabled, value: String(enabled) });

    for (const { key, value } of updates) {
      const existing = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, key));
      if (existing.length > 0) {
        await db.update(siteConfigTable).set({ value }).where(eq(siteConfigTable.key, key));
      } else {
        await db.insert(siteConfigTable).values({ key, value });
      }
    }

    res.json({ ok: true });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Enviar solicitação de Zenkatuber
router.post("/zenkatuber/solicitar", async (req, res) => {
  try {
    const {
      uid, email, username,
      whatsapp, instagram, discord,
      fandubLink, categoria, equipe,
      redesocial, seguidores,
      aceitouTermos,
    } = req.body;

    if (!uid || !email || !categoria) {
      res.status(400).json({ error: "uid, email e categoria são obrigatórios" });
      return;
    }

    if (!aceitouTermos) {
      res.status(400).json({ error: "É necessário aceitar os termos" });
      return;
    }

    // Busca configurações
    const cfg = await getConfig();
    const minFollowers = parseInt(cfg[CONFIG_KEYS.minFollowers] ?? "500");
    const requireFandub = cfg[CONFIG_KEYS.requireFandub] !== "false";
    const enabled = cfg[CONFIG_KEYS.enabled] !== "false";

    if (!enabled) {
      res.status(403).json({ error: "O programa Zenkatuber está temporariamente fechado para novas solicitações." });
      return;
    }

    if (requireFandub && !fandubLink) {
      res.status(400).json({ error: "É obrigatório informar um link de trabalho anterior" });
      return;
    }

    if (minFollowers > 0 && (!seguidores || seguidores < minFollowers)) {
      res.status(400).json({
        error: `É necessário ter pelo menos ${minFollowers.toLocaleString("pt-BR")} seguidores em alguma rede social`,
      });
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
        fandubLink: fandubLink || "",
        categoria,
        equipe: equipe || null,
        redesocial: redesocial || null,
        seguidores: seguidores ? parseInt(seguidores) : null,
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
      requestStatus: request?.status ?? null,
      requestStage: request?.stage ?? null,
    });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Aprovar etapa 1 — move candidatura para etapa 2 (divulgação)
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

    // Move para etapa 2 (aguardando divulgação do candidato)
    await db
      .update(zenkatuberRequestsTable)
      .set({ status: "stage1_approved", stage: 2 })
      .where(eq(zenkatuberRequestsTable.id, id));

    res.json({ ok: true, message: `${request.username} passou para a Etapa 2!` });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Usuário envia link de divulgação (etapa 2)
router.post("/zenkatuber/stage2-submit", async (req, res) => {
  try {
    const { uid, postUrl } = req.body;
    if (!uid || !postUrl) {
      res.status(400).json({ error: "uid e postUrl são obrigatórios" });
      return;
    }

    const [request] = await db
      .select()
      .from(zenkatuberRequestsTable)
      .where(eq(zenkatuberRequestsTable.uid, uid));

    if (!request || request.status !== "stage1_approved") {
      res.status(400).json({ error: "Nenhuma candidatura aprovada na etapa 1 encontrada" });
      return;
    }

    await db
      .update(zenkatuberRequestsTable)
      .set({ postUrl, status: "stage2_pending" })
      .where(eq(zenkatuberRequestsTable.id, request.id));

    res.json({ ok: true });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Aprovar etapa 2 — candidato vira Zenkatuber (admin)
router.post("/zenkatuber/stage2-approve/:id", async (req, res) => {
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

    await db
      .delete(zenkatuberRequestsTable)
      .where(eq(zenkatuberRequestsTable.id, id));

    res.json({ ok: true, message: `${request.username} agora é Zenkatuber!` });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Rejeitar solicitação (admin) — funciona em qualquer etapa
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

// Conceder Zenkatuber manualmente (admin) — para parceiros antigos
router.post("/zenkatuber/grant", async (req, res) => {
  try {
    const { adminUid, email, whatsapp, instagram, discord } = req.body;
    const admin = await isAdmin(adminUid);
    if (!admin) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }

    if (!email) {
      res.status(400).json({ error: "E-mail é obrigatório" });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.trim().toLowerCase()));

    if (!user) {
      res.status(404).json({ error: "Usuário não encontrado. O usuário precisa ter feito login ao menos uma vez." });
      return;
    }

    await db
      .update(usersTable)
      .set({
        isZenkatuber: true,
        verifiedAt: new Date(),
        contactWhatsapp: whatsapp || user.contactWhatsapp,
        contactInstagram: instagram || user.contactInstagram,
        contactDiscord: discord || user.contactDiscord,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.uid, user.uid));

    res.json({ ok: true, message: `${user.username || user.email} agora é Zenkatuber!`, username: user.username || user.email });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Listar todos os Zenkatubers ativos (admin)
router.get("/zenkatuber/list/:adminUid", async (req, res) => {
  try {
    const admin = await isAdmin(req.params.adminUid);
    if (!admin) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }

    const zenkatubers = await db
      .select({
        uid: usersTable.uid,
        email: usersTable.email,
        username: usersTable.username,
        photoUrl: usersTable.photoUrl,
        contactWhatsapp: usersTable.contactWhatsapp,
        contactInstagram: usersTable.contactInstagram,
        contactDiscord: usersTable.contactDiscord,
        verifiedAt: usersTable.verifiedAt,
        updatedAt: usersTable.updatedAt,
      })
      .from(usersTable)
      .where(eq(usersTable.isZenkatuber, true))
      .orderBy(usersTable.verifiedAt);

    res.json(zenkatubers);
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Editar dados de contato de um Zenkatuber (admin)
router.patch("/zenkatuber/edit/:uid", async (req, res) => {
  try {
    const { adminUid, whatsapp, instagram, discord } = req.body;
    const admin = await isAdmin(adminUid);
    if (!admin) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }

    await db
      .update(usersTable)
      .set({
        contactWhatsapp: whatsapp ?? null,
        contactInstagram: instagram ?? null,
        contactDiscord: discord ?? null,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.uid, req.params.uid));

    res.json({ ok: true });
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

// Vincular obra a um Zenkatuber (admin)
router.post("/zenkatuber/link-obra", async (req, res) => {
  try {
    const { adminUid, zenkatuberUid, obraId } = req.body;
    const admin = await isAdmin(adminUid);
    if (!admin) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }
    await db.update(obrasTable).set({ ownerId: zenkatuberUid }).where(eq(obrasTable.id, obraId));
    res.json({ ok: true });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Desvincular obra de um Zenkatuber (admin)
router.post("/zenkatuber/unlink-obra", async (req, res) => {
  try {
    const { adminUid, obraId } = req.body;
    const admin = await isAdmin(adminUid);
    if (!admin) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }
    await db.update(obrasTable).set({ ownerId: null }).where(eq(obrasTable.id, obraId));
    res.json({ ok: true });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
