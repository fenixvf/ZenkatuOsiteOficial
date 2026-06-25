import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Save, X } from "lucide-react";

const API_BASE = "/api";

const STATUS_OPTIONS = ["Em Exibição", "Finalizado", "Em Hiato", "Cancelado"];

const schema = z.object({
  titulo: z.string().min(1, "Título é obrigatório"),
  slug: z
    .string()
    .min(1, "Slug é obrigatório")
    .regex(/^[a-z0-9-]+$/, "Apenas letras minúsculas, números e hifens"),
  sinopse: z.string().min(10, "Sinopse muito curta"),
  status: z.string().min(1, "Status é obrigatório"),
  ano: z.coerce.number().int().min(1900).max(2100),
  nota: z.coerce.number().min(0).max(10).optional().nullable().or(z.literal("")),
  totalEps: z.coerce.number().int().min(0).optional().nullable().or(z.literal("")),
  capaUrl: z.string().url("URL inválida"),
  bannerUrl: z.string().url("URL inválida"),
});

type FormValues = z.infer<typeof schema>;

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export default function ZenkatuberObraForm() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "nova";
  const { currentUser, isZenkatuber, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [loadingObra, setLoadingObra] = useState(!isNew);
  const [generos, setGeneros] = useState<string[]>([]);
  const [allGeneros, setAllGeneros] = useState<{ id: number; nome: string }[]>([]);
  const [selectedGeneros, setSelectedGeneros] = useState<string[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      titulo: "",
      slug: "",
      sinopse: "",
      status: "Em Exibição",
      ano: new Date().getFullYear(),
      nota: "",
      totalEps: "",
      capaUrl: "",
      bannerUrl: "",
    },
  });

  const tituloWatch = form.watch("titulo");

  useEffect(() => {
    if (!loading && (!currentUser || !isZenkatuber)) setLocation("/");
  }, [loading, currentUser, isZenkatuber, setLocation]);

  useEffect(() => {
    fetch(`${API_BASE}/generos`)
      .then((r) => r.json())
      .then((data) => setAllGeneros(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isNew || !id) return;
    setLoadingObra(true);
    fetch(`${API_BASE}/obras/${id}`)
      .then((r) => r.json())
      .then((obra) => {
        if (!obra || obra.error) { toast({ title: "Obra não encontrada", variant: "destructive" }); setLocation("/meus-projetos"); return; }
        form.reset({
          titulo: obra.titulo ?? "",
          slug: obra.slug ?? "",
          sinopse: obra.sinopse ?? "",
          status: obra.status ?? "Em Exibição",
          ano: obra.ano ?? new Date().getFullYear(),
          nota: obra.nota ?? "",
          totalEps: obra.totalEps ?? "",
          capaUrl: obra.capaUrl ?? "",
          bannerUrl: obra.bannerUrl ?? "",
        });
        setSelectedGeneros(obra.generos ?? []);
        setGeneros(obra.generos ?? []);
      })
      .catch(() => toast({ title: "Erro ao carregar obra", variant: "destructive" }))
      .finally(() => setLoadingObra(false));
  }, [id, isNew]);

  const onSubmit = async (values: FormValues) => {
    if (!currentUser?.uid) return;
    setSubmitting(true);
    try {
      const body = {
        ...values,
        nota: values.nota === "" ? null : Number(values.nota),
        totalEps: values.totalEps === "" ? null : Number(values.totalEps),
        generos: selectedGeneros,
        ...(isNew ? { ownerId: currentUser.uid } : { callerUid: currentUser.uid }),
      };

      const res = isNew
        ? await fetch(`${API_BASE}/obras`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch(`${API_BASE}/obras/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

      const data = await res.json();
      if (res.ok) {
        toast({ title: isNew ? "Obra criada!" : "Obra atualizada!" });
        setLocation("/meus-projetos");
      } else {
        toast({ title: data.error || "Erro ao salvar obra", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao salvar obra", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleGenero = (nome: string) => {
    setSelectedGeneros((prev) =>
      prev.includes(nome) ? prev.filter((g) => g !== nome) : [...prev, nome]
    );
  };

  if (loading || loadingObra) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-10">
      <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
        <Link href="/meus-projetos"><ArrowLeft className="w-4 h-4 mr-1" /> Meus Projetos</Link>
      </Button>

      <h1 className="font-display text-3xl font-bold mb-8">
        {isNew ? "Nova Obra" : "Editar Obra"}
      </h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Título + Slug */}
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="titulo" render={({ field }) => (
              <FormItem>
                <FormLabel>Título *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="bg-background"
                    onBlur={(e) => {
                      field.onBlur();
                      if (isNew && !form.getValues("slug")) {
                        form.setValue("slug", slugify(e.target.value), { shouldValidate: true });
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="slug" render={({ field }) => (
              <FormItem>
                <FormLabel>Slug (URL) *</FormLabel>
                <FormControl><Input {...field} className="bg-background" placeholder="ex: meu-anime-2024" /></FormControl>
                <FormDescription>Só letras minúsculas, números e hifens.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {/* Sinopse */}
          <FormField control={form.control} name="sinopse" render={({ field }) => (
            <FormItem>
              <FormLabel>Sinopse *</FormLabel>
              <FormControl><Textarea {...field} className="bg-background min-h-[100px]" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {/* Status + Ano */}
          <div className="grid sm:grid-cols-3 gap-4">
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Status *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="ano" render={({ field }) => (
              <FormItem>
                <FormLabel>Ano *</FormLabel>
                <FormControl><Input type="number" {...field} className="bg-background" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="totalEps" render={({ field }) => (
              <FormItem>
                <FormLabel>Total de eps</FormLabel>
                <FormControl><Input type="number" min="0" {...field} value={field.value ?? ""} className="bg-background" placeholder="Ex: 12" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {/* Nota */}
          <FormField control={form.control} name="nota" render={({ field }) => (
            <FormItem>
              <FormLabel>Nota (0–10)</FormLabel>
              <FormControl><Input type="number" step="0.1" min="0" max="10" {...field} value={field.value ?? ""} className="bg-background max-w-[120px]" placeholder="Ex: 8.5" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {/* Gêneros */}
          {allGeneros.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Gêneros</label>
              <div className="flex flex-wrap gap-2">
                {allGeneros.map((g) => {
                  const sel = selectedGeneros.includes(g.nome);
                  return (
                    <button
                      type="button"
                      key={g.id}
                      onClick={() => toggleGenero(g.nome)}
                      className={["text-xs px-2.5 py-1 rounded-full border transition-colors", sel ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"].join(" ")}
                    >
                      {sel && <X className="inline w-3 h-3 mr-1" />}
                      {g.nome}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Imagens */}
          <div className="space-y-4">
            <FormField control={form.control} name="capaUrl" render={({ field }) => (
              <FormItem>
                <FormLabel>URL da capa *</FormLabel>
                <FormControl><Input {...field} className="bg-background" placeholder="https://..." /></FormControl>
                <FormMessage />
                {field.value && (
                  <img src={field.value} alt="capa" className="w-16 h-24 rounded-lg object-cover mt-2" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
              </FormItem>
            )} />
            <FormField control={form.control} name="bannerUrl" render={({ field }) => (
              <FormItem>
                <FormLabel>URL do banner *</FormLabel>
                <FormControl><Input {...field} className="bg-background" placeholder="https://..." /></FormControl>
                <FormMessage />
                {field.value && (
                  <img src={field.value} alt="banner" className="w-full max-w-xs h-20 rounded-lg object-cover mt-2" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
              </FormItem>
            )} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={submitting} className="flex-1 gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isNew ? "Criar obra" : "Salvar alterações"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/meus-projetos">Cancelar</Link>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
