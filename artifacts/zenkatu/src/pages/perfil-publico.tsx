import { useMemo, useState } from "react";
import { useListUsuarios, useListPersonagensFeitos } from "@workspace/api-client-react";
import { Link, useRoute } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Users,
  CalendarDays,
  BadgeCheck,
  Loader2,
  UserX,
  Pencil,
  Mic,
  ExternalLink,
  Film,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VerifiedBadge } from "@/components/verified-badge";
import { useAuth } from "@/lib/auth-context";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function PublicAvatar({
  photoUrl,
  username,
}: {
  photoUrl?: string | null;
  username?: string | null;
}) {
  const [broken, setBroken] = useState(false);
  const showImage = !!photoUrl && !broken;

  return (
    <div className="h-28 w-28 shrink-0 rounded-full overflow-hidden border-4 border-background bg-secondary shadow-2xl flex items-center justify-center">
      {showImage ? (
        <img
          src={photoUrl as string}
          alt={username || "Avatar"}
          className="w-full h-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="text-4xl font-bold text-muted-foreground">
          {username?.[0]?.toUpperCase() || "Z"}
        </span>
      )}
    </div>
  );
}

export default function PerfilPublico() {
  const [, params] = useRoute("/perfil/:uid");
  const uid = params?.uid ?? "";
  const { currentUser } = useAuth();

  const { data: usuariosRaw, isLoading } = useListUsuarios();

  // Abas do perfil público: informações e personagens confirmados no cast.
  const [aba, setAba] = useState<"sobre" | "personagens">("sobre");
  const { data: personagensRaw, isLoading: personagensLoading } =
    useListPersonagensFeitos(uid, {
      query: { enabled: !!uid, queryKey: ["personagensFeitos", uid] },
    });
  const personagens = Array.isArray(personagensRaw) ? personagensRaw : [];

  const usuarios = useMemo(
    () => (Array.isArray(usuariosRaw) ? usuariosRaw : []),
    [usuariosRaw],
  );
  const usuario = usuarios.find((u) => u.uid === uid);
  const portfolio = usuario?.voicePortfolio ?? [];

  const isOwnProfile = !!currentUser && currentUser.uid === uid;

  if (isLoading) {
    return (
      <div className="container mx-auto w-full min-w-0 max-w-screen-md px-4 py-8">
        <Skeleton className="h-7 w-40 mb-6" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  if (!usuario) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto w-full min-w-0 max-w-screen-md px-4 py-16"
      >
        <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl text-muted-foreground">
          <UserX className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Conta não encontrada.</p>
          <p className="text-sm mt-1">Ela pode ter sido removida.</p>
          <Button asChild variant="outline" className="mt-6 gap-2">
            <Link href="/descobrir">
              <ArrowLeft className="w-4 h-4" /> Voltar ao Descobrir
            </Link>
          </Button>
        </div>
      </motion.div>
    );
  }

  const contaLabel = usuario.isZenkatuber
    ? "Zenkatuber"
    : usuario.role === "admin"
      ? "Administração"
      : "Membro";

  const abas: Array<{ key: "sobre" | "personagens"; label: string; icon: typeof User }> = [
    { key: "sobre", label: "Sobre", icon: User },
    { key: "personagens", label: "Personagens feitos", icon: Film },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container mx-auto w-full min-w-0 max-w-screen-md px-4 py-8"
    >
      <Link href="/descobrir" className="inline-flex mb-6">
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar ao Descobrir
        </span>
      </Link>

      {/* Abas do perfil público */}
      <div className="mb-6 flex min-w-0 gap-1 overflow-x-auto rounded-xl border border-border bg-card/50 p-1">
        {abas.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setAba(item.key)}
            className={`flex min-w-0 flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors sm:text-sm ${
              aba === item.key
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            }`}
          >
            <item.icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </div>

      {aba === "sobre" && (
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Banner */}
        <div className="h-28 bg-gradient-to-br from-primary/40 via-primary/10 to-transparent relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.35),transparent_60%)]" />
        </div>

        {/* Cabeçalho do perfil */}
        <div className="px-6 pb-6 -mt-14 flex flex-col items-center text-center">
          <PublicAvatar photoUrl={usuario.photoUrl} username={usuario.username} />

          <div className="flex items-center gap-2 mt-3 min-w-0">
            <h1 className="font-display text-2xl font-bold text-foreground truncate">
              {usuario.username || "Sem nome de usuário"}
            </h1>
            {usuario.isZenkatuber && (
              <VerifiedBadge verifiedAt={usuario.verifiedAt} size="lg" />
            )}
          </div>

          <span className="mt-2 inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border border-primary/25 bg-primary/10 text-primary">
            <BadgeCheck className="w-3.5 h-3.5" />
            {contaLabel}
          </span>

          {/* Informações públicas */}
          <div className="grid grid-cols-2 gap-3 w-full mt-6">
            <div className="rounded-xl border border-border bg-background/50 p-4">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                <CalendarDays className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider">Membro desde</span>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-foreground">
                {format(new Date(usuario.createdAt), "MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background/50 p-4">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider">Conta</span>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-foreground">
                {usuario.role === "admin" ? "Administrador" : "Conta ativa"}
              </p>
            </div>
          </div>

          {usuario.bio && (
            <div className="w-full mt-4 text-left rounded-xl border border-border bg-background/50 p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
                Biografia
              </p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{usuario.bio}</p>
            </div>
          )}

          {portfolio.length > 0 && (
            <div className="w-full mt-3 text-left rounded-xl border border-border bg-background/50 p-4 space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Portfólio de voz
              </p>
              {portfolio.map((item, index) => (
                <a
                  key={`${item.url}-${index}`}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <Mic className="w-4 h-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    {item.titulo}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                </a>
              ))}
            </div>
          )}

          <div className="w-full mt-5">
            {isOwnProfile ? (
              <Button asChild className="w-full gap-2 font-display tracking-wide">
                <Link href="/perfil">
                  <Pencil className="w-4 h-4" /> Editar meu perfil
                </Link>
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Estas são as informações públicas desta conta.
              </p>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Personagens feitos */}
      {aba === "personagens" && (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-lg bg-primary/15 p-2 text-primary">
              <Film className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold text-foreground">
                Personagens feitos
              </h2>
              <p className="truncate text-xs text-muted-foreground">
                Personagens confirmados por {usuario.username || "esta conta"}.
              </p>
            </div>
          </div>

          {personagensLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : personagens.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-xl py-10 text-center text-muted-foreground">
              <Film className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Nenhum personagem confirmado ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {personagens.map((personagem) => (
                <Link
                  key={personagem.id}
                  href={`/obra/${personagem.obraSlug}`}
                  className="group flex min-w-0 items-center gap-3 rounded-xl border border-border bg-background/50 p-3 transition-all hover:border-primary/40 hover:bg-primary/5"
                >
                  {personagem.obraCapa ? (
                    <img
                      src={personagem.obraCapa}
                      alt={personagem.obraTitulo}
                      className="h-16 w-12 shrink-0 rounded-md border border-border object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-secondary">
                      <Film className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                      {personagem.personagem}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {personagem.obraTitulo}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground/70">
                      como {personagem.nome}
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
