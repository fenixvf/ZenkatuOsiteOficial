import { Router } from "express";
import { db2 } from "@workspace/db";
import { castConvitesTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const router = Router();

function serialize(convite: typeof castConvitesTable.$inferSelect) {
  return {
    id: convite.id,
    obraId: convite.obraId,
    obraTitulo: convite.obraTitulo,
    obraSlug: convite.obraSlug,
    obraCapa: convite.obraCapa ?? null,
    uid: convite.uid,
    convidadoPor: convite.convidadoPor ?? null,
    nome: convite.nome,
    personagem: convite.personagem,
    fotoUrl: convite.fotoUrl ?? null,
    status: convite.status,
    createdAt: convite.createdAt.toISOString(),
    respondedAt: convite.respondedAt ? convite.respondedAt.toISOString() : null,
  };
}

// Convites de cast recebidos por uma pessoa (notificações no perfil).
router.get("/convites-cast/:uid", async (req, res) => {
  try {
    const convites = await db2
      .select()
      .from(castConvitesTable)
      .where(eq(castConvitesTable.uid, req.params.uid))
      .orderBy(desc(castConvitesTable.createdAt));
    res.json(convites.map(serialize));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Personagens já confirmados (aba "Personagens feitos" do perfil público).
router.get("/personagens-feitos/:uid", async (req, res) => {
  try {
    const convites = await db2
      .select()
      .from(castConvitesTable)
      .where(eq(castConvitesTable.uid, req.params.uid))
      .orderBy(desc(castConvitesTable.createdAt));
    res.json(convites.filter((c) => c.status === "accepted").map(serialize));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

async function responder(
  req: any,
  res: any,
  status: "accepted" | "declined",
) {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const { uid } = req.body ?? {};
  if (!uid) {
    res.status(400).json({ error: "uid é obrigatório" });
    return;
  }

  const [convite] = await db2
    .select()
    .from(castConvitesTable)
    .where(eq(castConvitesTable.id, id));

  if (!convite) {
    res.status(404).json({ error: "Convite não encontrado" });
    return;
  }
  // Só a pessoa convidada pode responder ao próprio convite.
  if (convite.uid !== uid) {
    res.status(403).json({ error: "Este convite não é seu" });
    return;
  }

  const [atualizado] = await db2
    .update(castConvitesTable)
    .set({ status, respondedAt: new Date() })
    .where(eq(castConvitesTable.id, id))
    .returning();

  res.json(serialize(atualizado));
}

// A convite de cast → o personagem entra no perfil da pessoa.
router.post("/convites-cast/:id/aceitar", async (req, res) => {
  try {
    await responder(req, res, "accepted");
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/convites-cast/:id/recusar", async (req, res) => {
  try {
    await responder(req, res, "declined");
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
