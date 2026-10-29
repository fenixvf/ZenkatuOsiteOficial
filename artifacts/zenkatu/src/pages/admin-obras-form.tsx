import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useCreateObra,
  useUpdateObra,
  useGetObra,
  useListGeneros,
  getListObrasQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Save, X, Plus, Trash2, Users } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCreateGenero, getListGenerosQueryKey } from "@workspace/api-client-react";
import { CastEditor, type CastMember } from "@/components/cast-editor";
import { ImageUploadField } from "@/components/image-upload";

const obraSchema = z.object({
  titulo: z.string().min(1, "Título é obrigatório"),
  slug: z.string().min(1, "Slug é obrigatório").regex(/^[a-z0-9-]+$/, "Apenas letras minúsculas, números e hifens"),
  sinopse: z.string().min(10, "Sinopse muito curta"),
  status: z.string().min(1, "Status é obrigatório"),
  ano: z.coerce.number().int().min(1900).max(2100),
  nota: z.coerce.number().min(0).max(10).optional().nullable(),
  capaUrl: z.string().min(1, "Envie a imagem da capa"),
  bannerUrl: z.string().min(1, "Envie a imagem do banner"),
  tipografiaUrl: z.string().optional().nullable().or(z.literal("")),
  generos: z.array(z.string()).default([]),
});

type ObraFormValues = z.infer<typeof obraSchema>;

