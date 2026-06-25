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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Save, X, Plus, Trash2, Users } from "lucide-react";
import { SOCIAL_PLATFORMS, detectPlatform, type SocialPlatformKey } from "@/lib/social-platforms";

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
  tipografiaUrl: z.string().url("URL inválida").optional().nullable().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

type CastMember = {
  nome: string;
  papel: string;
  fotoUrl?: string;
  links?: {
    youtube?: string;
    instagram?: string;
    discord?: string;
    twitter?: string;
    tiktok?: string;
    site?: string;
  };
};

type SocialLinks = NonNullable<CastMember["links"]>;

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

function SocialLinksEditor({
  links,
  onChange,
}: {
  links: SocialLinks;
  onChange: (links: SocialLinks) => void;
}) {
  const [inputUrl, setInputUrl] = useState("");

  const addLink = () => {
    const url = inputUrl.trim();
    if (!url) return;
    const platform = detectPlatform(url);
    onChange({ ...links, [platform.key]: url });
    setInputUrl("");
  };

  const removeLink = (key: SocialPlatformKey) => {
    const updated = { ...links };
    delete updated[key];
    onChange(updated);
  };

  const activeLinks = SOCIAL_PLATFORMS.filter((p) => links[p.key as SocialPlatformKey]);

  return (
    <div className="space-y-3">
      {activeLinks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeLinks.map(({ key, label, icon: Icon, color }) => (
            <div
              key={key}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-border bg-secondary/50 text-xs font-medium"
            >
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <span className="text-foreground max-w-[120px] truncate">{label}</span>
              <button
                type="button"
                onClick={() => removeLink(key as SocialPlatformKey)}
                className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Input
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addLink();
            }
          }}
          placeholder="Cole o link (Instagram, Discord, YouTube...) e pressione Enter"
          className="bg-background h-8 text-xs flex-1"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-3 text-xs shrink-0"
          onClick={addLink}
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground/70">
        Cole qualquer link — o ícone da rede social é detectado automaticamente.
      </p>
    </div>
  );
}

const emptyCastMember = (): CastMember => ({
  nome: "",
  papel: "",
  fotoUrl: "",
  links: { youtube: "", instagram: "", discord: "", twitter: "", tiktok: "", site: "" },
});

