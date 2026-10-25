import {
  useListBannerObras,
  useListObrasRecentes,
  useListTop10Obras,
  useListEpisodiosRecentes,
  useGetUsuarioHistorico,
  useClearHistorico,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Play, Info, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient } from "@tanstack/react-query";

function HeroCarousel() {
  const { data: bannerObras, isLoading } = useListBannerObras();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!bannerObras || bannerObras.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % bannerObras.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [bannerObras]);

  if (isLoading)
    return (
      <Skeleton className="w-full aspect-video md:aspect-[21/9] lg:aspect-[3/1] rounded-none" />
    );
  if (!Array.isArray(bannerObras) || bannerObras.length === 0) return null;

  const current = bannerObras[currentIndex];

  const handleNext = () =>
    setCurrentIndex((prev) => (prev + 1) % bannerObras.length);
  const handlePrev = () =>
    setCurrentIndex(
      (prev) => (prev - 1 + bannerObras.length) % bannerObras.length,
    );

  return (
    <section aria-label="Em destaque" className="relative w-full aspect-[4/3] md:aspect-[21/9] lg:aspect-[2.5/1] max-h-[760px] overflow-hidden group isolate">
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/55 to-transparent z-10" />
          <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(7,10,18,.25),transparent_55%,rgba(220,91,59,.12))] z-10 pointer-events-none" />
          <img
            src={
              current.bannerUrl ||
              current.capaUrl ||
              `https://placehold.co/1920x1080/0F1C2E/1E3A8A?text=${current.titulo}`
            }
            alt={current.titulo}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 md:p-12 lg:p-20 container max-w-screen-2xl">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="max-w-2xl pb-2 md:pb-8"
            >
              <div className="flex items-center gap-2 mb-5">
                <Badge
                  variant="secondary"
                  className="bg-[#d96445] text-[#171018] hover:bg-[#f07a57] border-0 font-semibold tracking-wider"
                >
                  {current.ano}
                </Badge>
                  <Badge variant="outline" className="border-white/30 bg-black/20 backdrop-blur text-white/90">
                  {current.status}
                </Badge>
              </div>

              {current.tipografiaUrl ? (
                <img
                  src={current.tipografiaUrl}
                  alt={current.titulo}
                  className="max-h-20 md:max-h-28 lg:max-h-36 w-auto object-contain mb-5 drop-shadow-2xl"
                  style={{ maxWidth: "520px" }}
                />
              ) : (
                <h2 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-5 leading-[.95] tracking-tight drop-shadow-lg">
                  {current.titulo}
                </h2>
              )}

              <p className="text-white/75 line-clamp-2 md:line-clamp-3 mb-8 text-sm md:text-base max-w-xl leading-relaxed drop-shadow-md">
                {current.sinopse}
              </p>
              <div className="flex gap-4">
                <Button
                  asChild
                  size="lg"
                  className="font-display tracking-wide px-8 h-12 bg-[#df6848] text-[#171018] hover:bg-[#f07a57] rounded-full shadow-xl shadow-black/20"
                >
                  <Link href={`/obra/${current.slug}`}>
                    <Play className="mr-2 h-5 w-5" /> Assistir
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="font-display tracking-wide px-8 h-12 rounded-full bg-white/10 border border-white/20 text-white backdrop-blur hover:bg-white/20"
                >
                  <Link href={`/obra/${current.slug}`}>
                    <Info className="mr-2 h-5 w-5" /> Detalhes
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      <button
        onClick={handlePrev}
        aria-label="Destaque anterior"
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-black/70 backdrop-blur border border-white/15"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={handleNext}
        aria-label="Próximo destaque"
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-black/70 backdrop-blur border border-white/15"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      <div className="absolute bottom-6 right-6 md:right-12 lg:right-20 z-30 flex gap-2" aria-label="Selecionar destaque">
        {bannerObras.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            aria-label={`Ir para destaque ${idx + 1}`}
            aria-current={idx === currentIndex}
            className={`h-2 rounded-full transition-all ${idx === currentIndex ? "w-8 bg-primary" : "w-2 bg-foreground/30 hover:bg-foreground/50"}`}
          />
        ))}
      </div>
    </section>
  );
}

