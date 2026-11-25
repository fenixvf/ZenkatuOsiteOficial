import { useMemo, useState } from "react";
import { useListUsuarios } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Users, Search, CalendarDays, SearchX, ArrowUpRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { VerifiedBadge } from "@/components/verified-badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function roleBadge(isZenkatuber: boolean, role: string) {
  if (isZenkatuber) {
    return { label: "Zenkatuber", className: "bg-blue-500/15 text-blue-300 border-blue-500/30" };
  }
  if (role === "admin") {
    return { label: "Admin", className: "bg-amber-500/15 text-amber-300 border-amber-500/30" };
  }
  return { label: "Membro", className: "bg-secondary/70 text-muted-foreground border-border" };
}

function AccountAvatar({
  photoUrl,
  username,
  size = "h-16 w-16",
  text = "text-2xl",
}: {
  photoUrl?: string | null;
  username?: string | null;
  size?: string;
  text?: string;
}) {
  const [broken, setBroken] = useState(false);
  const showImage = !!photoUrl && !broken;

  return (
    <div
      className={`${size} shrink-0 rounded-full overflow-hidden border-2 border-border bg-secondary flex items-center justify-center`}
    >
      {showImage ? (
        <img
          src={photoUrl as string}
          alt={username || "Avatar"}
          className="w-full h-full object-cover"
          onError={() => setBroken(true)}
          loading="lazy"
        />
      ) : (
        <span className={`${text} font-bold text-muted-foreground`}>
          {username?.[0]?.toUpperCase() || "Z"}
        </span>
      )}
    </div>
  );
}

export default function Descobrir() {
  const { data: usuariosRaw, isLoading, isError, refetch } = useListUsuarios();
  const [query, setQuery] = useState("");

  const usuarios = useMemo(
    () => (Array.isArray(usuariosRaw) ? usuariosRaw : []),
    [usuariosRaw],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return usuarios;
    return usuarios.filter((u) => (u.username || "").toLowerCase().includes(term));
  }, [usuarios, query]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container max-w-screen-xl mx-auto px-4 py-8 sm:py-12"
    >
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-border bg-card/70 px-5 py-7 sm:px-8 sm:py-9">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5 text-primary">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Comunidade Zenkatu</p>
              <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">Descobrir pessoas</h1>
            </div>
          </div>
          <p className="max-w-2xl pl-0 text-sm leading-relaxed text-muted-foreground sm:pl-[3.75rem]">
            Encontre vozes, criadores e colaboradores. Abra um perfil para conhecer o portfólio e os projetos confirmados de cada pessoa.
          </p>
        </div>
      </div>

      <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          aria-label="Buscar pessoas pelo nome de usuário"
          data-testid="input-search-people"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar conta pelo nome de usuário..."
          className="h-11 rounded-xl border-border bg-secondary/60 pl-10 focus-visible:ring-primary/50"
        />
      </div>
      <p className="text-xs text-muted-foreground">Acesse um perfil público para ver mais</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div role="alert" className="rounded-2xl border border-destructive/25 bg-card px-6 py-14 text-center">
          <Users className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
          <p className="font-semibold text-foreground">Não foi possível carregar as pessoas.</p>
          <p className="mt-1 text-sm text-muted-foreground">Tente novamente em alguns instantes.</p>
          <button type="button" data-testid="button-retry-discover" onClick={() => refetch()} className="mt-5 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Tentar novamente
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-border rounded-xl text-muted-foreground">
          <SearchX className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma conta encontrada.</p>
          <p className="text-sm mt-1">
            {query ? "Tente outro nome de usuário." : "Ainda não há contas vinculadas."}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground mb-4 uppercase tracking-wider">
            {filtered.length} {filtered.length === 1 ? "conta" : "contas"}
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((usuario, index) => {
              const badge = roleBadge(usuario.isZenkatuber, usuario.role);

              return (
                <motion.div
                  key={usuario.uid}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.04, 0.4) }}
                >
                  <Link
                    href={`/perfil/${usuario.uid}`}
                    aria-label={`Abrir perfil público de ${usuario.username || "membro"}`}
                    data-testid={`link-profile-${usuario.uid}`}
                    className="group relative flex h-full min-h-36 items-center gap-4 rounded-xl border border-border bg-card/80 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/45 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-48 sm:flex-col sm:justify-center sm:gap-3 sm:p-5 sm:text-center"
                  >
                      <div className="relative">
                        <AccountAvatar
                          photoUrl={usuario.photoUrl}
                          username={usuario.username}
                          size="h-20 w-20"
                          text="text-3xl"
                        />
                        <div className="absolute -bottom-1 -right-1 rounded-full bg-background p-0.5" aria-hidden="true">
                          <span
                            className={`block h-3 w-3 rounded-full border-2 border-background ${
                              usuario.isZenkatuber ? "bg-blue-400" : "bg-emerald-400"
                            }`}
                            title={usuario.isZenkatuber ? "Zenkatuber" : "Conta ativa"}
                          />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1 space-y-1.5 sm:flex-none sm:w-full">
                        <div className="flex items-center justify-center gap-1.5 min-w-0">
                          <p className="min-w-0 font-semibold text-sm truncate text-foreground group-hover:text-primary transition-colors">
                            {usuario.username || "Sem nome"}
                          </p>
                          {usuario.isZenkatuber && (
                            <VerifiedBadge verifiedAt={usuario.verifiedAt} size="sm" />
                          )}
                        </div>

                        <span
                          className={`inline-block text-[10px] px-2 py-0.5 rounded-full border ${badge.className}`}
                        >
                          {badge.label}
                        </span>

                        <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground/70">
                          <CalendarDays className="w-3 h-3" />
                          {usuario.createdAt
                            ? format(new Date(usuario.createdAt), "MM/yyyy", { locale: ptBR })
                            : "Membro Zenkatu"}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1.5 self-center text-xs font-semibold text-primary sm:mt-1">
                        Ver perfil <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </motion.div>
  );
}
