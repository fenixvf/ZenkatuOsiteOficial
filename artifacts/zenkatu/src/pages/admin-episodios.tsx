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
  getListObraEpisodiosQueryKey,
  getGetObraQueryKey,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Save,
  Film,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const episodioSchema = z.object({
  temporada: z.coerce.number().int().min(1),
  numero: z.coerce.number().int().min(0),
  titulo: z.string().min(1, "Título obrigatório"),
  thumbnailUrl: z.string().url().optional().nullable().or(z.literal("")),
  playerContent: z.string().min(1, "Conteúdo do player obrigatório"),
  publishedAt: z.string(),
});

type EpisodioFormValues = z.infer<typeof episodioSchema>;

export default function AdminEpisodios() {
  const { obraId } = useParams<{ obraId: string }>();
  const id = Number(obraId);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: obra, isLoading: loadingObra } = useGetObra(id, {
    query: {
      enabled: !!id && !isNaN(id),
      queryKey: getGetObraQueryKey(id),
    },
  });

  const { data: episodiosRaw, isLoading: loadingEps } = useListObraEpisodios(id, {
    query: {
      enabled: !!id && !isNaN(id),
      queryKey: getListObraEpisodiosQueryKey(id),
    },
  });
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
      publishedAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    },
  });

  const openNewModal = () => {
    const maxNum =
      episodios.length > 0 ? Math.max(...episodios.map((e) => e.numero)) : 0;
    const maxTemp =
      episodios.length > 0 ? Math.max(...episodios.map((e) => e.temporada)) : 1;
    setEditingEpId(null);
    form.reset({
      temporada: maxTemp,
      numero: maxNum + 1,
      titulo: `Episódio ${maxNum + 1}`,
      thumbnailUrl: "",
      playerContent: "",
      publishedAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    });
    setIsModalOpen(true);
  };

  const openEditModal = (ep: NonNullable<typeof episodiosRaw>[number]) => {
    setEditingEpId(ep.id);
    form.reset({
      temporada: ep.temporada,
      numero: ep.numero,
      titulo: ep.titulo,
      thumbnailUrl: ep.thumbnailUrl || "",
      playerContent: ep.playerContent,
      publishedAt: format(new Date(ep.publishedAt), "yyyy-MM-dd'T'HH:mm"),
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: EpisodioFormValues) => {
    try {
      const payload = {
        temporada: data.temporada,
        numero: data.numero,
        titulo: data.titulo,
        playerContent: data.playerContent,
        publishedAt: new Date(data.publishedAt).toISOString(),
        thumbnailUrl: data.thumbnailUrl || null,
      };

      if (editingEpId) {
        await updateEpisodio.mutateAsync({
          episodioId: editingEpId,
          data: payload,
        });
        toast({ title: "Episódio atualizado" });
      } else {
        await createEpisodio.mutateAsync({
          obraId: id,
          data: payload,
        });
        toast({ title: "Episódio adicionado" });
      }

      queryClient.invalidateQueries({
        queryKey: getListObraEpisodiosQueryKey(id),
      });
      setIsModalOpen(false);
    } catch (e: any) {
      const msg = e?.data?.error || e?.message || "Erro ao salvar episódio";
      toast({ title: msg, variant: "destructive" });
    }
  };

  const handleDelete = async (epId: number) => {
    try {
      await deleteEpisodio.mutateAsync({ episodioId: epId });
      queryClient.invalidateQueries({
        queryKey: getListObraEpisodiosQueryKey(id),
      });
      toast({ title: "Episódio excluído" });
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  if (loadingObra) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
        Carregando dados...
      </div>
    );
  }

  if (!obra && !loadingObra) {
    return (
      <div className="container max-w-screen-md mx-auto px-4 py-16 text-center">
        <div className="border-2 border-dashed border-border rounded-xl p-12">
          <Film className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
          <h2 className="font-display text-2xl font-bold mb-2">Obra não encontrada</h2>
          <p className="text-muted-foreground mb-6">
            Não foi possível encontrar a obra com ID <code className="bg-secondary px-1 rounded">{obraId}</code>.
          </p>
          <Button asChild>
            <Link href="/admin/obras">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Obras
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-screen-xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="rounded-full">
            <Link href="/admin/obras">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Episódios
            </h1>
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
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1" />
                    Carregando episódios...
                  </TableCell>
                </TableRow>
              ) : episodios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-40 text-center">
                    <div className="flex flex-col items-center gap-3 py-6">
                      <Film className="w-10 h-10 text-muted-foreground/30" />
                      <p className="text-muted-foreground font-medium">
                        Nenhum episódio cadastrado ainda.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={openNewModal}
                        className="mt-1"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Adicionar primeiro episódio
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                [...episodios]
                  .sort((a, b) => {
                    if (a.temporada !== b.temporada)
                      return a.temporada - b.temporada;
                    return a.numero - b.numero;
                  })
                  .map((ep) => (
                    <TableRow
                      key={ep.id}
                      className="border-border hover:bg-secondary/30 transition-colors"
                    >
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="font-mono bg-background"
                        >
                          T{ep.temporada} E{ep.numero}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-foreground">
                          {ep.titulo}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 truncate max-w-md font-mono opacity-60">
                          {ep.playerContent}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {format(
                            new Date(ep.publishedAt),
                            "dd/MM/yyyy HH:mm",
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            onClick={() => openEditModal(ep)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-card border-border">
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Excluir episódio?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir{" "}
                                  <strong>{ep.titulo}</strong>? Esta ação não
                                  pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-transparent border-border">
                                  Cancelar
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(ep.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-primary">
              {editingEpId ? "Editar Episódio" : "Novo Episódio"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do episódio de{" "}
              <strong>{obra?.titulo}</strong>.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="temporada"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temporada</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          className="bg-background"
                        />
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
                        <Input
                          type="number"
                          {...field}
                          className="bg-background"
                        />
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
                      <Input
                        placeholder="Título do episódio..."
                        {...field}
                        className="bg-background"
                      />
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
                      <Input
                        placeholder="https://..."
                        {...field}
                        value={field.value || ""}
                        className="bg-background"
                      />
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
                      <Input
                        type="datetime-local"
                        {...field}
                        className="bg-background"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="font-display"
                >
                  {form.formState.isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
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
