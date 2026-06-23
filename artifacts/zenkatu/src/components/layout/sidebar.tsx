import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { useListGeneros } from "@workspace/api-client-react";
import {
  Home,
  TrendingUp,
  Tags,
  ChevronDown,
  LayoutDashboard,
  Layers,
  Film,
  Smartphone,
  Settings,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function NavLink({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
}) {
  const [location] = useLocation();
  const active = location === href || (href !== "/" && location.startsWith(href));

  return (
    <Link href={href} onClick={onClick}>
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

function GeneroSection({ onClose }: { onClose: () => void }) {
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
              <Link href="/generos" onClick={onClose}>
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
                <Link key={g.id} href={`/genero/${g.slug}`} onClick={onClose}>
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

function AdminSection({ onClose }: { onClose: () => void }) {
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
                { href: "/admin/config", label: "Configurações", icon: Settings },
              ].map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} onClick={onClose}>
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

export function Sidebar({ open, onClose }: SidebarProps) {
  const { isAdmin } = useAuth();

  const sidebarContent = (
    <div className="flex flex-col h-full py-4 px-3 gap-1">
      <div className="px-3 py-2 mb-2">
        <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
          Navegar
        </span>
      </div>

      <NavLink href="/" icon={Home} label="Início" onClick={onClose} />
      <NavLink href="/ranking" icon={TrendingUp} label="Ranking" onClick={onClose} />
      <NavLink href="/versao-app" icon={Smartphone} label="Versão app" onClick={onClose} />
      <GeneroSection onClose={onClose} />

      {isAdmin && (
        <>
          <div className="my-3 border-t border-border" />
          <div className="px-3 py-2">
            <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
              Administração
            </span>
          </div>
          <AdminSection onClose={onClose} />
        </>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-border/60 bg-background/95 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 left-0 z-50 h-full w-72 bg-background border-r border-border shadow-2xl lg:hidden overflow-y-auto"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <span className="font-display text-xl font-bold tracking-wider text-primary">
                  ZENKATU
                </span>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
