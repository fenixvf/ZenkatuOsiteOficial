import {
  useListBannerObras,
  useListObrasRecentes,
  useListTop10Obras,
  useListEpisodiosRecentes,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Play, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

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
    <div className="relative w-full aspect-[4/3] md:aspect-[21/9] lg:aspect-[2.5/1] overflow-hidden group">
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent z-10" />
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
              className="max-w-2xl"
            >
              <div className="flex gap-2 mb-4">
                <Badge
                  variant="secondary"
                  className="bg-primary/20 text-primary-foreground hover:bg-primary/30 border-primary/50"
                >
                  {current.ano}
                </Badge>
                <Badge variant="outline" className="border-border">
                  {current.status}
                </Badge>
              </div>

              {/* Tipografia ou título */}
              {current.tipografiaUrl ? (
                <img
                  src={current.tipografiaUrl}
                  alt={current.titulo}
                  className="max-h-20 md:max-h-28 lg:max-h-36 w-auto object-contain mb-4 drop-shadow-2xl"
                  style={{ maxWidth: "480px" }}
                />
              ) : (
                <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 leading-tight drop-shadow-lg">
                  {current.titulo}
                </h2>
              )}

              <p className="text-muted-foreground line-clamp-2 md:line-clamp-3 mb-8 text-sm md:text-base max-w-xl drop-shadow-md">
                {current.sinopse}
              </p>
              <div className="flex gap-4">
                <Button
                  asChild
                  size="lg"
                  className="font-display tracking-wide px-8"
                >
                  <Link href={`/obra/${current.slug}`}>
                    <Play className="mr-2 h-5 w-5" /> Assistir
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="font-display tracking-wide px-8 bg-secondary/80 backdrop-blur"
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
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-background/50 text-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background/80"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-background/50 text-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background/80"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      <div className="absolute bottom-6 right-6 md:right-12 lg:right-20 z-30 flex gap-2">
        {bannerObras.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-2 rounded-full transition-all ${idx === currentIndex ? "w-8 bg-primary" : "w-2 bg-foreground/30 hover:bg-foreground/50"}`}
          />
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h3 className="font-display text-2xl md:text-3xl font-bold tracking-wide mb-6 border-l-4 border-primary pl-4 text-foreground">
      {title}
    </h3>
  );
}

function ObrasRecentes() {
  const { data: obras, isLoading } = useListObrasRecentes();

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-hidden p-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="min-w-[200px] aspect-[2/3] rounded-lg" />
        ))}
      </div>
    );
  }

  if (!Array.isArray(obras) || obras.length === 0) return null;

  return (
    <div className="relative">
      <SectionTitle title="Obras Recentes" />
      <div className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory hide-scrollbar p-1">
        {obras.map((obra, idx) => (
          <motion.div
            key={obra.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="min-w-[160px] md:min-w-[200px] snap-start"
          >
            <Link href={`/obra/${obra.slug}`}>
              <div className="group relative aspect-[2/3] rounded-lg overflow-hidden border border-border bg-card transition-all hover:scale-[1.03] hover:border-primary/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                <img
                  src={
                    obra.capaUrl ||
                    `https://placehold.co/400x600/0F1C2E/1E3A8A?text=${obra.titulo}`
                  }
                  alt={obra.titulo}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                {/* Tipografia overlay no canto inferior */}
                {obra.tipografiaUrl && (
                  <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                    <img
                      src={obra.tipografiaUrl}
                      alt={obra.titulo}
                      className="max-h-10 w-auto object-contain drop-shadow-lg"
                    />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground border-none px-2 py-0.5 text-xs font-bold shadow-md">
                  NOVO
                </Badge>
                <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  {!obra.tipografiaUrl && (
                    <h4 className="font-display font-semibold text-sm md:text-base line-clamp-2">
                      {obra.titulo}
                    </h4>
                  )}
                  <p className="text-xs text-primary font-medium mt-1 truncate">
                    {obra.generos?.[0]}
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

function Top10() {
  const { data: obras, isLoading } = useListTop10Obras();

  if (isLoading) {
    return (
      <div className="space-y-4">
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
              <div className="group flex items-center gap-4 bg-card hover:bg-secondary border border-border p-3 rounded-lg transition-colors relative overflow-hidden">
                <span className="font-display text-5xl md:text-6xl font-black text-foreground/5 italic -ml-2 select-none z-0 absolute left-2">
                  {(index + 1).toString().padStart(2, "0")}
                </span>
                <span className="font-display text-3xl font-black text-primary/80 italic w-12 text-center z-10">
                  {(index + 1).toString().padStart(2, "0")}
                </span>
                <img
                  src={
                    obra.capaUrl ||
                    `https://placehold.co/100x150/0F1C2E/1E3A8A?text=Capa`
                  }
                  alt={obra.titulo}
                  className="w-12 h-16 md:w-16 md:h-24 object-cover rounded-md shadow-sm z-10"
                  loading="lazy"
                />
                <div className="flex-1 min-w-0 z-10">
                  <h4 className="font-medium text-sm md:text-base line-clamp-1 group-hover:text-primary transition-colors">
                    {obra.titulo}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
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
            <Link href={`/obra/${ep.obraId}?ep=${ep.id}`}>
              <div className="group relative rounded-lg overflow-hidden border border-border bg-card hover:border-primary/50 transition-all hover:shadow-[0_0_15px_rgba(59,130,246,0.15)]">
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
                  <Badge className="absolute bottom-2 right-2 bg-background/80 text-foreground backdrop-blur-sm border-none">
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
      className="pb-12"
    >
      <HeroCarousel />
      <div className="container max-w-screen-2xl px-4 py-8 space-y-12">
        <ObrasRecentes />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <EpisodiosRecentes />
          <Top10 />
        </div>
      </div>
    </motion.div>
  );
}
