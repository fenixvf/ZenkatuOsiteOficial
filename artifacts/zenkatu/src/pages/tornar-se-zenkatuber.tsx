import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/lib/auth-context";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useToast } from "@/hooks/use-toast";
import {
  BadgeCheck,
  Loader2,
  ArrowLeft,
  Mic2,
  Users,
  Film,
  Link as LinkIcon,
  Check,
  Users2,
} from "lucide-react";
import { Link } from "wouter";

const API_BASE = "/api";

type ZenkatuberConfig = {
  minFollowers: number;
  minAge: number;
  requireFandub: boolean;
  enabled: boolean;
};

const REDES_SOCIAIS = [
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "twitter", label: "Twitter / X" },
  { value: "facebook", label: "Facebook" },
];

const CATEGORIAS = [
  {
    value: "dublador_solo",
    label: "Dublador Solo",
    icon: Mic2,
    desc: "Você dubla, edita e publica sozinho",
  },
  {
    value: "diretor_equipe",
    label: "Diretor de Equipe",
    icon: Users,
    desc: "Você lidera um grupo de dubladores",
  },
  {
    value: "editor",
    label: "Editor / Criador",
    icon: Film,
    desc: "Você edita e publica as obras",
  },
];

function buildSchema(cfg: ZenkatuberConfig | null) {
  const minFollowers = cfg?.minFollowers ?? 500;
  const requireFandub = cfg?.requireFandub ?? true;

  return z.object({
    whatsapp: z.string().optional(),
    instagram: z.string().optional(),
    discord: z.string().optional(),
    fandubLink: requireFandub
      ? z.string().url("Insira uma URL válida do trabalho anterior")
      : z.string().optional(),
    categoria: z.enum(["dublador_solo", "diretor_equipe", "editor"], {
      required_error: "Selecione uma categoria",
    }),
    equipe: z.string().optional(),
    redesocial: z.string().min(1, "Selecione a rede social"),
    seguidores: z
      .string()
      .min(1, "Informe o número de seguidores")
      .refine(
        (v) => !isNaN(parseInt(v)) && parseInt(v) >= minFollowers,
        `Mínimo de ${minFollowers.toLocaleString("pt-BR")} seguidores obrigatório`
      ),
    aceitouTermos: z.boolean().refine((v) => v === true, {
      message: "Você precisa aceitar os termos para prosseguir",
    }),
  });
}

type FormValues = {
  whatsapp?: string;
  instagram?: string;
  discord?: string;
  fandubLink?: string;
  categoria: "dublador_solo" | "diretor_equipe" | "editor";
  equipe?: string;
  redesocial: string;
  seguidores: string;
  aceitouTermos: boolean;
};

