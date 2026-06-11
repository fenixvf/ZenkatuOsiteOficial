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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Save, X } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const obraSchema = z.object({
  titulo: z.string().min(1, "Título é obrigatório"),
  slug: z.string().min(1, "Slug é obrigatório").regex(/^[a-z0-9-]+$/, "Apenas letras minúsculas, números e hifens"),
  sinopse: z.string().min(10, "Sinopse muito curta"),
  status: z.string().min(1, "Status é obrigatório"),
  ano: z.coerce.number().int().min(1900).max(2100),
  nota: z.coerce.number().min(0).max(10).optional().nullable(),
  totalEps: z.coerce.number().int().min(0).optional().nullable(),
  capaUrl: z.string().url("URL inválida"),
  bannerUrl: z.string().url("URL inválida"),
  tipografiaUrl: z.string().url("URL inválida").optional().nullable().or(z.literal("")),
  showInBanner: z.boolean().default(false),
  bannerOrder: z.coerce.number().int().optional().nullable(),
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
  const { data: generosRaw } = useListGeneros();
  const generos = Array.isArray(generosRaw) ? generosRaw : [];

  const toggle = (nome: string) => {
    if (value.includes(nome)) {
      onChange(value.filter((g) => g !== nome));
    } else {
      onChange([...value, nome]);
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
      {generos.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          Nenhum gênero cadastrado.{" "}
          <Link href="/admin/generos" className="text-primary underline">
            Adicione gêneros no painel de gêneros.
          </Link>
        </p>
      ) : (
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
        </div>
      )}
    </div>
  );
}

export default function AdminObrasForm() {
  const { id } = useParams<{ id?: string }>();
  const isEditing = !!id && id !== "nova";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createObra = useCreateObra();
  const updateObra = useUpdateObra();

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
      totalEps: null,
      capaUrl: "",
      bannerUrl: "",
      tipografiaUrl: "",
      showInBanner: false,
      bannerOrder: 0,
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
        totalEps: obra.totalEps,
        capaUrl: obra.capaUrl,
        bannerUrl: obra.bannerUrl,
        tipografiaUrl: obra.tipografiaUrl || "",
        showInBanner: obra.showInBanner,
        bannerOrder: obra.bannerOrder,
        generos: obra.generos ?? [],
      });
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
      const payload = { ...data, tipografiaUrl: data.tipografiaUrl || null };
      if (isEditing) {
        await updateObra.mutateAsync({ obraId: Number(id), data: payload });
        toast({ title: "Obra atualizada com sucesso" });
      } else {
        await createObra.mutateAsync({ data: payload });
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
      <div className="flex items-center gap-4 mb-8">
        <Button asChild variant="ghost" size="icon" className="rounded-full">
          <Link href="/admin/obras">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            {isEditing ? "Editar Obra" : "Nova Obra"}
          </h1>
          <p className="text-muted-foreground mt-1">Preencha os detalhes do anime.</p>
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8 bg-card border border-border p-6 sm:p-8 rounded-xl shadow-lg"
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
              name="totalEps"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total de Episódios</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Deixe vazio se em exibição"
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
                    <FormLabel>Capa URL (Vertical, 2:3)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} className="bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bannerUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Banner URL (Horizontal, 16:9)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} className="bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tipografiaUrl"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Tipografia URL (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} value={field.value || ""} className="bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="border-t border-border pt-6 space-y-6">
            <h3 className="font-display text-xl font-bold">Destaque</h3>
            <FormField
              control={form.control}
              name="showInBanner"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-border bg-background p-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Exibir no Carrossel Principal</FormLabel>
                    <FormDescription>
                      A obra aparecerá no grande banner na página inicial.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            {form.watch("showInBanner") && (
              <FormField
                control={form.control}
                name="bannerOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ordem no Carrossel (Opcional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value || ""}
                        className="bg-background w-32"
                      />
                    </FormControl>
                    <FormDescription>Menor número aparece primeiro.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-border">
            <Button asChild variant="ghost" className="font-display">
              <Link href="/admin/obras">Cancelar</Link>
            </Button>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="font-display px-8"
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
