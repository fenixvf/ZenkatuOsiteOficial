import {
  Compass,
  Home,
  Search,
  Tags,
  UserRound,
} from "lucide-react";
import "./_group.css";

const destinations = [
  { label: "Início", icon: Home, active: true },
  { label: "Gêneros", icon: Tags, active: false },
  { label: "Descobrir", icon: Compass, active: false },
  { label: "Perfil", icon: UserRound, active: false },
];

export function MobileBottomNavbar() {
  return (
    <div className="dark min-h-screen bg-background font-sans text-foreground">
      <header className="flex h-16 items-center justify-between border-b border-border/40 bg-background/95 px-4">
        <span className="font-display text-2xl font-bold tracking-wider text-primary">
          ZENKATU
        </span>
        <div className="flex items-center gap-3 text-muted-foreground">
          <Search className="h-5 w-5" />
          <span className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground">
            Entrar
          </span>
        </div>
      </header>

      <main className="px-5 pb-24 pt-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Zenkatu Streaming
        </p>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Explore seu próximo anime
        </h1>
        <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
          Acesse rapidamente as áreas principais pelo menu na parte inferior.
        </p>
        <div className="mt-7 flex h-56 items-end rounded-2xl border border-border/70 bg-gradient-to-br from-primary/20 via-card to-background p-4">
          <div className="h-2 w-20 rounded-full bg-primary/50" />
        </div>
      </main>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.28)] backdrop-blur-xl"
      >
        <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
          {destinations.map(({ label, icon: Icon, active }) => (
            <div
              key={label}
              className={`flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] font-medium leading-none">
                {label}
              </span>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}