function slugify(text: string) {
  return text.toString().toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

function GeneroMultiSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: generosRaw, refetch } = useListGeneros();
  const generos = Array.isArray(generosRaw) ? generosRaw : [];
  const createGenero = useCreateGenero();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newNome, setNewNome] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const toggle = (nome: string) => {
    if (value.includes(nome)) {
      onChange(value.filter((g) => g !== nome));
    } else {
      onChange([...value, nome]);
    }
  };

  const handleCreateGenero = async () => {
    if (!newNome.trim()) return;
    try {
      setIsCreating(true);
      const created = await createGenero.mutateAsync({ data: { nome: newNome.trim() } });
      queryClient.invalidateQueries({ queryKey: getListGenerosQueryKey() });
      await refetch();
      onChange([...value, created.nome]);
      setNewNome("");
      setShowAddDialog(false);
      toast({ title: `Gênero "${created.nome}" criado e selecionado.` });
    } catch {
      toast({ title: "Erro ao criar gênero", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((g) => (
            <Badge
              key={g}
              variant="secondary"
              className="gap-1.5 pl-3 pr-2 py-1 bg-primary/15 text-primary border-primary/30 hover:bg-primary/20 cursor-pointer"
              onClick={() => toggle(g)}
            >
              {g}
              <X className="w-3 h-3" />
            </Badge>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {generos.map((g) => {
          const selected = value.includes(g.nome);
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => toggle(g.nome)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                selected
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "bg-transparent border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              {g.nome}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setShowAddDialog(true)}
          className="px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-primary/40 text-primary/70 hover:border-primary hover:text-primary transition-all flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Novo gênero
        </button>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-xs bg-card border-border">
          <DialogHeader>
            <DialogTitle>Criar novo gênero</DialogTitle>
          </DialogHeader>
          <Input
            value={newNome}
            onChange={(e) => setNewNome(e.target.value)}
            placeholder="Ex: Isekai, Mecha..."
            className="bg-background border-border"
            maxLength={80}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleCreateGenero(); }
            }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" type="button" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isCreating || !newNome.trim()}
              onClick={handleCreateGenero}
            >
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar e selecionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminObrasForm() {
  const { id } = useParams<{ id?: string }>();
  const isEditing = !!id && id !== "nova";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  const createObra = useCreateObra();
  const updateObra = useUpdateObra();

  const [cast, setCast] = useState<CastMember[]>([]);

  const { data: obra, isLoading } = useGetObra(Number(id), {
    query: { enabled: isEditing, queryKey: ["getObra", Number(id)] as any },
  });

  const form = useForm<ObraFormValues>({
    resolver: zodResolver(obraSchema),
    defaultValues: {
      titulo: "",
      slug: "",
      sinopse: "",
      status: "Em Exibição",
      ano: new Date().getFullYear(),
      nota: null,
      capaUrl: "",
      bannerUrl: "",
      tipografiaUrl: "",
      generos: [],
    },
  });

  useEffect(() => {
    if (obra && isEditing) {
      form.reset({
        titulo: obra.titulo,
        slug: obra.slug,
        sinopse: obra.sinopse,
        status: obra.status,
        ano: obra.ano,
        nota: obra.nota,
        capaUrl: obra.capaUrl,
        bannerUrl: obra.bannerUrl,
        tipografiaUrl: obra.tipografiaUrl || "",
        generos: obra.generos ?? [],
      });
      setCast((obra as any).cast ?? []);
    }
  }, [obra, isEditing, form]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    form.setValue("titulo", val);
    if (!isEditing && !form.formState.dirtyFields.slug) {
      form.setValue("slug", slugify(val), { shouldValidate: true });
    }
  };

  const onSubmit = async (data: ObraFormValues) => {
    try {
      const payload = { ...data, tipografiaUrl: data.tipografiaUrl || null, cast };
      if (isEditing) {
        await updateObra.mutateAsync({
          obraId: Number(id),
          data: { ...payload, callerUid: currentUser?.uid },
        });
        toast({ title: "Obra atualizada com sucesso" });
      } else {
        await createObra.mutateAsync({
          data: { ...payload, ownerId: currentUser?.uid ?? null },
        });
        toast({ title: "Obra criada com sucesso" });
      }
      queryClient.invalidateQueries({ queryKey: getListObrasQueryKey() });
      setLocation("/admin/obras");
    } catch {
      toast({ title: "Erro ao salvar obra", variant: "destructive" });
    }
  };

  if (isEditing && isLoading) {
    return <div className="p-12 text-center text-muted-foreground">Carregando dados...</div>;
  }

  return (
    <div className="container max-w-screen-md mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
        <Button asChild variant="ghost" size="icon" className="rounded-full shrink-0">
          <Link href="/admin/obras">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            {isEditing ? "Editar Obra" : "Nova Obra"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Preencha os detalhes do anime.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 sm:space-y-8 bg-card border border-border p-4 sm:p-6 md:p-8 rounded-xl shadow-lg"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Naruto Shippuden" {...field} onChange={handleTitleChange} className="bg-background" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input placeholder="naruto-shippuden" {...field} className="bg-background font-mono text-sm" />
                  </FormControl>
                  <FormDescription>Usado na URL: /obra/slug</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Em Exibição">Em Exibição</SelectItem>
                      <SelectItem value="Finalizado">Finalizado</SelectItem>
                      <SelectItem value="Em Breve">Em Breve</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ano"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ano de Lançamento</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} className="bg-background" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nota"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nota (0-10)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
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
              name="generos"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Gêneros</FormLabel>
                  <FormControl>
                    <GeneroMultiSelect value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormDescription>Clique nos gêneros para selecionar ou remover.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sinopse"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Sinopse</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="História da obra..."
                      className="min-h-[120px] bg-background resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="border-t border-border pt-6 space-y-6">
            <h3 className="font-display text-xl font-bold">Imagens</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="capaUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capa (Vertical, 2:3)</FormLabel>
                    <FormControl>
                      <ImageUploadField
                        value={field.value || null}
                        onChange={field.onChange}
                        previewClassName="h-32 w-[85px]"
                      />
                    </FormControl>
                    <FormDescription>
                      Convertida para WebP e salva no banco de dados.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bannerUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Banner (Horizontal, 16:9)</FormLabel>
                    <FormControl>
                      <ImageUploadField
                        value={field.value || null}
                        onChange={field.onChange}
                        previewClassName="h-20 w-36"
                      />
                    </FormControl>
                    <FormDescription>
                      Convertida para WebP e salva no banco de dados.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tipografiaUrl"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Tipografia (Opcional)</FormLabel>
                    <FormControl>
                      <ImageUploadField
                        value={field.value || null}
                        onChange={field.onChange}
                        previewClassName="h-16 w-full max-w-[256px]"
                        fit="contain"
                        hint="PNG com fundo transparente, convertido para WebP."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background/40 p-4">
            <p className="text-sm text-muted-foreground">
              A seleção e a ordem do banner são configuradas em{" "}
              <Link href="/admin/config" className="font-medium text-primary hover:underline">
                Configurações do Site
              </Link>
              .
            </p>
          </div>

          <div className="border-t border-border pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="font-display text-xl font-bold">Equipe / Cast</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Adicione os membros responsáveis por esta obra (dubladores, editores, etc.) com links para suas redes sociais.
            </p>
            <CastEditor cast={cast} onChange={setCast} />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-4 pt-4 border-t border-border">
            <Button asChild variant="ghost" className="font-display w-full sm:w-auto">
              <Link href="/admin/obras">Cancelar</Link>
            </Button>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="font-display px-8 w-full sm:w-auto"
            >
              {form.formState.isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isEditing ? "Salvar Alterações" : "Criar Obra"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
