import { useState } from "react";
import { Link } from "wouter";
import { useListObras, useDeleteObra, getListObrasQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, ListVideo } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function AdminObras() {
  const { data: obras = [], isLoading } = useListObras();
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const deleteObra = useDeleteObra();
  const { toast } = useToast();

  const filteredObras = obras.filter(obra => 
    obra.titulo.toLowerCase().includes(search.toLowerCase()) || 
    obra.slug.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: number) => {
    try {
      await deleteObra.mutateAsync({ obraId: id });
      queryClient.invalidateQueries({ queryKey: getListObrasQueryKey() });
      toast({ title: "Obra excluída com sucesso" });
    } catch (e) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  return (
    <div className="container max-w-screen-xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Gerenciar Obras</h1>
          <p className="text-muted-foreground mt-1">Catálogo completo de animes da plataforma.</p>
        </div>
        <Button asChild className="font-display tracking-wide">
          <Link href="/admin/obras/nova">
            <Plus className="w-4 h-4 mr-2" /> Nova Obra
          </Link>
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-card/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar obras..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background border-border"
            />
          </div>
          <div className="text-sm text-muted-foreground font-medium">
            {filteredObras.length} obras encontradas
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/50">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-[80px]">Capa</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Eps</TableHead>
                <TableHead>Views</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Carregando catálogo...
                  </TableCell>
                </TableRow>
              ) : filteredObras.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Nenhuma obra encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filteredObras.map((obra) => (
                  <TableRow key={obra.id} className="border-border hover:bg-secondary/30 transition-colors">
                    <TableCell>
                      <div className="w-12 h-16 rounded overflow-hidden bg-black/50 border border-border">
                        <img 
                          src={obra.capaUrl || `https://placehold.co/100x150/0F1C2E/1E3A8A`} 
                          alt={obra.titulo}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-foreground">{obra.titulo}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-1">{obra.slug}</div>
                      {obra.showInBanner && (
                        <Badge variant="outline" className="mt-2 text-[10px] bg-primary/10 border-primary/20 text-primary">Destaque Banner</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-card border border-border">
                        {obra.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">{obra.totalEps || '?'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">{obra.views || 0}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                          <Link href={`/admin/episodios/${obra.id}`} title="Gerenciar Episódios">
                            <ListVideo className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <Link href={`/admin/obras/${obra.id}`} title="Editar Obra">
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-card border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir obra?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir <strong>{obra.titulo}</strong>? Esta ação removerá a obra e todos os seus episódios e comentários permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-transparent border-border">Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(obra.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Sim, excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
