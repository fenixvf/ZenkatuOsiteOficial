import { Link } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function GlobalHeader() {
  const { currentUser, userProfile, isAdmin, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-display text-2xl font-bold tracking-wider text-primary">ZENKATU</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/" className="transition-colors hover:text-primary text-foreground/80">Início</Link>
            <Link href="/categorias" className="transition-colors hover:text-primary text-foreground/80">Categorias</Link>
            <Link href="/ranking" className="transition-colors hover:text-primary text-foreground/80">Ranking</Link>
            <Link href="/em-alta" className="transition-colors hover:text-primary text-foreground/80">Em Alta</Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full border border-border">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={userProfile?.photoUrl || currentUser.photoURL || ""} alt={userProfile?.username || "Avatar"} />
                    <AvatarFallback className="bg-card text-card-foreground">
                      {userProfile?.username?.[0]?.toUpperCase() || currentUser.email?.[0]?.toUpperCase() || "Z"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userProfile?.username || currentUser.displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {currentUser.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/perfil" className="cursor-pointer w-full block">Ver Perfil</Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="cursor-pointer w-full block">Painel Admin</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => signOut()}>
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild className="font-display font-semibold tracking-wide">
              <Link href="/login">Entrar</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
