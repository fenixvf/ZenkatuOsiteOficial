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
import { Search, X, Menu, TrendingUp, Clock } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchObras } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import logoImg from "/logo.png";

function useSearch() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results, isFetching } = useSearchObras(debouncedQuery || "_", {
    query: {
      enabled: debouncedQuery.trim().length >= 2,
      queryKey: ["searchObras", debouncedQuery] as any,
    },
  });

  const hasQuery = debouncedQuery.trim().length >= 2;

  return { query, setQuery, results, isFetching, hasQuery, debouncedQuery };
}

function ResultsList({
  results,
  query,
  isFetching,
  hasQuery,
  onSelect,
}: {
  results: any[] | undefined;
  query: string;
  isFetching: boolean;
  hasQuery: boolean;
  onSelect: (slug: string) => void;
}) {
  if (!hasQuery) return null;

  return (
    <AnimatePresence mode="wait">
      {isFetching ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center justify-center py-8 text-sm text-muted-foreground"
        >
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-primary"
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
              />
            ))}
          </div>
        </motion.div>
      ) : results && results.length > 0 ? (
        <motion.div
          key="results"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="space-y-1"
        >
          {results.map((obra, i) => (
            <motion.button
              key={obra.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => onSelect(obra.slug)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/80 transition-colors text-left group"
            >
              <div className="relative w-10 h-14 shrink-0 rounded-lg overflow-hidden bg-secondary">
                <img
                  src={obra.capaUrl || `https://placehold.co/60x90/0F1C2E/1E3A8A?text=?`}
                  alt={obra.titulo}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold line-clamp-1 text-foreground">{obra.titulo}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {obra.ano && <span>{obra.ano}</span>}
                  {obra.ano && obra.status && <span className="mx-1">·</span>}
                  {obra.status && <span>{obra.status}</span>}
                </p>
                {obra.generos && obra.generos.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {obra.generos.slice(0, 3).map((g: string) => (
                      <span
                        key={g}
                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {obra.views > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <TrendingUp className="w-3 h-3" />
                  <span>{obra.views >= 1000 ? `${(obra.views / 1000).toFixed(1)}k` : obra.views}</span>
                </div>
              )}
            </motion.button>
          ))}
        </motion.div>
      ) : (
        <motion.div
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center justify-center py-10 text-center"
        >
          <Search className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            Nenhum resultado para
          </p>
          <p className="text-sm font-bold text-foreground mt-0.5">"{query}"</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DesktopSearchBar() {
  const { query, setQuery, results, isFetching, hasQuery, debouncedQuery } = useSearch();
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasQuery) setOpen(true);
    else setOpen(false);
  }, [hasQuery, results]);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <div ref={containerRef} className="relative hidden md:block w-72">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => hasQuery && setOpen(true)}
          placeholder="Buscar animes..."
          className="pl-9 pr-8 bg-secondary/60 border-border focus-visible:ring-primary/50 h-9 rounded-xl"
        />
        <AnimatePresence>
          {query && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => { setQuery(""); setOpen(false); inputRef.current?.focus(); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 right-0 z-50 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden max-h-[70vh] overflow-y-auto p-2"
          >
            <ResultsList
              results={results}
              query={debouncedQuery}
              isFetching={isFetching}
              hasQuery={hasQuery}
              onSelect={handleSelect}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MobileSearchOverlay({ onClose }: { onClose: () => void }) {
  const { query, setQuery, results, isFetching, hasQuery, debouncedQuery } = useSearch();
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSelect = (slug: string) => {
    onClose();
    setLocation(`/obra/${slug}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex flex-col"
    >
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar animes..."
            className="w-full h-11 pl-9 pr-4 rounded-xl bg-secondary/60 border border-border text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <button
          onClick={onClose}
          className="p-2.5 rounded-xl bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!hasQuery ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Search className="w-12 h-12 text-muted-foreground/20 mb-4" />
            <p className="text-sm text-muted-foreground">
              Digite o nome do anime que deseja encontrar
            </p>
          </div>
        ) : (
          <ResultsList
            results={results}
            query={debouncedQuery}
            isFetching={isFetching}
            hasQuery={hasQuery}
            onSelect={handleSelect}
          />
        )}
      </div>
    </motion.div>
  );
}

interface GlobalHeaderProps {
  onMenuClick: () => void;
}

export function GlobalHeader({ onMenuClick }: GlobalHeaderProps) {
  const { currentUser, userProfile, isAdmin, signOut } = useAuth();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 max-w-full items-center justify-between px-4 gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-primary/10">
                <img
                  src={logoImg}
                  alt="Zenkatu"
                  className="w-full h-full object-cover object-center"
                />
              </div>
              <span className="font-display text-2xl font-bold tracking-wider text-primary">
                ZENKATU
              </span>
            </Link>
          </div>

          <DesktopSearchBar />

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileSearchOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Buscar"
            >
              <Search className="w-5 h-5" />
            </button>

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

      <AnimatePresence>
        {mobileSearchOpen && (
          <MobileSearchOverlay onClose={() => setMobileSearchOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
