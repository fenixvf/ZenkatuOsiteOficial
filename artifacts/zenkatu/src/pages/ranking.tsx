import { useListTop10Obras } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { TrendingUp, Play, Star, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function Ranking() {
  const { data: obrasRaw, isLoading } = useListTop10Obras();
  const obras = Array.isArray(obrasRaw) ? obrasRaw : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container max-w-screen-xl mx-auto px-4 py-10"
    >
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/15 text-primary">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Ranking — Mais Assistidos
          </h1>
        </div>
        <p className="text-muted-foreground ml-14">
          As obras mais populares da plataforma, ordenadas por visualizações.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : obras.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-border rounded-xl text-muted-foreground">
          <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma obra com visualizações ainda.</p>
          <p className="text-sm mt-1">
            Assim que as obras começarem a ser assistidas, o ranking será exibido aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {obras.map((obra, index) => (
            <motion.div
              key={obra.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.06 }}
            >
              <Link href={`/obra/${obra.slug}`}>
                <div className="group flex items-center gap-4 bg-card border border-border hover:border-primary/40 hover:bg-card/80 rounded-xl p-4 transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] relative overflow-hidden">
                  {/* Número de fundo decorativo */}
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-display text-8xl font-black text-foreground/[0.04] select-none pointer-events-none">
                    {(index + 1).toString().padStart(2, "0")}
                  </span>

                  {/* Posição */}
                  <div className="w-12 shrink-0 text-center">
                    {index === 0 && (
                      <span className="font-display text-3xl font-black text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]">
                        01
                      </span>
                    )}
                    {index === 1 && (
                      <span className="font-display text-3xl font-black text-slate-300 drop-shadow-[0_0_8px_rgba(148,163,184,0.6)]">
                        02
                      </span>
                    )}
                    {index === 2 && (
                      <span className="font-display text-3xl font-black text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]">
                        03
                      </span>
                    )}
                    {index > 2 && (
                      <span className="font-display text-2xl font-bold text-muted-foreground/60">
                        {(index + 1).toString().padStart(2, "0")}
                      </span>
                    )}
                  </div>

                  {/* Capa */}
                  <div className="w-14 h-20 rounded-lg overflow-hidden shrink-0 border border-border/50 bg-secondary">
                    <img
                      src={
                        obra.capaUrl ||
                        `https://placehold.co/100x150/0F1C2E/1E3A8A?text=?`
                      }
                      alt={obra.titulo}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-base md:text-lg group-hover:text-primary transition-colors line-clamp-1">
                      {obra.titulo}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <Badge
                        variant="secondary"
                        className="text-xs bg-secondary/70"
                      >
                        {obra.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {obra.ano}
                      </span>
                      {obra.nota && (
                        <span className="flex items-center gap-1 text-xs text-yellow-500">
                          <Star className="w-3 h-3 fill-yellow-500" />
                          {obra.nota}/10
                        </span>
                      )}
                    </div>
                    {obra.generos && obra.generos.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {obra.generos.slice(0, 3).map((g) => (
                          <span
                            key={g}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary/80 border border-primary/20"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Views */}
                  <div className="shrink-0 text-right flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Eye className="w-4 h-4" />
                      <span className="font-mono font-semibold text-sm">
                        {(obra.views || 0).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs gap-1 text-primary hover:bg-primary/10 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Play className="w-3 h-3" /> Assistir
                    </Button>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
