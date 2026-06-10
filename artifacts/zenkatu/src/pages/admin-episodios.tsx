import { useState } from "react";
import { useParams, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useGetObra,
  useListObraEpisodios,
  useCreateEpisodio,
  useUpdateEpisodio,
  useDeleteEpisodio,
  getListObraEpisodiosQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Edit, Trash2, Loader2, Save } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const episodioSchema = z.object({
  temporada: z.coerce.number().int().min(1),
  numero: z.coerce.number().int().min(0),
  titulo: z.string().min(1, "Título obrigatório"),
  thumbnailUrl: z.string().url().optional().nullable().or(z.literal("")),
  playerContent: z.string().min(1, "Conteúdo do player obrigatório"),
  publishedAt: z.string()
});

type EpisodioFormValues = z.infer<typeof episodioSchema>;

export default function AdminEpisodios() {
  const { obraId } = useParams<{ obraId: string }>();
  const id = Number(obraId);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: obra, isLoading: loadingObra } = useGetObra(id, { query: { enabled: !!id } });
  const { data: episodiosRaw, isLoading: loadingEps } = useListObraEpisodios(id, { query: { enabled: !!id } });
  const episodios = Array.isArray(episodiosRaw) ? episodiosRaw : [];

  const createEpisodio = useCreateEpisodio();
  const updateEpisodio = useUpdateEpisodio();
  const deleteEpisodio = useDeleteEpisodio();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEpId, setEditingEpId] = useState<number | null>(null);

  const form = useForm<EpisodioFormValues>({
    resolver: zodResolver(episodioSchema),
    defaultValues: {
      temporada: 1,
      numero: 1,
      titulo: "",
      thumbnailUrl: "",
      playerContent: "",
      publishedAt: format(new Date(), "yyyy-MM-dd'T'HH:mm")
    }
  });

  const openNewModal = () => {
    // Auto increment number based on existing
    const maxNum = episodios.length > 0 ? Math.max(...episodios.map(e => e.numero)) : 0;
    const maxTemp = episodios.length > 0 ? Math.max(...episodios.map(e => e.temporada)) : 1;
    
    setEditingEpId(null);
    form.reset({
      temporada: maxTemp,
      numero: maxNum + 1,
      titulo: `Episódio ${maxNum + 1}`,
      thumbnailUrl: "",
      playerContent: "",
      publishedAt: format(new Date(), "yyyy-MM-dd'T'HH:mm")
    });
    setIsModalOpen(true);
  };

  const openEditModal = (ep: any) => {
    setEditingEpId(ep.id);
    form.reset({
      temporada: ep.temporada,
      numero: ep.numero,
      titulo: ep.titulo,
      thumbnailUrl: ep.thumbnailUrl || "",
      playerContent: ep.playerContent,
      publishedAt: format(new Date(ep.publishedAt), "yyyy-MM-dd'T'HH:mm")
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: EpisodioFormValues) => {
    try {
      const payload = {
        ...data,
        publishedAt: new Date(data.publishedAt).toISOString(),
        thumbnailUrl: data.thumbnailUrl || null
      };

      if (editingEpId) {
        await updateEpisodio.mutateAsync({
          episodioId: editingEpId,
          data: payload
        });
        toast({ title: "Episódio atualizado" });
      } else {
        await createEpisodio.mutateAsync({
          data: {
            ...payload,
            obraId: id
          } as any // obraId goes in input type on backend
        });
        toast({ title: "Episódio adicionado" });
      }
      
      queryClient.invalidateQueries({ queryKey: getListObraEpisodiosQueryKey(id) });
      setIsModalOpen(false);
    } catch (e) {
      toast({ title: "Erro ao salvar episódio", variant: "destructive" });
    }
  };

  const handleDelete = async (epId: number) => {
    if (!confirm("Tem certeza que deseja excluir este episódio?")) return;
    try {
      await deleteEpisodio.mutateAsync({ episodioId: epId });
      queryClient.invalidateQueries({ queryKey: getListObraEpisodiosQueryKey(id) });
      toast({ title: "Episódio excluído" });
    } catch (e) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  if (loadingObra) {
    return <div className="p-12 text-center text-muted-foreground">Carregando dados...</div>;
  }

  return (
    <div className="container max-w-screen-xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="rounded-full">
            <Link href="/admin/obras"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Episódios</h1>
            <p className="text-primary font-medium mt-1">{obra?.titulo}</p>
          </div>
        </div>
        <Button onClick={openNewModal} className="font-display tracking-wide">
          <Plus className="w-4 h-4 mr-2" /> Adicionar Episódio
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/50">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-[100px]">Temp/Ep</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Lançamento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingEps ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Carregando episódios...
                  </TableCell>
                </TableRow>
              ) : episodios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Nenhum episódio cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                episodios.sort((a, b) => {
                  if (a.temporada !== b.temporada) return a.temporada - b.temporada;
                  return a.numero - b.numero;
                }).map((ep) => (
                  <TableRow key={ep.id} className="border-border hover:bg-secondary/30 transition-colors">
                    <TableCell>
                      <Badge variant="outline" className="font-mono bg-background">
                        T{ep.temporada} E{ep.numero}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-foreground">{ep.titulo}</div>
                      <div className="text-xs text-muted-foreground mt-1 truncate max-w-md font-mono opacity-60">
                        {ep.playerContent}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {format(new Date(ep.publishedAt), "dd/MM/yyyy HH:mm")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button onClick={() => openEditModal(ep)} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => handleDelete(ep.id)} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-primary">
              {editingEpId ? "Editar Episódio" : "Novo Episódio"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do episódio.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="temporada"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temporada</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="numero"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número do Episódio</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="titulo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input placeholder="Título do ep..." {...field} className="bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="thumbnailUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thumbnail URL (Opcional, 16:9)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} value={field.value || ''} className="bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="playerContent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conteúdo do Player</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Cole aqui: URL direta (.mp4/.m3u8), código <iframe>, ou HTML embed..."
                        className="font-mono text-xs min-h-[100px] bg-background resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      URL .mp4, .m3u8, src do iframe ou código HTML completo.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="publishedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Publicação</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} className="bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting} className="font-display">
                  {form.formState.isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Salvar
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
