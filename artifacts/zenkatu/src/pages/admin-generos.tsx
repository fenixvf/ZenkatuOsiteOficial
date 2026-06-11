import { useState } from "react";
import { useListGeneros, useCreateGenero, useDeleteGenero, getListGenerosQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Tags, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function AdminGeneros() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: generosRaw, isLoading } = useListGeneros();
  const generos = Array.isArray(generosRaw) ? generosRaw : [];

  const createGenero = useCreateGenero();
  const deleteGenero = useDeleteGenero();

  const [nome, setNome] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    try {
      setIsAdding(true);
      await createGenero.mutateAsync({ data: { nome: nome.trim() } });
      queryClient.invalidateQueries({ queryKey: getListGenerosQueryKey() });
      setNome("");
      toast({ title: "Gênero adicionado", description: `"${nome.trim()}" foi criado com sucesso.` });
    } catch (err: any) {
      const msg = err?.data?.error || err?.message || "Erro ao criar gênero";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: number, nome: string) => {
    try {
      await deleteGenero.mutateAsync({ generoId: id });
      queryClient.invalidateQueries({ queryKey: getListGenerosQueryKey() });
      toast({ title: "Gênero removido", description: `"${nome}" foi excluído.` });
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  return (
    <div className="container max-w-screen-md mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-primary/15 text-primary">
            <Tags className="w-5 h-5" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">Gerenciar Gêneros</h1>
        </div>
        <p className="text-muted-foreground ml-14">
          Adicione ou remova gêneros disponíveis no catálogo.
        </p>
      </div>

      <Card className="border-border bg-card/50 mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Adicionar Novo Gênero</CardTitle>
          <CardDescription>O slug será gerado automaticamente a partir do nome.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex gap-3">
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Isekai, Shounen, Cyberpunk..."
              className="bg-background border-border"
              maxLength={80}
            />
            <Button type="submit" disabled={isAdding || !nome.trim()} className="shrink-0">
              {isAdding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/50">
        <CardHeader>
          <CardTitle className="text-lg">
            Gêneros Cadastrados
            <Badge variant="secondary" className="ml-2 font-mono">{generos.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : generos.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground border-2 border-dashed border-border rounded-lg">
              <Tags className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Nenhum gênero cadastrado ainda.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {generos.map((g, i) => (
                <motion.div
                  key={g.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-secondary/50 text-sm font-medium group hover:border-destructive/50 transition-colors"
                >
                  <span>{g.nome}</span>
                  <span className="text-muted-foreground/50 font-mono text-xs">/{g.slug}</span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="ml-1 text-muted-foreground/40 hover:text-destructive transition-colors rounded-full">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-border">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir gênero?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir <strong>{g.nome}</strong>? As obras que
                          usam esse gênero não serão afetadas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-border">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(g.id, g.nome)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
