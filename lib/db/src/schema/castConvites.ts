import { pgTable, serial, varchar, text, timestamp, integer, unique } from "drizzle-orm/pg-core";

/**
 * Convite de cast: quando o dono de uma obra menciona uma pessoa na equipe,
 * ela recebe uma notificação dentro do perfil dela. Ao aceitar, o personagem
 * que ela fez aparece na aba "Personagens feitos" do perfil.
 *
 * Vive no segundo banco (junto com os demais dados de usuários). Não há FK
 * para `obras` porque a obra fica no primeiro banco.
 */
export const castConvitesTable = pgTable(
  "cast_convites",
  {
    id: serial("id").primaryKey(),
    obraId: integer("obra_id").notNull(),
    obraTitulo: text("obra_titulo").notNull(),
    obraSlug: text("obra_slug").notNull(),
    obraCapa: text("obra_capa"),
    /** uid da pessoa convidada (precisa ter conta na Zenkatu) */
    uid: varchar("uid", { length: 128 }).notNull(),
    /** uid de quem editou a obra (dono do projeto) */
    convidadoPor: varchar("convidado_por", { length: 128 }),
    /** nome de quem foi convidado, como apareceu no cast */
    nome: varchar("nome", { length: 120 }).notNull(),
    /** papel/personagem interpretado na obra */
    personagem: varchar("personagem", { length: 160 }).notNull(),
    fotoUrl: text("foto_url"),
    /** pending | accepted | declined */
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    respondedAt: timestamp("responded_at"),
  },
  (t) => [unique("cast_convites_obra_uid_unique").on(t.obraId, t.uid)],
);

export type CastConvite = typeof castConvitesTable.$inferSelect;