function CastEditor({
  cast,
  onChange,
}: {
  cast: CastMember[];
  onChange: (c: CastMember[]) => void;
}) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState<CastMember>(emptyCastMember());

  const openAdd = () => {
    setDraft(emptyCastMember());
    setEditingIdx(-1);
  };

  const openEdit = (idx: number) => {
    setDraft(JSON.parse(JSON.stringify(cast[idx])));
    setEditingIdx(idx);
  };

  const handleSave = () => {
    if (!draft.nome.trim() || !draft.papel.trim()) return;
    const cleaned: CastMember = {
      nome: draft.nome.trim(),
      papel: draft.papel.trim(),
      fotoUrl: draft.fotoUrl?.trim() || undefined,
      links: {
        youtube: draft.links?.youtube?.trim() || undefined,
        instagram: draft.links?.instagram?.trim() || undefined,
        discord: draft.links?.discord?.trim() || undefined,
        twitter: draft.links?.twitter?.trim() || undefined,
        tiktok: draft.links?.tiktok?.trim() || undefined,
        site: draft.links?.site?.trim() || undefined,
      },
    };
    if (editingIdx === -1) {
      onChange([...cast, cleaned]);
    } else if (editingIdx !== null) {
      const updated = [...cast];
      updated[editingIdx] = cleaned;
      onChange(updated);
    }
    setEditingIdx(null);
  };

  const handleRemove = (idx: number) => {
    onChange(cast.filter((_, i) => i !== idx));
  };

  const isOpen = editingIdx !== null;

  return (
    <div className="space-y-4">
      {cast.length === 0 && (
        <p className="text-sm text-muted-foreground italic">Nenhum membro adicionado ainda.</p>
      )}
      <div className="space-y-3">
        {cast.map((member, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/50"
          >
            {member.fotoUrl ? (
              <img
                src={member.fotoUrl}
                alt={member.nome}
                className="w-10 h-10 rounded-full object-cover border border-border flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-sm font-bold text-muted-foreground">
                {member.nome[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground truncate">{member.nome}</p>
              <p className="text-xs text-muted-foreground truncate">{member.papel}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs"
                onClick={() => openEdit(idx)}
              >
                Editar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-destructive hover:text-destructive"
                onClick={() => handleRemove(idx)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={openAdd} className="gap-2">
        <Plus className="w-4 h-4" /> Adicionar membro
      </Button>

      <Dialog open={isOpen} onOpenChange={(o) => !o && setEditingIdx(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingIdx === -1 ? "Adicionar membro" : "Editar membro"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Nome *</label>
                <Input
                  value={draft.nome}
                  onChange={(e) => setDraft((d) => ({ ...d, nome: e.target.value }))}
                  placeholder="Ex: João Silva"
                  className="bg-background h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Papel *</label>
                <Input
                  value={draft.papel}
                  onChange={(e) => setDraft((d) => ({ ...d, papel: e.target.value }))}
                  placeholder="Ex: Dublador, Editor"
                  className="bg-background h-9 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                URL da Foto de Perfil
              </label>
              <Input
                value={draft.fotoUrl || ""}
                onChange={(e) => setDraft((d) => ({ ...d, fotoUrl: e.target.value }))}
                placeholder="https://..."
                className="bg-background h-9 text-sm"
              />
              {draft.fotoUrl && (
                <img
                  src={draft.fotoUrl}
                  alt="preview"
                  className="w-12 h-12 rounded-full object-cover border border-border mt-1"
                  onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                />
              )}
            </div>
            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Redes Sociais
              </p>
              <SocialLinksEditor
                links={draft.links ?? {}}
                onChange={(links) => setDraft((d) => ({ ...d, links }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setEditingIdx(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!draft.nome.trim() || !draft.papel.trim()}
              onClick={handleSave}
            >
              <Save className="w-4 h-4 mr-1" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ZenkatuberObraForm() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "nova";
  const { currentUser, isZenkatuber, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [loadingObra, setLoadingObra] = useState(!isNew);
  const [allGeneros, setAllGeneros] = useState<{ id: number; nome: string }[]>([]);
  const [selectedGeneros, setSelectedGeneros] = useState<string[]>([]);
  const [cast, setCast] = useState<CastMember[]>([]);

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
      tipografiaUrl: "",
    },
  });

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
        if (!obra || obra.error) {
          toast({ title: "Obra não encontrada", variant: "destructive" });
          setLocation("/meus-projetos");
          return;
        }
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
          tipografiaUrl: obra.tipografiaUrl ?? "",
        });
        setSelectedGeneros(obra.generos ?? []);
        setCast(obra.cast ?? []);
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
        tipografiaUrl: values.tipografiaUrl || null,
        generos: selectedGeneros,
        cast,
        ...(isNew ? { ownerId: currentUser.uid } : { callerUid: currentUser.uid }),
      };

      const res = isNew
        ? await fetch(`${API_BASE}/obras`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch(`${API_BASE}/obras/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

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
        <Link href="/meus-projetos">
          <ArrowLeft className="w-4 h-4 mr-1" /> Meus Projetos
        </Link>
      </Button>

      <h1 className="font-display text-3xl font-bold mb-8">
        {isNew ? "Nova Obra" : "Editar Obra"}
      </h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Título + Slug */}
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="bg-background"
                      onBlur={(e) => {
                        field.onBlur();
                        if (isNew && !form.getValues("slug")) {
                          form.setValue("slug", slugify(e.target.value), {
                            shouldValidate: true,
                          });
                        }
                      }}
                    />
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
                  <FormLabel>Slug (URL) *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="bg-background"
                      placeholder="ex: meu-anime-2024"
                    />
                  </FormControl>
                  <FormDescription>Só letras minúsculas, números e hifens.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Sinopse */}
          <FormField
            control={form.control}
            name="sinopse"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sinopse *</FormLabel>
                <FormControl>
                  <Textarea {...field} className="bg-background min-h-[100px]" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Status + Ano + Total Eps */}
          <div className="grid sm:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
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
                  <FormLabel>Ano *</FormLabel>
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
                  <FormLabel>Total de eps</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      {...field}
                      value={field.value ?? ""}
                      className="bg-background"
                      placeholder="Ex: 12"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Nota */}
          <FormField
            control={form.control}
            name="nota"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nota (0–10)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    {...field}
                    value={field.value ?? ""}
                    className="bg-background max-w-[120px]"
                    placeholder="Ex: 8.5"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
                      className={[
                        "text-xs px-2.5 py-1 rounded-full border transition-colors",
                        sel
                          ? "bg-primary/20 border-primary text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                      ].join(" ")}
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
            <FormField
              control={form.control}
              name="capaUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL da capa *</FormLabel>
                  <FormControl>
                    <Input {...field} className="bg-background" placeholder="https://..." />
                  </FormControl>
                  <FormMessage />
                  {field.value && (
                    <img
                      src={field.value}
                      alt="capa"
                      className="w-16 h-24 rounded-lg object-cover mt-2"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bannerUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL do banner *</FormLabel>
                  <FormControl>
                    <Input {...field} className="bg-background" placeholder="https://..." />
                  </FormControl>
                  <FormMessage />
                  {field.value && (
                    <img
                      src={field.value}
                      alt="banner"
                      className="w-full max-w-xs h-20 rounded-lg object-cover mt-2"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
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
                    <Input
                      placeholder="https://..."
                      {...field}
                      value={field.value || ""}
                      className="bg-background"
                    />
                  </FormControl>
                  <FormDescription>
                    URL de imagem com o logo/tipografia personalizada da obra (PNG transparente
                    recomendado).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Cast / Equipe */}
          <div className="space-y-4 border border-border rounded-xl p-4 bg-secondary/10">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-medium text-sm">Equipe / Cast</h3>
            </div>
            <CastEditor cast={cast} onChange={setCast} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={submitting} className="flex-1 gap-2">
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
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
