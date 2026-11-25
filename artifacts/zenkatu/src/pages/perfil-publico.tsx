import { useMemo, useState } from "react";
import {
  useListUsuarios,
  useListPersonagensFeitos,
  useListObras,
} from "@workspace/api-client-react";
import { Link, useRoute } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Users,
  CalendarDays,
  BadgeCheck,
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
import { groupProfileProjects } from "@/lib/profile-projects";

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

  const { data: usuariosRaw, isLoading, isError, refetch } = useListUsuarios();

  // Seções públicas: informações e projetos com personagens confirmados.
  const [aba, setAba] = useState<"sobre" | "personagens">("sobre");
  const { data: personagensRaw, isLoading: personagensLoading, isError: personagensError, refetch: refetchPersonagens } =
    useListPersonagensFeitos(uid, {
      query: { enabled: !!uid, queryKey: ["personagensFeitos", uid] },
    });
  const { data: obrasRaw, isLoading: obrasLoading, isError: obrasError, refetch: refetchObras } =
    useListObras();
  const personagens = useMemo(
    () => (Array.isArray(personagensRaw) ? personagensRaw.filter((entry) => entry.status === "accepted") : []),
    [personagensRaw],
  );
  const obras = useMemo(() => (Array.isArray(obrasRaw) ? obrasRaw : []), [obrasRaw]);
  const projetos = useMemo(
    () => groupProfileProjects(uid, obras, personagens),
    [uid, obras, personagens],
  );

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
        <Skeleton className="mb-6 h-10 w-48 rounded-lg" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="mt-5 h-32 rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto w-full max-w-screen-md px-4 py-16">
        <div role="alert" className="rounded-2xl border border-destructive/25 bg-card p-8 text-center">
          <p className="font-semibold text-foreground">Não foi possível carregar este perfil.</p>
          <p className="mt-1 text-sm text-muted-foreground">Verifique sua conexão e tente novamente.</p>
          <Button onClick={() => refetch()} data-testid="button-retry-public-profile" variant="outline" className="mt-5">Tentar novamente</Button>
        </div>
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
    { key: "personagens", label: "Projetos", icon: Film },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
        className="container mx-auto w-full min-w-0 max-w-screen-md px-4 py-7 sm:py-10"
    >
      <Link href="/descobrir" data-testid="link-back-to-directory" className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-lg pr-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ArrowLeft className="h-4 w-4" /> Voltar ao diretório
      </Link>

      {/* Abas do perfil público */}
      <div role="group" aria-label="Seções do perfil" className="mb-5 flex min-w-0 gap-1 overflow-x-auto rounded-xl border border-border bg-card/50 p-1">
        {abas.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={aba === item.key}
            data-testid={`profile-section-${item.key}`}
            onClick={() => setAba(item.key)}
            className={`flex min-h-11 min-w-0 flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm ${
              aba === item.key
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            }`}
          >
            <item.icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{item.label}</span>
            {item.key === "personagens" && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${aba === item.key ? "bg-primary-foreground/15 text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                {projetos.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {aba === "sobre" && (
      <section id="profile-panel-sobre" className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-background/30">
        {/* Banner */}
        <div className="relative h-36 overflow-hidden bg-gradient-to-br from-primary/35 via-primary/10 to-secondary sm:h-44">
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(59,130,246,0.34),transparent_55%)]" />
          <div aria-hidden="true" className="absolute -right-12 -top-24 h-72 w-72 rounded-full border border-primary/15" />
          <p className="absolute bottom-4 right-5 font-display text-xs font-bold uppercase tracking-[0.24em] text-foreground/55">Perfil da comunidade</p>
        </div>

        {/* Cabeçalho do perfil */}
        <div className="relative -mt-16 flex flex-col items-center px-5 pb-7 text-center sm:-mt-[4.5rem] sm:px-8">
          <PublicAvatar photoUrl={usuario.photoUrl} username={usuario.username} />

          <div className="mt-3 flex min-w-0 items-center gap-2">
            <h1 className="truncate font-display text-2xl font-bold text-foreground sm:text-3xl">
              {usuario.username || "Sem nome de usuário"}
            </h1>
            {usuario.isZenkatuber && (
              <VerifiedBadge verifiedAt={usuario.verifiedAt} size="lg" />
            )}
          </div>

          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <BadgeCheck className="w-3.5 h-3.5" />
            {contaLabel}
          </span>

          {/* Informações públicas */}
          <div className="mt-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
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

          {usuario.bio ? (
            <div className="mt-4 w-full rounded-xl border border-border bg-background/50 p-4 text-left sm:p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
                Biografia
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{usuario.bio}</p>
            </div>
          ) : (
            <div className="mt-4 w-full rounded-xl border border-dashed border-border bg-background/30 p-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Biografia</p>
              <p className="mt-1 text-sm text-muted-foreground">Esta pessoa ainda não adicionou uma biografia.</p>
            </div>
          )}

          <div className="mt-3 w-full space-y-2 rounded-xl border border-border bg-background/50 p-4 text-left">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Portfólio de voz</p>
                <span className="text-xs text-muted-foreground">{portfolio.length} {portfolio.length === 1 ? "amostra" : "amostras"}</span>
              </div>
              {portfolio.length > 0 ? portfolio.map((item, index) => (
                <a
                  key={`${item.url}-${index}`}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`link-portfolio-${index}`}
                  className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Mic className="w-4 h-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    {item.titulo}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                </a>
              )) : <p className="text-sm text-muted-foreground">Nenhuma amostra de voz publicada ainda.</p>}
          </div>

          <div className="w-full mt-5">
            {isOwnProfile ? (
              <Button asChild data-testid="button-edit-public-profile" className="min-h-11 w-full gap-2 rounded-xl font-display font-semibold tracking-wide">
                <Link href="/perfil">
                  <Pencil className="w-4 h-4" /> Editar meu perfil
                </Link>
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">Perfil público da comunidade Zenkatu.</p>
            )}
          </div>
        </div>
      </section>
      )}

      {/* Personagens feitos */}
      {aba === "personagens" && (
      <section id="profile-panel-personagens" className="rounded-2xl border border-border bg-card p-5 shadow-xl shadow-background/30 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-lg bg-primary/15 p-2 text-primary">
              <Film className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold text-foreground">Projetos em que participa</h2>
              <p className="text-xs text-muted-foreground">
                Projetos criados e participações de elenco confirmadas por {usuario.username || "esta pessoa"}.
              </p>
            </div>
          </div>

          {personagensLoading || obrasLoading ? (
            <div className="grid gap-3 sm:grid-cols-2" aria-label="Carregando projetos">
              {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-28 rounded-xl" />)}
            </div>
          ) : personagensError || obrasError ? (
            <div role="alert" className="rounded-xl border border-destructive/25 bg-background/50 p-8 text-center">
              <p className="text-sm text-muted-foreground">Não foi possível carregar os projetos.</p>
              <Button
                onClick={() => void Promise.all([refetchPersonagens(), refetchObras()])}
                data-testid="button-retry-projects"
                variant="outline"
                size="sm"
                className="mt-4"
              >
                Tentar novamente
              </Button>
            </div>
          ) : projetos.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-xl py-10 text-center text-muted-foreground">
              <Film className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Nenhum projeto para mostrar ainda.</p>
              <p className="mt-1 text-xs">Projetos criados e participações aceitas aparecem aqui.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {projetos.map((projeto) => (
                  <article key={projeto.id} className="overflow-hidden rounded-xl border border-border bg-background/50 transition-colors hover:border-primary/35">
                    <Link href={`/obra/${projeto.slug}`} data-testid={`link-project-${projeto.id}`} className="group flex items-center gap-3 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                      {projeto.capaUrl ? (
                        <img src={projeto.capaUrl} alt="" className="h-20 w-14 shrink-0 rounded-md border border-border object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded-md border border-border bg-secondary"><Film className="h-5 w-5 text-muted-foreground" /></div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-lg font-bold text-foreground group-hover:text-primary">{projeto.titulo}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {projeto.isOwner && <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Criado por esta pessoa</span>}
                          {projeto.participations.length > 0 && <span className="rounded-full border border-border bg-secondary/70 px-2 py-0.5 text-[10px] text-muted-foreground">{projeto.participations.length} {projeto.participations.length === 1 ? "personagem" : "personagens"}</span>}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    {projeto.participations.length > 0 ? (
                      <div className="border-t border-border/70 px-3 py-3">
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Participação confirmada</p>
                        <ul className="space-y-2">
                          {projeto.participations.map((entry) => (
                            <li key={entry.id} className="flex min-w-0 items-start justify-between gap-3 text-sm">
                              <span className="min-w-0 truncate font-medium text-foreground">{entry.personagem}</span>
                              <span className="shrink-0 text-right text-xs text-muted-foreground">como {entry.nome}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="border-t border-border/70 px-3 py-3 text-xs text-muted-foreground">Responsável por este projeto.</p>
                    )}
                  </article>
              ))}
            </div>
          )}
        </section>
      )}
    </motion.div>
  );
}
