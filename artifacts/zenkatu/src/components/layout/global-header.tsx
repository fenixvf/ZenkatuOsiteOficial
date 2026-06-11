import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Search, X, Menu } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useSearchObras } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";

function SearchBar() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results } = useSearchObras(debouncedQuery || "_", {
    query: { enabled: debouncedQuery.trim().length >= 2 },
  });

  useEffect(() => {
    if (debouncedQuery.trim().length >= 2 && results && results.length > 0) {
      setOpen(true);
    } else if (debouncedQuery.trim().length < 2) {
      setOpen(false);
    }
  }, [debouncedQuery, results]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (slug: string) => {
    setQuery("");
    setOpen(false);
    setLocation(`/obra/${slug}`);
  };

  const handleClear = () => {
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative hidden md:block w-64">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar animes..."
          className="pl-9 pr-8 bg-secondary/60 border-border focus-visible:ring-primary/50 h-9"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <AnimatePresence>
        {open && results && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 right-0 z-50 rounded-xl border border-border bg-card shadow-xl overflow-hidden"
          >
            {results.map((obra) => (
              <button
                key={obra.id}
                onClick={() => handleSelect(obra.slug)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left"
              >
                <img
                  src={obra.capaUrl || `https://placehold.co/60x90/0F1C2E/1E3A8A?text=?`}
                  alt={obra.titulo}
                  className="w-8 h-12 object-cover rounded"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{obra.titulo}</p>
                  <p className="text-xs text-muted-foreground">{obra.ano} · {obra.status}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
        {open && debouncedQuery.trim().length >= 2 && results && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full mt-2 left-0 right-0 z-50 rounded-xl border border-border bg-card shadow-xl px-4 py-6 text-center text-sm text-muted-foreground"
          >
            Nenhum resultado para &quot;{debouncedQuery}&quot;
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface GlobalHeaderProps {
  onMenuClick: () => void;
}

export function GlobalHeader({ onMenuClick }: GlobalHeaderProps) {
  const { currentUser, userProfile, isAdmin, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 max-w-full items-center justify-between px-4 gap-4">
        <div className="flex items-center gap-3">
          {/* Hamburger — visible on mobile only */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link href="/" className="flex items-center space-x-2">
            <span className="font-display text-2xl font-bold tracking-wider text-primary">
              ZENKATU
            </span>
          </Link>
        </div>

        <SearchBar />

        <div className="flex items-center gap-4">
          {currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full border border-border"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={userProfile?.photoUrl || currentUser.photoURL || ""}
                      alt={userProfile?.username || "Avatar"}
                    />
                    <AvatarFallback className="bg-card text-card-foreground">
                      {userProfile?.username?.[0]?.toUpperCase() ||
                        currentUser.email?.[0]?.toUpperCase() ||
                        "Z"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {userProfile?.username || currentUser.displayName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {currentUser.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/perfil" className="cursor-pointer w-full block">
                    Ver Perfil
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="cursor-pointer w-full block">
                      Painel Admin
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={() => signOut()}
                >
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
