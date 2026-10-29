import { db2 } from "@workspace/db";
import { castConvitesTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

type CastMemberLike = {
  uid?: string;
  nome?: string;
  papel?: string;
  fotoUrl?: string;
};

export type CastConvitePayload = {
  obraId: number;
  obraTitulo: string;
  obraSlug: string;
  obraCapa?: string | null;
  convidadoPor?: string | null;
  /** null = a obra não foi salva com cast agora (não mexe nos convites) */
  cast?: CastMemberLike[] | null;
};

/**
 * Mantém os convites de cast em dia com o time da obra.
 *
 * Toda vez que o dono salva o cast, cada pessoa com conta na Zenkatu ganha uma
 * notificação dentro do perfil dela (status `pending`). Quando ela aceita, o
 * personagem aparece na aba "Personagens feitos" do perfil dela.
 *
 * Roda no segundo banco (Supabase #2), junto com os dados de usuários.
 */
export async function syncCastConvites({
  obraId,
  obraTitulo,
  obraSlug,
  obraCapa,
  convidadoPor,
  cast,
}: CastConvitePayload): Promise<void> {
  if (!Array.isArray(cast)) return;

  const members = cast.filter((m): m is CastMemberLike & { uid: string } => !!m?.uid);
  const uids = members.map((m) => m.uid);

  const existing = await db2
    .select()
    .from(castConvitesTable)
    .where(eq(castConvitesTable.obraId, obraId));
  const byUid = new Map(existing.map((row) => [row.uid, row]));

  for (const member of members) {
    const dados = {
      obraTitulo,
      obraSlug,
      obraCapa: obraCapa ?? null,
      convidadoPor: convidadoPor ?? null,
      nome: (member.nome ?? "").trim().slice(0, 120) || "Sem nome",
      personagem: (member.papel ?? "").trim().slice(0, 160) || "Personagem",
      fotoUrl: member.fotoUrl?.trim() || null,
    };

    const atual = byUid.get(member.uid);
    if (atual) {
      // Atualiza os dados do personagem, mas preserva o status (se ela já
      // aceitou ou recusou, não volta a ficar pendente).
      await db2
        .update(castConvitesTable)
        .set(dados)
        .where(eq(castConvitesTable.id, atual.id));
    } else {
      await db2.insert(castConvitesTable).values({
        obraId,
        uid: member.uid,
        ...dados,
        status: "pending",
      });
    }
  }

  const removidos = existing.filter((row) => !uids.includes(row.uid));
  if (removidos.length > 0) {
    await db2
      .delete(castConvitesTable)
      .where(inArray(castConvitesTable.id, removidos.map((r) => r.id)));
  }
}

/** Apaga os convites de uma obra quando ela é excluída. */
export async function deleteCastConvitesDaObra(obraId: number): Promise<void> {
  await db2.delete(castConvitesTable).where(eq(castConvitesTable.obraId, obraId));
}
