import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { useListGeneros } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import {
  Home,
  TrendingUp,
  Tags,
  ChevronDown,
  LayoutDashboard,
  Layers,
  Smartphone,
  Settings,
  BadgeCheck,
  Bell,
  Users,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { detectPlatform, parseSocialLinks } from "@/lib/social-platforms";

async function fetchConfig(): Promise<Record<string, string>> {
  const res = await fetch("/api/config");
  if (!res.ok) throw new Error("Erro ao carregar configurações");
  return res.json();
}

function NavLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
}) {
  const [location] = useLocation();
  const active = location === href || (href !== "/" && location.startsWith(href));

  return (
    <Link href={href}>
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
          active
            ? "bg-primary/15 text-primary border border-primary/20"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
    </Link>
  );
}

function GeneroSection() {
  const [location] = useLocation();
  const [expanded, setExpanded] = useState(
    location.startsWith("/genero") || location === "/generos",
  );
  const { data: generosRaw } = useListGeneros();
  const generos = Array.isArray(generosRaw) ? generosRaw : [];

  return (
    <div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
      >
        <div className="flex items-center gap-3">
          <Tags className="w-4 h-4 shrink-0" />
          <span>Gêneros</span>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 shrink-0 transition-transform duration-200",
            expanded && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-1 ml-4 pl-3 border-l border-border space-y-0.5">
              <Link href="/generos">
                <div className={cn(
                  "px-3 py-2 rounded-md text-xs font-medium transition-all",
                  location === "/generos"
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                )}>
                  Ver todos
                </div>
              </Link>
              {generos.map((g) => (
                <Link key={g.id} href={`/genero/${g.slug}`}>
                  <div
                    className={cn(
                      "px-3 py-2 rounded-md text-xs font-medium transition-all",
                      location === `/genero/${g.slug}`
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                    )}
                  >
                    {g.nome}
                  </div>
                </Link>
              ))}
              {generos.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground/50 italic">
                  Nenhum gênero cadastrado
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SocialLinksSection() {
  const { data: config } = useQuery({
    queryKey: ["site-config"],
    queryFn: fetchConfig,
    staleTime: 5 * 60 * 1000,
  });

  const links = parseSocialLinks(config?.["socialLinks"]);
  const title = config?.["socialLinksTitle"] || "Comunidade";

  if (!config || links.length === 0) return null;

  return (
    <div className="mt-1">
      <div className="px-3 py-2">
        <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className="space-y-0.5">
        {links.map((link, idx) => {
          const platform = detectPlatform(link.url);
          const Icon = platform.icon;
          return (
            <a
              key={idx}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
            >
              <Icon className={cn("w-4 h-4 shrink-0", platform.color)} />
              <span className="truncate">{platform.label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function AdminSection() {
  const [location] = useLocation();
  const [expanded, setExpanded] = useState(location.startsWith("/admin"));

  return (
    <div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
      >
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          <span>Admin</span>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 shrink-0 transition-transform duration-200",
            expanded && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-1 ml-4 pl-3 border-l border-border space-y-0.5">
              {[
                { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
                { href: "/admin/obras", label: "Obras", icon: Layers },
                { href: "/admin/generos", label: "Gêneros", icon: Tags },
                { href: "/admin/zenkatubers", label: "Zenkatubers", icon: BadgeCheck },
                { href: "/admin/notificacoes", label: "Notificações", icon: Bell },
                { href: "/admin/config", label: "Configurações", icon: Settings },
                { href: "/meus-projetos", label: "Meus Projetos", icon: Layers },
              ].map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href}>
                  <div
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all",
                      location === href || (href !== "/admin" && location.startsWith(href))
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Sidebar() {
  const { isAdmin, isZenkatuber } = useAuth();

  const sidebarContent = (
    <div className="flex flex-col h-full py-4 px-3 gap-1">
      <div className="px-3 py-2 mb-2">
        <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
          Navegar
        </span>
      </div>

      <NavLink href="/" icon={Home} label="Início" />
      <NavLink href="/descobrir" icon={Users} label="Descobrir" />
      <NavLink href="/ranking" icon={TrendingUp} label="Ranking" />
      <NavLink href="/versao-app" icon={Smartphone} label="Versão app" />
      <GeneroSection />

      <SocialLinksSection />

      {isZenkatuber && !isAdmin && (
        <>
          <div className="my-3 border-t border-border" />
          <div className="px-3 py-2">
            <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
              Criador
            </span>
          </div>
          <NavLink href="/meus-projetos" icon={Layers} label="Meus Projetos" />
        </>
      )}

      {isAdmin && (
        <>
          <div className="my-3 border-t border-border" />
          <div className="px-3 py-2">
            <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
              Administração
            </span>
          </div>
          <AdminSection />
        </>
      )}
    </div>
  );

  return (
    <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-border/60 bg-background/95 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
      {sidebarContent}
    </aside>
  );
}
