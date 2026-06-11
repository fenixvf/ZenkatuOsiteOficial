import { useListGeneros } from "@workspace/api-client-react";
import { useListObras } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Tags } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Generos() {
  const { data: generosRaw, isLoading: loadingGeneros } = useListGeneros();
  const { data: obrasRaw } = useListObras();

  const generos = Array.isArray(generosRaw) ? generosRaw : [];
  const obras = Array.isArray(obrasRaw) ? obrasRaw : [];

  const generoCount = (slug: string) =>
    obras.filter((o) => o.generos?.some((g) => slugify(g) === slug)).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container max-w-screen-xl mx-auto px-4 py-10"
    >
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/15 text-primary">
            <Tags className="w-6 h-6" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">Explorar por Gênero</h1>
        </div>
        <p className="text-muted-foreground ml-14">Encontre animes pelo estilo que você gosta.</p>
      </div>

      {loadingGeneros ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : generos.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border-2 border-dashed border-border rounded-xl">
          <Tags className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum gênero cadastrado ainda.</p>
          <p className="text-sm mt-1">O administrador pode adicionar gêneros no painel admin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {generos.map((g, i) => {
            const count = generoCount(g.slug);
            return (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link href={`/genero/${g.slug}`}>
                  <div className="group relative h-24 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-1 p-4 text-center">
                    <span className="font-display font-bold text-base group-hover:text-primary transition-colors leading-tight">
                      {g.nome}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {count} {count === 1 ? "obra" : "obras"}
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
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
