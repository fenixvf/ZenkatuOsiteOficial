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
  Instagram,
  MessageCircle,
  ExternalLink,
  Clock,
  CheckCircle2,
  Send,
} from "lucide-react";
import { Link } from "wouter";

const API_BASE = "/api";

const WALLY_INSTAGRAM = "wallydubsoficial";
const DISCORD_URL = "https://discord.gg/9kQuwb2nzH";

type ZenkatuberConfig = {
  minFollowers: number;
  minAge: number;
  requireFandub: boolean;
  enabled: boolean;
};

type ZenkatuberStatus = {
  hasPendingRequest: boolean;
  isZenkatuber: boolean;
  verifiedAt: string | null;
  requestStatus: string | null;
  requestStage: number | null;
};

const REDES_SOCIAIS = [
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "twitter", label: "Twitter / X" },
  { value: "facebook", label: "Facebook" },
];

const CATEGORIAS = [
  { value: "dublador_solo", label: "Dublador Solo", icon: Mic2, desc: "Você dubla, edita e publica sozinho" },
  { value: "diretor_equipe", label: "Diretor de Equipe", icon: Users, desc: "Você lidera um grupo de dubladores" },
  { value: "editor", label: "Editor / Criador", icon: Film, desc: "Você edita e publica as obras" },
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
    categoria: z.enum(["dublador_solo", "diretor_equipe", "editor"], { required_error: "Selecione uma categoria" }),
    equipe: z.string().optional(),
    redesocial: z.string().min(1, "Selecione a rede social"),
    seguidores: z
      .string()
      .min(1, "Informe o número de seguidores")
      .refine((v) => !isNaN(parseInt(v)) && parseInt(v) >= minFollowers, `Mínimo de ${minFollowers.toLocaleString("pt-BR")} seguidores obrigatório`),
    aceitouTermos: z.boolean().refine((v) => v === true, { message: "Você precisa aceitar os termos para prosseguir" }),
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

// ── Tela: Etapa 2 — Envio do link de divulgação ──────────────────────────────
function Stage2Form({ uid }: { uid: string }) {
  const { toast } = useToast();
  const [postUrl, setPostUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postUrl.trim()) return;
    try {
      new URL(postUrl.trim());
    } catch {
      toast({ title: "Insira uma URL válida", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/zenkatuber/stage2-submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, postUrl: postUrl.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
        toast({ title: "Link enviado! Aguarde a análise final." });
      } else {
        toast({ title: data.error || "Erro ao enviar link", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao enviar link", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Link enviado!</h1>
        <p className="text-muted-foreground mb-6">
          Sua postagem foi enviada para análise final. Você será notificado assim que o admin revisar.
        </p>
        <Button asChild variant="outline">
          <Link href="/perfil"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao perfil</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-10">
      <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
        <Link href="/perfil"><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Link>
      </Button>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {/* Progresso */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center">
              <Check className="w-4 h-4 text-white" strokeWidth={3} />
            </div>
            <span className="text-sm font-medium text-green-400">Etapa 1 aprovada</span>
          </div>
          <div className="flex-1 h-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">2</span>
            </div>
            <span className="text-sm font-bold text-foreground">Divulgação</span>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <BadgeCheck className="w-8 h-8 text-blue-400" />
          <h1 className="font-display text-3xl font-bold">Etapa 2 — Divulgação</h1>
        </div>
        <p className="text-muted-foreground mb-8 ml-11">
          Seu perfil foi aprovado! Agora você precisa fazer uma postagem divulgando o Zenkatu para concluir o processo.
        </p>

        {/* Instruções */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-5 mb-8 space-y-4">
          <p className="text-sm font-semibold text-blue-300">O que você precisa fazer:</p>

          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-primary">1</span>
              </div>
              <p>Faça uma <strong className="text-foreground">postagem pública</strong> em qualquer rede social divulgando o site do Zenkatu.</p>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-primary">2</span>
              </div>
              <p>Mencione o perfil do ADM no Instagram na postagem:</p>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-primary">3</span>
              </div>
              <p>Inclua também o link do Discord oficial do Zenkatu na postagem.</p>
            </div>
          </div>

          {/* Links para copiar */}
          <div className="grid sm:grid-cols-2 gap-3 pt-1">
            <a
              href={`https://instagram.com/${WALLY_INSTAGRAM}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 hover:bg-pink-500/15 transition-colors group"
            >
              <Instagram className="w-4 h-4 text-pink-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-pink-300 font-semibold">Instagram do ADM</p>
                <p className="text-xs text-muted-foreground truncate">@{WALLY_INSTAGRAM}</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-pink-400 ml-auto shrink-0 transition-colors" />
            </a>
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 transition-colors group"
            >
              <MessageCircle className="w-4 h-4 text-indigo-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-indigo-300 font-semibold">Discord do Zenkatu</p>
                <p className="text-xs text-muted-foreground truncate">{DISCORD_URL}</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-indigo-400 ml-auto shrink-0 transition-colors" />
            </a>
          </div>
        </div>

        {/* Formulário de envio */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-muted-foreground" />
              Link da postagem *
            </label>
            <Input
              type="url"
              placeholder="https://instagram.com/p/... ou https://twitter.com/..."
              value={postUrl}
              onChange={(e) => setPostUrl(e.target.value)}
              className="bg-background"
              required
            />
            <p className="text-xs text-muted-foreground">
              Cole o link direto para a postagem pública que você fez.
            </p>
          </div>

          <Button type="submit" disabled={submitting || !postUrl.trim()} className="w-full gap-2" size="lg">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar para análise final
          </Button>
        </form>
      </motion.div>
    </div>
  );
}

// ── Tela: Aguardando análise ──────────────────────────────────────────────────
function WaitingScreen({ status }: { status: ZenkatuberStatus }) {
  const isStage1 = status.requestStatus === "pending";
  const isStage2 = status.requestStatus === "stage2_pending";

  return (
    <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
      <Clock className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
      <h1 className="text-2xl font-bold mb-2">
        {isStage1 ? "Etapa 1 em análise" : "Etapa 2 em análise"}
      </h1>
      <p className="text-muted-foreground mb-3">
        {isStage1
          ? "Sua candidatura foi enviada e está sendo analisada pelo admin. Aguarde o resultado."
          : "Sua postagem de divulgação está sendo verificada. Aguarde a aprovação final."}
      </p>
      {/* Progresso visual */}
      <div className="flex items-center justify-center gap-3 my-6">
        <div className="flex items-center gap-2">
          <div className={["w-7 h-7 rounded-full flex items-center justify-center", isStage2 ? "bg-green-500" : "bg-yellow-500/20 border-2 border-yellow-500"].join(" ")}>
            {isStage2 ? <Check className="w-4 h-4 text-white" strokeWidth={3} /> : <span className="text-xs font-bold text-yellow-400">1</span>}
          </div>
          <span className={["text-sm font-medium", isStage2 ? "text-green-400" : "text-yellow-400"].join(" ")}>
            {isStage2 ? "Etapa 1 aprovada" : "Etapa 1 — Em análise"}
          </span>
        </div>
        <div className="flex-1 h-px bg-border max-w-[60px]" />
        <div className="flex items-center gap-2">
          <div className={["w-7 h-7 rounded-full flex items-center justify-center", isStage2 ? "bg-yellow-500/20 border-2 border-yellow-500" : "bg-secondary"].join(" ")}>
            <span className={["text-xs font-bold", isStage2 ? "text-yellow-400" : "text-muted-foreground"].join(" ")}>2</span>
          </div>
          <span className={["text-sm font-medium", isStage2 ? "text-yellow-400" : "text-muted-foreground"].join(" ")}>
            {isStage2 ? "Etapa 2 — Em análise" : "Etapa 2"}
          </span>
        </div>
      </div>
      <Button asChild variant="outline">
        <Link href="/perfil"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao perfil</Link>
      </Button>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function TornarSeZenkatuber() {
  const { currentUser, userProfile, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<ZenkatuberStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [config, setConfig] = useState<ZenkatuberConfig | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(buildSchema(config)),
    defaultValues: { whatsapp: "", instagram: "", discord: "", fandubLink: "", equipe: "", redesocial: "", seguidores: "", aceitouTermos: false },
  });

  useEffect(() => {
    if (!loading && !currentUser) setLocation("/login");
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
        else setStatus(data);
      })
      .catch(() => {})
      .finally(() => setCheckingStatus(false));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (config) form.clearErrors();
  }, [config]);

  const onSubmit = async (values: FormValues) => {
    if (!currentUser || !userProfile) return;
    const seguidoresNum = parseInt(values.seguidores);
    const minFollowers = config?.minFollowers ?? 500;
    if (isNaN(seguidoresNum) || seguidoresNum < minFollowers) {
      form.setError("seguidores", { message: `Mínimo de ${minFollowers.toLocaleString("pt-BR")} seguidores obrigatório` });
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
        toast({ title: "Candidatura enviada!", description: "Aguarde a análise da Etapa 1." });
        setStatus({ hasPendingRequest: true, isZenkatuber: false, verifiedAt: null, requestStatus: "pending", requestStage: 1 });
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

  // Etapa 2: candidato aprovado na etapa 1, precisa enviar post de divulgação
  if (status?.requestStatus === "stage1_approved" && currentUser?.uid) {
    return <Stage2Form uid={currentUser.uid} />;
  }

  // Aguardando análise (etapa 1 ou etapa 2)
  if (status?.hasPendingRequest && (status.requestStatus === "pending" || status.requestStatus === "stage2_pending")) {
    return <WaitingScreen status={status} />;
  }

  const minFollowers = config?.minFollowers ?? 500;
  const minAge = config?.minAge ?? 16;
  const requireFandub = config?.requireFandub ?? true;

  return (
    <div className="container max-w-2xl mx-auto px-4 py-10">
      <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
        <Link href="/perfil"><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Link>
      </Button>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {/* Progresso visual */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">1</span>
            </div>
            <span className="text-sm font-bold text-foreground">Análise de perfil</span>
          </div>
          <div className="flex-1 h-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center border border-border">
              <span className="text-xs font-bold text-muted-foreground">2</span>
            </div>
            <span className="text-sm font-medium text-muted-foreground">Divulgação</span>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <BadgeCheck className="w-8 h-8 text-blue-400" />
          <h1 className="font-display text-3xl font-bold">Tornar-se Zenkatuber</h1>
        </div>
        <p className="text-muted-foreground mb-8 ml-11">
          Zenkatubers são criadores verificados que publicam fandubs diretamente na plataforma.
          O processo tem <strong className="text-foreground">2 etapas</strong>: análise de perfil e divulgação.
        </p>

        {/* Requisitos */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 mb-8">
          <p className="text-sm font-semibold text-blue-300 mb-2">Etapa 1 — Requisitos básicos</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            {requireFandub && <li>Ter pelo menos 1 trabalho de fandub ou edição publicado</li>}
            <li>Ter no mínimo <span className="text-blue-300 font-semibold">{minFollowers.toLocaleString("pt-BR")} seguidores</span> em alguma rede social</li>
            <li>Conta ativa nas redes sociais informadas</li>
            <li>Idade mínima de {minAge} anos</li>
            <li>Aceitar a política de conteúdo</li>
          </ul>
          <div className="mt-3 pt-3 border-t border-blue-500/20">
            <p className="text-xs text-blue-300/70">
              <strong className="text-blue-300">Etapa 2:</strong> Após aprovação, você precisará fazer uma postagem pública divulgando o Zenkatu, mencionando{" "}
              <span className="font-semibold">@{WALLY_INSTAGRAM}</span> e o Discord do Zenkatu.
            </p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Seguidores */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Rede social com maior alcance</h2>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="redesocial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Plataforma</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {REDES_SOCIAIS.map((r) => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
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
                        <Users2 className="w-3.5 h-3.5 text-muted-foreground" /> Seguidores *
                      </FormLabel>
                      <FormControl>
                        <Input type="number" placeholder={`Mín. ${minFollowers.toLocaleString("pt-BR")}`} min={0} {...field} className="bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Contatos */}
            <div className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Contatos (preencha ao menos um)</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                <FormField control={form.control} name="whatsapp" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">WhatsApp</FormLabel>
                    <FormControl><Input placeholder="+55 11 9..." {...field} className="bg-background" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="instagram" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Instagram</FormLabel>
                    <FormControl><Input placeholder="@usuario" {...field} className="bg-background" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="discord" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Discord</FormLabel>
                    <FormControl><Input placeholder="usuario#0000" {...field} className="bg-background" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            {/* Fandub link */}
            {requireFandub && (
              <FormField control={form.control} name="fandubLink" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-muted-foreground" /> Link de trabalho anterior *
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="https://youtube.com/watch?v=... ou archive.org/..." {...field} className="bg-background" />
                  </FormControl>
                  <FormDescription>Pelo menos 1 fandub ou edição publicada.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {/* Categoria */}
            <FormField control={form.control} name="categoria" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-semibold">Categoria de atuação *</FormLabel>
                <FormControl>
                  <div className="grid sm:grid-cols-3 gap-3 mt-2">
                    {CATEGORIAS.map(({ value, label, icon: Icon, desc }) => {
                      const selected = field.value === value;
                      return (
                        <button key={value} type="button" onClick={() => field.onChange(value)}
                          className={["relative flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                            selected ? "border-primary bg-primary/15 shadow-lg shadow-primary/20 scale-[1.02]" : "border-border bg-card hover:border-primary/40 hover:bg-primary/5"].join(" ")}>
                          <div className={["absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all", selected ? "border-primary bg-primary" : "border-muted-foreground/30 bg-transparent"].join(" ")}>
                            {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                          </div>
                          <Icon className={["w-6 h-6 transition-colors", selected ? "text-primary" : "text-muted-foreground"].join(" ")} />
                          <span className={["text-sm font-bold transition-colors", selected ? "text-primary" : "text-foreground"].join(" ")}>{label}</span>
                          <span className="text-xs text-muted-foreground leading-snug">{desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Equipe */}
            <FormField control={form.control} name="equipe" render={({ field }) => (
              <FormItem>
                <FormLabel>Equipe (opcional)</FormLabel>
                <FormControl><Input placeholder="Ex: Studio X, Equipe Fandub BR..." {...field} className="bg-background" /></FormControl>
                <FormDescription>Nome da sua equipe de dublagem, se houver.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            {/* Termos */}
            <div className="bg-secondary/50 border border-border rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold">Termos e responsabilidades</p>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside leading-relaxed">
                <li>Declaro ter autorização ou responsabilidade sobre o conteúdo que vou publicar.</li>
                <li>Concordo que conteúdo com reclamação de direitos pode ser removido sem aviso prévio.</li>
                <li>Comprometo-me a manter atividade na plataforma.</li>
                <li>Tenho no mínimo {minAge} anos.</li>
                <li>As informações de contato fornecidas são verdadeiras e atualizadas.</li>
              </ul>
              <FormField control={form.control} name="aceitouTermos" render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0 mt-2">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="text-sm font-normal leading-snug cursor-pointer">Li e aceito todos os termos acima</FormLabel>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <Button type="submit" disabled={submitting || config?.enabled === false} className="w-full gap-2" size="lg">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
              {config?.enabled === false ? "Programa encerrado temporariamente" : "Enviar candidatura — Etapa 1"}
            </Button>
          </form>
        </Form>
      </motion.div>
    </div>
  );
}
