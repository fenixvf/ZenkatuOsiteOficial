import { Compass, Home, Tags, UserRound } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const destinations = [
  { href: "/", label: "Início", icon: Home },
  { href: "/generos", label: "Gêneros", icon: Tags },
  { href: "/descobrir", label: "Descobrir", icon: Compass },
  { href: "/perfil", label: "Perfil", icon: UserRound },
];

function isCurrentDestination(location: string, href: string) {
  if (href === "/") return location === "/";
  if (href === "/generos") {
    return location === "/generos" || location.startsWith("/genero/");
  }
  return location === href || location.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const [location] = useLocation();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.28)] backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {destinations.map(({ href, label, icon: Icon }) => {
          const active = isCurrentDestination(location, href);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform",
                  active && "scale-110 stroke-[2.5]",
                )}
              />
              <span className="text-[10px] font-medium leading-none">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
