import { useMemo, useState } from "react";
import { useListUsuarios } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Users, Search, CalendarDays, SearchX } from "lucide-react";
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
  const { data: usuariosRaw, isLoading } = useListUsuarios();
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
      className="container max-w-screen-xl mx-auto px-4 py-10"
    >
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/15 text-primary">
            <Users className="w-6 h-6" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">Descobrir</h1>
        </div>
        <p className="text-muted-foreground ml-14">
          Contas vinculadas na Zenkatu. Clique em uma conta para ver o perfil dela.
        </p>
      </div>

      <div className="relative max-w-md mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar conta pelo nome de usuário..."
          className="pl-9 bg-secondary/60 border-border focus-visible:ring-primary/50 h-10 rounded-xl"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
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

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((usuario, index) => {
              const badge = roleBadge(usuario.isZenkatuber, usuario.role);

              return (
                <motion.div
                  key={usuario.uid}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.04, 0.4) }}
                >
                  <Link href={`/perfil/${usuario.uid}`}>
                    <div className="group h-full flex flex-col items-center text-center gap-3 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:bg-card/80 hover:shadow-[0_0_20px_rgba(59,130,246,0.12)] cursor-pointer">
                      <div className="relative">
                        <AccountAvatar
                          photoUrl={usuario.photoUrl}
                          username={usuario.username}
                          size="h-20 w-20"
                          text="text-3xl"
                        />
                        <div className="absolute -bottom-1 -right-1 rounded-full bg-background p-0.5">
                          <span
                            className={`block h-3 w-3 rounded-full border-2 border-background ${
                              usuario.isZenkatuber ? "bg-blue-400" : "bg-emerald-400"
                            }`}
                            title={usuario.isZenkatuber ? "Zenkatuber" : "Conta ativa"}
                          />
                        </div>
                      </div>

                      <div className="min-w-0 w-full space-y-1.5">
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
                          {format(new Date(usuario.createdAt), "MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
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