function ContinuarAssistindo() {
  const { currentUser } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const clearHistorico = useClearHistorico();

  const { data: historicoRaw, isLoading } = useGetUsuarioHistorico(
    currentUser?.uid || "",
    {
      query: {
        enabled: !!currentUser?.uid,
        queryKey: ["getUsuarioHistorico", currentUser?.uid || ""],
      },
    },
  );

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -360 : 360, behavior: "smooth" });
  };

  const handleClear = () => {
    if (!currentUser?.uid) return;
    clearHistorico.mutate({ uid: currentUser.uid }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["getUsuarioHistorico", currentUser.uid] });
      },
    });
  };

  if (!currentUser) return null;

  if (isLoading) {
    return (
      <div>
        <div className="h-7 w-52 bg-secondary/60 rounded mb-4" />
        <div className="flex gap-2.5 overflow-x-hidden p-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="min-w-[152px] aspect-video rounded-lg flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  const historico = Array.isArray(historicoRaw) ? historicoRaw : [];

  const seen = new Set<number>();
  const items = historico.filter((h) => {
    if (seen.has(h.obraId)) return false;
    seen.add(h.obraId);
    return true;
  });

  if (items.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-xl md:text-2xl font-bold tracking-wide border-l-2 border-[#df6848] pl-4 text-foreground">
          Continuar Assistindo
        </h3>
        <button
          onClick={handleClear}
          aria-label="Limpar histórico de reprodução"
          disabled={clearHistorico.isPending}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Limpar
        </button>
      </div>

      <div className="relative">
        <button
          onClick={() => scroll("left")}
          aria-label="Rolar histórico para a esquerda"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 -translate-x-3 p-1.5 rounded-full bg-background/90 border border-border text-foreground shadow-lg hover:bg-secondary transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-2.5 overflow-x-auto pb-2 scroll-smooth px-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {items.map((item, idx) => (
            <motion.div
              key={`${item.episodioId}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="w-[152px] md:w-[168px] shrink-0"
            >
              <Link href={`/obra/${item.obraSlug}?ep=${item.episodioId}`}>
                <div className="group relative rounded-sm overflow-hidden border border-white/10 bg-card hover:border-[#df6848]/60 transition-all hover:shadow-[0_16px_36px_rgba(0,0,0,.3)]">
                  <div className="aspect-video relative">
                    <img
                      src={
                        (item as any).episodioThumbnailUrl ||
                        item.obraCapaUrl ||
                        `https://placehold.co/640x360/0F1C2E/1E3A8A?text=Ep${item.episodioNumero}`
                      }
                      alt={item.episodioTitulo ?? ""}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-7 h-7 text-white fill-white opacity-90" />
                    </div>
                    <Badge className="absolute bottom-1.5 right-1.5 bg-background/80 text-foreground backdrop-blur-sm border-none text-[9px] px-1 py-0">
                      T{item.episodioTemporada} E{item.episodioNumero}
                    </Badge>
                  </div>
                  <div className="px-2 py-1.5">
                    <p className="font-display font-semibold text-[11px] line-clamp-1 group-hover:text-primary transition-colors">
                      {item.obraTitulo}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                      {item.episodioTitulo}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <button
          onClick={() => scroll("right")}
          aria-label="Rolar histórico para a direita"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 translate-x-3 p-1.5 rounded-full bg-background/90 border border-border text-foreground shadow-lg hover:bg-secondary transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[.32em] text-[#df8062] mb-2">Curadoria Zenkatu</p>
        <h3 className="font-display text-2xl md:text-3xl font-bold tracking-wide border-l-2 border-[#df6848] pl-4 text-foreground">{title}</h3>
      </div>
      <span aria-hidden="true" className="hidden sm:block h-px flex-1 mb-2 ml-3 bg-gradient-to-r from-border/80 to-transparent" />
    </div>
  );
}

function ObrasRecentes() {
  const { data: obras, isLoading } = useListObrasRecentes();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -480 : 480, behavior: "smooth" });
  };

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-hidden p-1">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Skeleton key={i} className="min-w-[110px] aspect-[2/3] rounded-lg flex-shrink-0" />
        ))}
      </div>
    );
  }

  if (!Array.isArray(obras) || obras.length === 0) return null;

  return (
    <div className="relative">
      <SectionTitle title="Obras Recentes" />
      <div className="relative">
        <button
          onClick={() => scroll("left")}
          aria-label="Obras anteriores"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 -translate-x-3 p-1.5 rounded-full bg-background/90 border border-border text-foreground shadow-lg hover:bg-secondary transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-2.5 overflow-x-auto pb-2 scroll-smooth px-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {obras.map((obra, idx) => (
            <motion.div
              key={obra.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.04 }}
              className="w-[142px] md:w-[168px] shrink-0"
            >
              <Link href={`/obra/${obra.slug}`}>
                <div className="group relative aspect-[2/3] rounded-sm overflow-hidden border border-white/10 bg-card transition-all duration-300 hover:-translate-y-1 hover:border-[#df6848]/70 hover:shadow-[0_18px_40px_rgba(0,0,0,.35)]">
                  <img
                    src={
                      obra.capaUrl ||
                      `https://placehold.co/400x600/0F1C2E/1E3A8A?text=${obra.titulo}`
                    }
                    alt={obra.titulo}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#090c14]/95 pointer-events-none" />
                  <Badge className="absolute top-2 left-2 bg-[#df6848] text-[#171018] border-none px-2 py-0.5 text-[9px] font-bold tracking-widest shadow-md">
                    NOVO
                  </Badge>
                    <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
                    {obra.tipografiaUrl ? (
                      <img
                        src={obra.tipografiaUrl}
                        alt={obra.titulo}
                        className="max-h-9 w-auto object-contain drop-shadow-lg"
                      />
                    ) : (
                        <h4 className="font-display font-semibold text-sm line-clamp-2 leading-tight drop-shadow">
                        {obra.titulo}
                      </h4>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <button
          onClick={() => scroll("right")}
          aria-label="Próximas obras"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 translate-x-3 p-1.5 rounded-full bg-background/90 border border-border text-foreground shadow-lg hover:bg-secondary transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function Top10() {
  const { data: obras, isLoading } = useListTop10Obras();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!Array.isArray(obras) || obras.length === 0) return null;

  return (
    <div>
      <SectionTitle title="Top 10 Mais Assistidos" />
      <div className="space-y-4">
        {obras.slice(0, 5).map((obra, index) => (
          <motion.div
            key={obra.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link href={`/obra/${obra.slug}`}>
              <div className="group flex items-center gap-3 bg-card/60 hover:bg-card border border-white/8 hover:border-[#df6848]/40 p-3 rounded-sm transition-colors relative overflow-hidden">
                <span className="font-display text-6xl md:text-7xl font-black text-white/[.035] italic -ml-2 select-none z-0 absolute right-2 bottom-[-15px]">
                  {(index + 1).toString().padStart(2, "0")}
                </span>
                <span className="font-display text-3xl font-black text-[#df8062] italic w-12 text-center z-10">
                  {(index + 1).toString().padStart(2, "0")}
                </span>
                <img
                  src={
                    obra.capaUrl ||
                    `https://placehold.co/100x150/0F1C2E/1E3A8A?text=Capa`
                  }
                  alt={obra.titulo}
                  className="w-12 h-16 md:w-16 md:h-24 object-cover rounded-sm shadow-sm z-10"
                  loading="lazy"
                />
                <div className="flex-1 min-w-0 z-10">
                  <h4 className="font-medium text-sm md:text-base line-clamp-1 group-hover:text-primary transition-colors">
                    {obra.titulo}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    {obra.views || 0} visualizações
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function EpisodiosRecentes() {
  const { data: episodios, isLoading } = useListEpisodiosRecentes();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Skeleton key={i} className="aspect-video w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!Array.isArray(episodios) || episodios.length === 0) return null;

  return (
    <div className="col-span-full lg:col-span-2">
      <SectionTitle title="Episódios Recentes" />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {episodios.map((ep, idx) => (
          <motion.div
            key={ep.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Link href={`/obra/${ep.obraSlug ?? ep.obraId}?ep=${ep.id}`}>
              <div className="group relative rounded-sm overflow-hidden border border-white/10 bg-card hover:border-[#df6848]/60 transition-all hover:shadow-[0_16px_36px_rgba(0,0,0,.3)]">
                <div className="aspect-video relative">
                  <img
                    src={
                      ep.thumbnailUrl ||
                      ep.obraCapaUrl ||
                      `https://placehold.co/640x360/0F1C2E/1E3A8A?text=Episodio`
                    }
                    alt={ep.titulo}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-10 h-10 text-primary-foreground fill-primary-foreground opacity-90" />
                  </div>
                  {ep.obraTipografiaUrl && (
                    <div className="absolute bottom-7 left-2 z-10">
                      <img
                        src={ep.obraTipografiaUrl}
                        alt={ep.obraTitulo ?? ""}
                        className="max-h-9 w-auto object-contain"
                        style={{ filter: "drop-shadow(0 0 3px rgba(0,0,0,0.85)) drop-shadow(0 1px 4px rgba(0,0,0,0.7))" }}
                      />
                    </div>
                  )}
                  <Badge className="absolute bottom-2 right-2 bg-black/75 text-white backdrop-blur-sm border-none">
                    T{ep.temporada} E{ep.numero}
                  </Badge>
                </div>
                <div className="p-3">
                  <h4 className="font-display font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                    {ep.obraTitulo || `Obra ${ep.obraId}`}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {ep.titulo}
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="pb-16 overflow-hidden"
    >
      <HeroCarousel />
      <div className="container max-w-screen-2xl px-4 md:px-8 py-10 md:py-14 space-y-14 md:space-y-16">
        <ContinuarAssistindo />
        <ObrasRecentes />
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.8fr)_minmax(290px,.82fr)] gap-10 lg:gap-12 items-start">
          <EpisodiosRecentes />
          <Top10 />
        </div>
      </div>
    </motion.div>
  );
}
