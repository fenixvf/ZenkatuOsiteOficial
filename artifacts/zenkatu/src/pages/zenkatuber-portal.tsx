import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Loader2,
  Pencil,
  Film,
  Search,
  BadgeCheck,
  ListVideo,
  Trash2,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const API_BASE = "/api";

const STATUS_COLORS: Record<string, string> = {
  "Em Exibição": "border-green-500/30 text-green-400 bg-green-500/10",
  "Finalizado": "border-blue-500/30 text-blue-400 bg-blue-500/10",
  "Em Hiato": "border-yellow-500/30 text-yellow-400 bg-yellow-500/10",
  "Cancelado": "border-red-500/30 text-red-400 bg-red-500/10",
};

export default function ZenkatuberPortal() {
  const { currentUser, isZenkatuber, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [obras, setObras] = useState<any[]>([]);
  const [obrasLoading, setObrasLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && (!currentUser || !isZenkatuber)) setLocation("/");
  }, [loading, currentUser, isZenkatuber, setLocation]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    fetch(`${API_BASE}/obras/por-dono/${currentUser.uid}`)
      .then((r) => r.json())
      .then((data) => setObras(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setObrasLoading(false));
  }, [currentUser?.uid]);

  const handleDelete = async (id: number, titulo: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`${API_BASE}/obras/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callerUid: currentUser?.uid }),
      });
      if (res.ok) {
        setObras((prev) => prev.filter((o) => o.id !== id));
        toast({ title: `"${titulo}" removida.` });
      } else {
        const data = await res.json();
        toast({ title: data.error || "Erro ao remover obra", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao remover obra", variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filtered = obras.filter(
    (o) =>
      !search ||
      o.titulo?.toLowerCase().includes(search.toLowerCase()) ||
      o.slug?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <BadgeCheck className="w-7 h-7 text-blue-400" />
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Meus Projetos</h1>
          <p className="text-muted-foreground mt-0.5">Gerencie suas obras e episódios.</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {!obrasLoading && (
            <span className={[
              "text-xs font-medium px-2.5 py-1 rounded-full border",
              obras.length >= 10
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : obras.length >= 8
                ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                : "bg-secondary border-border text-muted-foreground",
            ].join(" ")}>
              {obras.length}/10 projetos
            </span>
          )}
          {obras.length >= 10 ? (
            <Button disabled className="gap-2 opacity-50 cursor-not-allowed">
              <Plus className="w-4 h-4" /> Nova obra
            </Button>
          ) : (
            <Button asChild className="gap-2">
              <Link href="/meus-projetos/nova">
                <Plus className="w-4 h-4" /> Nova obra
              </Link>
            </Button>
          )}
        </div>
      </div>

      {obras.length >= 10 && (
        <div className="mb-6 flex items-center gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Você atingiu o limite de <strong>10 projetos</strong>. Remova um projeto para criar um novo.</span>
        </div>
      )}

      {/* Barra de pesquisa */}
      {obras.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar nas suas obras..."
            className="pl-9 bg-secondary/30 border-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {obrasLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-2xl">
          <Film className="w-12 h-12 text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground font-medium">
            {search ? "Nenhuma obra encontrada" : "Você ainda não tem projetos"}
          </p>
          {!search && (
            <Button asChild className="mt-4 gap-2" variant="outline">
              <Link href="/meus-projetos/nova">
                <Plus className="w-4 h-4" /> Criar primeiro projeto
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {filtered.map((obra, i) => (
              <motion.div
                key={obra.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.04 }}
                className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:border-border/80 transition-colors"
              >
                <div className="flex items-start gap-4 p-4">
                  {obra.capaUrl ? (
                    <img
                      src={obra.capaUrl}
                      alt={obra.titulo}
                      className="w-14 h-20 rounded-xl object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-20 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                      <Film className="w-6 h-6 text-muted-foreground/30" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-foreground text-base line-clamp-1">{obra.titulo}</span>
                      {obra.status && (
                        <Badge variant="outline" className={["text-[10px] px-1.5 py-0", STATUS_COLORS[obra.status] ?? "border-border text-muted-foreground"].join(" ")}>
                          {obra.status}
                        </Badge>
                      )}
                    </div>
                    {obra.ano && (
                      <p className="text-xs text-muted-foreground mb-2">{obra.ano}</p>
                    )}
                    {obra.sinopse && (
                      <p className="text-xs text-muted-foreground/70 line-clamp-2 leading-relaxed">
                        {obra.sinopse}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/40 mt-2">
                      Atualizado em {format(new Date(obra.updatedAt || obra.createdAt || Date.now()), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <Button asChild size="sm" variant="outline" className="gap-1.5 h-8 text-xs">
                      <Link href={`/obra/${obra.slug}`}>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="gap-1.5 h-8 text-xs">
                      <Link href={`/meus-projetos/${obra.id}`}>
                        <Pencil className="w-3.5 h-3.5" />
                        Editar
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="gap-1.5 h-8 text-xs">
                      <Link href={`/meus-projetos/${obra.id}/episodios`}>
                        <ListVideo className="w-3.5 h-3.5" />
                        Eps
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 h-8 text-xs border-red-500/40 text-red-400 hover:bg-red-500/10"
                          disabled={deleting === obra.id}
                        >
                          {deleting === obra.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover "{obra.titulo}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            A obra e todos os episódios serão removidos permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-transparent border-border">Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(obra.id, obra.titulo)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
