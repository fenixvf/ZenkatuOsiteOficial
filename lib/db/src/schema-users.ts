// Barrel usado pelo drizzle-kit para criar somente as tabelas de usuários no
// segundo banco (SUPABASE2_DATABASE_URL). O conteúdo (obras, episódios,
// comentários, listas, histórico...) continua no primeiro banco.
export * from "./schema/users";
export * from "./schema/profileImages";
export * from "./schema/pushSubscriptions";
export * from "./schema/onesignalSubscriptions";
export * from "./schema/zenkatuberRequests";
export * from "./schema/castConvites";
