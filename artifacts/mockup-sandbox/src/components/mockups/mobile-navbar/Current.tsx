import { useState } from "react";
import {
  Bell,
  ChevronDown,
  Clock3,
  Home,
  Menu,
  Search,
  Smartphone,
  Tags,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import "./_group.css";

function DrawerLink({
  icon: Icon,
  label,
  active = false,
}: {
  icon: typeof Home;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
        active
          ? "border-primary/20 bg-primary/15 text-primary"
          : "border-transparent text-muted-foreground"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </div>
  );
}

export function Current() {
  const [genresOpen, setGenresOpen] = useState(false);

  return (
    <div className="dark min-h-screen bg-background font-sans text-foreground">
      <header className="relative z-10 flex h-16 items-center justify-between border-b border-border/40 bg-background/95 px-4">
        <div className="flex items-center gap-3">
          <button
            aria-label="Abrir menu"
            className="rounded-lg p-2 text-muted-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-display text-2xl font-bold tracking-wider text-primary">
            ZENKATU
          </span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Search className="h-5 w-5" />
          <Bell className="h-5 w-5" />
        </div>
      </header>

      <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <aside className="relative flex h-[calc(100vh-4rem)] w-72 flex-col overflow-y-auto border-r border-border bg-background shadow-2xl">
          <div className="flex items-center justify-between border-b border-border p-4">
            <span className="font-display text-xl font-bold tracking-wider text-primary">
              ZENKATU
            </span>
            <X className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="flex flex-1 flex-col gap-1 px-3 py-4">
            <div className="mb-2 px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                Navegar
              </span>
            </div>
            <DrawerLink icon={Home} label="Início" active />
            <DrawerLink icon={Users} label="Descobrir" />
            <DrawerLink icon={TrendingUp} label="Ranking" />
            <DrawerLink icon={Smartphone} label="Versão app" />
            <button
              onClick={() => setGenresOpen((open) => !open)}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground"
            >
              <span className="flex items-center gap-3">
                <Tags className="h-4 w-4" />
                Gêneros
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  genresOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {genresOpen && (
              <div className="ml-4 space-y-1 border-l border-border pl-3 text-xs text-muted-foreground">
                <div className="rounded-md bg-primary/10 px-3 py-2 text-primary">
                  Ver todos
                </div>
                <div className="px-3 py-2">Aventura</div>
                <div className="px-3 py-2">Drama</div>
              </div>
            )}
            <div className="mt-auto flex items-center gap-3 border-t border-border px-3 pt-5 text-sm text-muted-foreground">
              <Clock3 className="h-4 w-4" />
              <span>Menu lateral aberto</span>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
