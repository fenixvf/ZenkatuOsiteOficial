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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Save,
  Film,
  BookOpen,
  ExternalLink,
  Youtube,
  Link2,
  Code2,
  HardDriveUpload,
  X,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";

const episodioSchema = z.object({
  temporada: z.coerce.number().int().min(1),
  numero: z.coerce.number().int().min(0),
  titulo: z.string().min(1, "Título obrigatório"),
  thumbnailUrl: z.string().url().optional().nullable().or(z.literal("")),
  playerContent: z.string().min(1, "Conteúdo do player obrigatório"),
  publishedAt: z.string(),
});

type EpisodioFormValues = z.infer<typeof episodioSchema>;

type VideoType = "archive" | "stream" | "youtube" | "embed";

const VIDEO_TYPES: { id: VideoType; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "archive", label: "Archive.org", icon: HardDriveUpload, desc: "URL direta de vídeo (MP4, WebM)" },
  { id: "youtube", label: "YouTube", icon: Youtube, desc: "URL ou link incorporado do YouTube" },
  { id: "stream", label: "Stream HLS", icon: Link2, desc: "URL de stream .m3u8" },
  { id: "embed", label: "Código Embed", icon: Code2, desc: "HTML, <iframe> ou outro código" },
];

function getYouTubeEmbedUrl(url: string): string {
  if (url.includes("youtube.com/embed/")) return url;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : url;
}

const ARCHIVE_GUIDE_STEPS = [
  {
    n: "1",
    title: "Crie uma conta gratuita",
    body: 'Acesse archive.org e clique em "Sign Up" no canto superior direito. Preencha e-mail, nome de usuário e senha.',
  },
  {
    n: "2",
    title: 'Clique em "Upload" no menu',
    body: 'Após fazer login, clique no botão "Upload" no topo da página. Você será levado à página de envio.',
  },
  {
    n: "3",
    title: "Selecione o arquivo de vídeo",
    body: 'Arraste o arquivo ou clique em "Browse your computer". O Archive.org aceita MP4, MKV, AVI e outros formatos.',
  },
  {
    n: "4",
    title: "Aguarde o upload e o processamento",
    body: "Dependendo do tamanho, pode levar vários minutos. O Archive.org converte o vídeo automaticamente para MP4.",
  },
  {
    n: "5",
    title: "Abra a página do seu item",
    body: 'Após o processamento, acesse a página do item. Você verá a lista de arquivos abaixo do player.',
  },
  {
    n: "6",
    title: "Copie o link direto do arquivo",
    body: 'Na lista de arquivos, clique com o botão direito no arquivo .mp4 e selecione "Copiar endereço do link". O link começará com https://archive.org/download/...',
  },
  {
    n: "7",
    title: "Cole a URL aqui no portal",
    body: 'Selecione "Archive.org" como tipo de vídeo, cole o link copiado e salve. O player do Zenkatu reproduzirá automaticamente com controles completos!',
  },
];

function ArchiveGuideDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <HardDriveUpload className="w-5 h-5 text-blue-400" />
            Como usar o Archive.org
          </DialogTitle>
          <DialogDescription>
            Passo a passo para fazer upload dos seus episódios gratuitamente e obter a URL do vídeo.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          {ARCHIVE_GUIDE_STEPS.map((step) => (
            <div key={step.n} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-400">{step.n}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-0.5">{step.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}

          <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-blue-300 font-medium mb-1">💡 Dica</p>
            <p className="text-xs text-muted-foreground">
              O Archive.org é gratuito e não tem limite de uploads para conteúdo de domínio público ou de criação própria. Ideal para hospedar episódios de projetos de fandub.
            </p>
          </div>

          <Button
            asChild
            className="w-full gap-2 mt-2"
            variant="outline"
          >
            <a href="https://archive.org" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4" />
              Abrir Archive.org
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VideoTypeSelector({
  selected,
  onChange,
}: {
  selected: VideoType;
  onChange: (t: VideoType) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {VIDEO_TYPES.map((t) => {
        const Icon = t.icon;
        const active = selected === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={[
              "flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all",
              active
                ? "border-blue-500/60 bg-blue-500/10 text-foreground"
                : "border-border bg-background/30 text-muted-foreground hover:border-border/80 hover:text-foreground",
            ].join(" ")}
          >
            <Icon className={["w-4 h-4 mt-0.5 shrink-0", active ? "text-blue-400" : ""].join(" ")} />
            <div>
              <p className="text-xs font-semibold leading-tight">{t.label}</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5 leading-tight">{t.desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function ZenkatuberEpisodios() {
  const { obraId } = useParams<{ obraId: string }>();
  const id = Number(obraId);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: obra, isLoading: loadingObra } = useGetObra(id, {
    query: { enabled: !!id && !isNaN(id), queryKey: getGetObraQueryKey(id) },
  });
  const { data: episodiosRaw, isLoading: loadingEps } = useListObraEpisodios(id, {
    query: { enabled: !!id && !isNaN(id), queryKey: getListObraEpisodiosQueryKey(id) },
  });
  const episodios = Array.isArray(episodiosRaw) ? episodiosRaw : [];

  const createEpisodio = useCreateEpisodio();
  const updateEpisodio = useUpdateEpisodio();
  const deleteEpisodio = useDeleteEpisodio();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEpId, setEditingEpId] = useState<number | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [videoType, setVideoType] = useState<VideoType>("archive");
  const [rawInput, setRawInput] = useState("");

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

  const resolvePlayerContent = (type: VideoType, raw: string): string => {
    const trimmed = raw.trim();
    if (type === "youtube") return getYouTubeEmbedUrl(trimmed);
    return trimmed;
  };

  const handleVideoTypeChange = (t: VideoType) => {
    setVideoType(t);
    if (rawInput.trim()) {
      form.setValue("playerContent", resolvePlayerContent(t, rawInput), { shouldValidate: true });
    }
  };

  const handleRawInputChange = (v: string) => {
    setRawInput(v);
    form.setValue("playerContent", resolvePlayerContent(videoType, v), { shouldValidate: true });
  };

  const openNewModal = () => {
    const maxNum = episodios.length > 0 ? Math.max(...episodios.map((e) => e.numero)) : 0;
    const maxTemp = episodios.length > 0 ? Math.max(...episodios.map((e) => e.temporada)) : 1;
    setEditingEpId(null);
    setVideoType("archive");
    setRawInput("");
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
    const content = ep.playerContent;
    let type: VideoType = "embed";
    if (content.includes("archive.org/download/") || content.includes("archive.org/serve/") || content.endsWith(".mp4") || content.endsWith(".webm") || content.endsWith(".m3u8")) {
      type = content.endsWith(".m3u8") || content.includes(".m3u8?") ? "stream" : "archive";
    } else if (content.includes("youtube.com/") || content.includes("youtu.be/")) {
      type = "youtube";
    } else if (!content.startsWith("<") && !content.includes("\n")) {
      type = "stream";
    }
    setVideoType(type);
    setRawInput(content);
    form.reset({
      temporada: ep.temporada,
      numero: ep.numero,
      titulo: ep.titulo,
      thumbnailUrl: ep.thumbnailUrl || "",
      playerContent: content,
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
        await updateEpisodio.mutateAsync({ episodioId: editingEpId, data: payload });
        toast({ title: "Episódio atualizado" });
      } else {
        await createEpisodio.mutateAsync({ obraId: id, data: payload });
        toast({ title: "Episódio adicionado!" });
      }

      queryClient.invalidateQueries({ queryKey: getListObraEpisodiosQueryKey(id) });
      setIsModalOpen(false);
    } catch (e: any) {
      toast({ title: e?.data?.error || e?.message || "Erro ao salvar episódio", variant: "destructive" });
    }
  };

  const handleDelete = async (epId: number) => {
    try {
      await deleteEpisodio.mutateAsync({ episodioId: epId });
      queryClient.invalidateQueries({ queryKey: getListObraEpisodiosQueryKey(id) });
      toast({ title: "Episódio excluído" });
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  if (loadingObra) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
        Carregando...
      </div>
    );
  }

  if (!obra && !loadingObra) {
    return (
      <div className="container max-w-screen-md mx-auto px-4 py-16 text-center">
        <Film className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
        <h2 className="font-display text-2xl font-bold mb-2">Obra não encontrada</h2>
        <Button asChild variant="outline"><Link href="/meus-projetos">Voltar</Link></Button>
      </div>
    );
  }

  return (
    <div className="container max-w-screen-lg mx-auto px-4 py-8">
      <ArchiveGuideDialog open={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/meus-projetos">
            <ArrowLeft className="w-4 h-4 mr-1" /> Meus Projetos
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-0.5">Episódios</p>
          <h1 className="font-display text-xl font-bold text-foreground truncate">
            {(obra as any)?.titulo}
          </h1>
        </div>
        <div className="flex gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-blue-500/40 text-blue-400 hover:bg-blue-500/10"
            onClick={() => setGuideOpen(true)}
          >
            <BookOpen className="w-4 h-4" />
            Como usar Archive.org
          </Button>
          <Button size="sm" className="gap-2" onClick={openNewModal}>
            <Plus className="w-4 h-4" />
            Novo episódio
          </Button>
        </div>
      </div>

      {/* Episode list */}
      {loadingEps ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : episodios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-2xl">
          <Film className="w-12 h-12 text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground font-medium">Nenhum episódio ainda</p>
          <p className="text-sm text-muted-foreground/60 mt-1 mb-4">
            Faça upload no Archive.org e adicione a URL aqui.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2 text-blue-400 border-blue-500/40 hover:bg-blue-500/10" onClick={() => setGuideOpen(true)}>
              <BookOpen className="w-4 h-4" /> Como usar Archive.org
            </Button>
            <Button size="sm" className="gap-2" onClick={openNewModal}>
              <Plus className="w-4 h-4" /> Adicionar episódio
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground">Ep</TableHead>
                <TableHead className="text-muted-foreground">Título</TableHead>
                <TableHead className="text-muted-foreground hidden sm:table-cell">Temp.</TableHead>
                <TableHead className="text-muted-foreground hidden md:table-cell">Data</TableHead>
                <TableHead className="text-muted-foreground hidden lg:table-cell">Player</TableHead>
                <TableHead className="text-right text-muted-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...episodios]
                .sort((a, b) => a.temporada - b.temporada || a.numero - b.numero)
                .map((ep) => {
                  const content = ep.playerContent ?? "";
                  const isArchive = content.includes("archive.org");
                  const isYoutube = content.includes("youtube.com") || content.includes("youtu.be");
                  const isStream = content.endsWith(".m3u8") || content.includes(".m3u8?");
                  return (
                    <TableRow key={ep.id} className="border-border/50">
                      <TableCell className="font-mono text-sm font-semibold text-foreground">
                        {ep.numero}
                      </TableCell>
                      <TableCell className="text-sm text-foreground max-w-[200px] truncate">
                        {ep.titulo}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className="text-[10px]">T{ep.temporada}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                        {format(new Date(ep.publishedAt), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {isArchive ? (
                          <Badge variant="outline" className="text-[10px] border-orange-500/30 text-orange-400 bg-orange-500/10">Archive.org</Badge>
                        ) : isYoutube ? (
                          <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400 bg-red-500/10">YouTube</Badge>
                        ) : isStream ? (
                          <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-400 bg-purple-500/10">Stream</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Embed</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => openEditModal(ep)}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/10">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-card border-border">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir episódio?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  "{ep.titulo}" será removido permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-transparent border-border">Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(ep.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Episode form dialog */}
      <Dialog open={isModalOpen} onOpenChange={(v) => !v && setIsModalOpen(false)}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEpId ? "Editar Episódio" : "Novo Episódio"}</DialogTitle>
            <DialogDescription>
              {editingEpId ? "Edite os dados do episódio." : `Adicione um novo episódio de ${(obra as any)?.titulo}.`}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Temporada + Numero */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="temporada" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temporada</FormLabel>
                    <FormControl><Input type="number" {...field} className="bg-background" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="numero" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nº do Episódio</FormLabel>
                    <FormControl><Input type="number" {...field} className="bg-background" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Título */}
              <FormField control={form.control} name="titulo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl><Input placeholder="Título do episódio..." {...field} className="bg-background" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Thumbnail */}
              <FormField control={form.control} name="thumbnailUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Thumbnail URL (Opcional, 16:9)</FormLabel>
                  <FormControl><Input placeholder="https://..." {...field} value={field.value || ""} className="bg-background" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Video type selector */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Tipo de vídeo</label>
                  <button
                    type="button"
                    onClick={() => setGuideOpen(true)}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                  >
                    <BookOpen className="w-3 h-3" />
                    Como usar Archive.org
                  </button>
                </div>
                <VideoTypeSelector selected={videoType} onChange={handleVideoTypeChange} />
              </div>

              {/* Video input based on type */}
              <div className="space-y-2">
                {videoType === "archive" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">URL direta do vídeo (Archive.org)</label>
                    <div className="relative">
                      <HardDriveUpload className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="https://archive.org/download/..."
                        value={rawInput}
                        onChange={(e) => handleRawInputChange(e.target.value)}
                        className="pl-9 bg-background font-mono text-xs"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Cole a URL direta (.mp4 ou .webm) do arquivo no Archive.org. O player do Zenkatu será usado automaticamente.
                    </p>
                    {rawInput && !rawInput.includes("archive.org") && (
                      <p className="text-[11px] text-yellow-400">
                        ⚠️ A URL não parece ser do Archive.org, mas funcionará se for um link direto de vídeo.
                      </p>
                    )}
                  </div>
                )}

                {videoType === "youtube" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">URL do YouTube</label>
                    <div className="relative">
                      <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400 pointer-events-none" />
                      <Input
                        placeholder="https://youtube.com/watch?v=... ou https://youtu.be/..."
                        value={rawInput}
                        onChange={(e) => handleRawInputChange(e.target.value)}
                        className="pl-9 bg-background"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Cole o link normal do YouTube (watch) ou o link incorporado (embed). O player padrão do YouTube será exibido.
                    </p>
                  </div>
                )}

                {videoType === "stream" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">URL de stream HLS</label>
                    <div className="relative">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="https://exemplo.com/stream/video.m3u8"
                        value={rawInput}
                        onChange={(e) => handleRawInputChange(e.target.value)}
                        className="pl-9 bg-background font-mono text-xs"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      URL terminando em .m3u8. O player do Zenkatu será usado com suporte a HLS.
                    </p>
                  </div>
                )}

                {videoType === "embed" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Código embed / HTML</label>
                    <Textarea
                      placeholder={'Cole o código <iframe> ou HTML completo aqui...'}
                      value={rawInput}
                      onChange={(e) => handleRawInputChange(e.target.value)}
                      className="font-mono text-xs min-h-[90px] bg-background resize-y"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Aceita código &lt;iframe&gt;, HTML completo ou qualquer URL de player externo.
                    </p>
                  </div>
                )}

                {/* Hidden playerContent field for validation */}
                <FormField control={form.control} name="playerContent" render={() => (
                  <FormItem className="hidden">
                    <FormControl><Input {...form.register("playerContent")} /></FormControl>
                    <FormMessage className="block not-hidden text-[11px] mt-1" />
                  </FormItem>
                )} />
                {form.formState.errors.playerContent && (
                  <p className="text-[11px] text-destructive">{form.formState.errors.playerContent.message}</p>
                )}
              </div>

              {/* Data de publicação */}
              <FormField control={form.control} name="publishedAt" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Publicação</FormLabel>
                  <FormControl><Input type="datetime-local" {...field} className="bg-background" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting} className="gap-2">
                  {form.formState.isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
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
