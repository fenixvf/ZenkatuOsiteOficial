import { useParams } from "wouter";
import { useListGeneros, useListObras } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Tags } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function GeneroDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: generosRaw, isLoading: loadingGeneros } = useListGeneros();
  const { data: obrasRaw, isLoading: loadingObras } = useListObras();

  const generos = Array.isArray(generosRaw) ? generosRaw : [];
  const obras = Array.isArray(obrasRaw) ? obrasRaw : [];

  const genero = generos.find((g) => g.slug === slug);

  const filtered = obras.filter((o) =>
    o.generos?.some((g) => slugify(g) === slug),
  );

  const isLoading = loadingGeneros || loadingObras;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container max-w-screen-xl mx-auto px-4 py-10"
    >
      <div className="flex items-center gap-3 mb-8">
        <Button asChild variant="ghost" size="icon" className="rounded-full shrink-0">
          <Link href="/generos">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/15 text-primary">
            <Tags className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              {genero?.nome ?? slug}
            </h1>
            {!isLoading && (
              <p className="text-muted-foreground text-sm mt-0.5">
                {filtered.length} {filtered.length === 1 ? "obra encontrada" : "obras encontradas"}
              </p>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border-2 border-dashed border-border rounded-xl">
          <Tags className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma obra encontrada para este gênero.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((obra, idx) => (
            <motion.div
              key={obra.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link href={`/obra/${obra.slug}`}>
                <div className="group relative aspect-[2/3] rounded-lg overflow-hidden border border-border bg-card hover:scale-[1.03] hover:border-primary/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.25)] transition-all">
                  <img
                    src={obra.capaUrl || `https://placehold.co/400x600/0F1C2E/1E3A8A?text=${obra.titulo}`}
                    alt={obra.titulo}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80 pointer-events-none" />
                  <div className="absolute bottom-0 left-0 right-0 px-2 pb-2">
                    {obra.tipografiaUrl ? (
                      <img
                        src={obra.tipografiaUrl}
                        alt={obra.titulo}
                        className="max-h-9 w-auto object-contain drop-shadow-lg"
                      />
                    ) : (
                      <h4 className="font-display font-semibold text-sm line-clamp-2 drop-shadow">{obra.titulo}</h4>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                    <div className="flex flex-wrap gap-1 mt-7">
                      <Badge className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-none">
                        {obra.status}
                      </Badge>
                    </div>
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

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}