export default function TornarSeZenkatuber() {
  const { currentUser, userProfile, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [config, setConfig] = useState<ZenkatuberConfig | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(buildSchema(config)),
    defaultValues: {
      whatsapp: "",
      instagram: "",
      discord: "",
      fandubLink: "",
      equipe: "",
      redesocial: "",
      seguidores: "",
      aceitouTermos: false,
    },
  });

  useEffect(() => {
    if (!loading && !currentUser) {
      setLocation("/login");
    }
  }, [loading, currentUser, setLocation]);

  useEffect(() => {
    fetch(`${API_BASE}/zenkatuber/config`)
      .then((r) => r.json())
      .then((data) => setConfig(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!currentUser?.uid) return;
    fetch(`${API_BASE}/zenkatuber/status/${currentUser.uid}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.isZenkatuber) setLocation("/perfil");
        else setHasPendingRequest(data.hasPendingRequest);
      })
      .catch(() => {})
      .finally(() => setCheckingStatus(false));
  }, [currentUser?.uid]);

  // Re-create resolver when config loads
  useEffect(() => {
    if (config) {
      form.clearErrors();
    }
  }, [config]);

  const onSubmit = async (values: FormValues) => {
    if (!currentUser || !userProfile) return;

    const seguidoresNum = parseInt(values.seguidores);
    const minFollowers = config?.minFollowers ?? 500;
    if (isNaN(seguidoresNum) || seguidoresNum < minFollowers) {
      form.setError("seguidores", {
        message: `Mínimo de ${minFollowers.toLocaleString("pt-BR")} seguidores obrigatório`,
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/zenkatuber/solicitar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: currentUser.uid,
          email: currentUser.email,
          username: userProfile.username || currentUser.displayName || currentUser.email,
          ...values,
          seguidores: seguidoresNum,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: "Solicitação enviada!",
          description: "Sua candidatura a Zenkatuber foi enviada. Aguarde a análise.",
        });
        setLocation("/perfil");
      } else {
        toast({ title: data.error || "Erro ao enviar solicitação", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao enviar solicitação", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || checkingStatus) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasPendingRequest) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
        <BadgeCheck className="w-16 h-16 text-blue-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Solicitação em análise</h1>
        <p className="text-muted-foreground mb-6">
          Sua solicitação para se tornar Zenkatuber já foi enviada e está aguardando aprovação.
          Você será notificado quando houver uma resposta.
        </p>
        <Button asChild variant="outline">
          <Link href="/perfil">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao perfil
          </Link>
        </Button>
      </div>
    );
  }

  const minFollowers = config?.minFollowers ?? 500;
  const minAge = config?.minAge ?? 16;
  const requireFandub = config?.requireFandub ?? true;

  return (
    <div className="container max-w-2xl mx-auto px-4 py-10">
      <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
        <Link href="/perfil">
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Link>
      </Button>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <BadgeCheck className="w-8 h-8 text-blue-400" />
          <h1 className="font-display text-3xl font-bold">Tornar-se Zenkatuber</h1>
        </div>
        <p className="text-muted-foreground mb-8 ml-11">
          Zenkatubers são criadores verificados que publicam conteúdo de fandub diretamente na plataforma.
          Preencha o formulário abaixo para enviar sua candidatura.
        </p>

        {/* Requisitos dinâmicos */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 mb-8">
          <p className="text-sm font-semibold text-blue-300 mb-2">Requisitos básicos</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            {requireFandub && (
              <li>Ter pelo menos 1 trabalho de fandub ou edição publicado</li>
            )}
            <li>
              Ter no mínimo{" "}
              <span className="text-blue-300 font-semibold">
                {minFollowers.toLocaleString("pt-BR")} seguidores
              </span>{" "}
              em alguma rede social
            </li>
            <li>Ter conta ativa nas redes sociais informadas</li>
            <li>Idade mínima de {minAge} anos</li>
            <li>Aceitar a política de conteúdo e responsabilidade por direitos</li>
          </ul>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Seguidores */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Rede social com maior alcance
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="redesocial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Plataforma</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {REDES_SOCIAIS.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
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
                  name="seguidores"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm flex items-center gap-1.5">
                        <Users2 className="w-3.5 h-3.5 text-muted-foreground" />
                        Seguidores *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder={`Mín. ${minFollowers.toLocaleString("pt-BR")}`}
                          min={0}
                          {...field}
                          className="bg-background"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Contatos */}
            <div className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Contatos (preencha ao menos um)
              </h2>
              <div className="grid sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="whatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">WhatsApp</FormLabel>
                      <FormControl>
                        <Input placeholder="+55 11 9..." {...field} className="bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="instagram"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Instagram</FormLabel>
                      <FormControl>
                        <Input placeholder="@usuario" {...field} className="bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="discord"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Discord</FormLabel>
                      <FormControl>
                        <Input placeholder="usuario#0000" {...field} className="bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Fandub link */}
            {requireFandub && (
              <FormField
                control={form.control}
                name="fandubLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      Link de trabalho anterior *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://youtube.com/watch?v=... ou archive.org/..."
                        {...field}
                        className="bg-background"
                      />
                    </FormControl>
                    <FormDescription>
                      Pelo menos 1 fandub ou edição publicada (YouTube, archive.org, Drive, etc.)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Categoria de atuação — cards visuais */}
            <FormField
              control={form.control}
              name="categoria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">
                    Categoria de atuação *
                  </FormLabel>
                  <FormControl>
                    <div className="grid sm:grid-cols-3 gap-3 mt-2">
                      {CATEGORIAS.map(({ value, label, icon: Icon, desc }) => {
                        const selected = field.value === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => field.onChange(value)}
                            className={[
                              "relative flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                              selected
                                ? "border-primary bg-primary/15 shadow-lg shadow-primary/20 scale-[1.02]"
                                : "border-border bg-card hover:border-primary/40 hover:bg-primary/5",
                            ].join(" ")}
                          >
                            {/* Checkmark */}
                            <div
                              className={[
                                "absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                selected
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground/30 bg-transparent",
                              ].join(" ")}
                            >
                              {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                            </div>

                            <Icon
                              className={[
                                "w-6 h-6 transition-colors",
                                selected ? "text-primary" : "text-muted-foreground",
                              ].join(" ")}
                            />
                            <span
                              className={[
                                "text-sm font-bold transition-colors",
                                selected ? "text-primary" : "text-foreground",
                              ].join(" ")}
                            >
                              {label}
                            </span>
                            <span className="text-xs text-muted-foreground leading-snug">{desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Equipe (opcional) */}
            <FormField
              control={form.control}
              name="equipe"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Equipe (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Studio X, Equipe Fandub BR..."
                      {...field}
                      className="bg-background"
                    />
                  </FormControl>
                  <FormDescription>Nome da sua equipe de dublagem, se houver.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Termos */}
            <div className="bg-secondary/50 border border-border rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold">Termos e responsabilidades</p>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside leading-relaxed">
                <li>Declaro ter autorização ou responsabilidade sobre o conteúdo que vou publicar.</li>
                <li>Concordo que conteúdo com reclamação de direitos pode ser removido sem aviso prévio.</li>
                <li>
                  Comprometo-me a manter atividade na plataforma; contas inativas por longos períodos podem
                  perder o selo.
                </li>
                <li>Tenho no mínimo {minAge} anos.</li>
                <li>As informações de contato fornecidas são verdadeiras e atualizadas.</li>
              </ul>

              <FormField
                control={form.control}
                name="aceitouTermos"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0 mt-2">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="text-sm font-normal leading-snug cursor-pointer">
                      Li e aceito todos os termos acima
                    </FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              disabled={submitting || config?.enabled === false}
              className="w-full gap-2"
              size="lg"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <BadgeCheck className="w-4 h-4" />
              )}
              {config?.enabled === false ? "Programa encerrado temporariamente" : "Enviar candidatura"}
            </Button>
          </form>
        </Form>
      </motion.div>
    </div>
  );
}
