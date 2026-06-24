import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/lib/auth-context";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import {
  BadgeCheck,
  Loader2,
  ArrowLeft,
  Mic2,
  Users,
  Film,
  Link as LinkIcon,
} from "lucide-react";
import { Link } from "wouter";

const API_BASE = "/api";

const schema = z.object({
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  discord: z.string().optional(),
  fandubLink: z.string().url("Insira uma URL válida do trabalho anterior"),
  categoria: z.enum(["dublador_solo", "diretor_equipe", "editor"], {
    required_error: "Selecione uma categoria",
  }),
  equipe: z.string().optional(),
  aceitouTermos: z.boolean().refine((v) => v === true, {
    message: "Você precisa aceitar os termos para prosseguir",
  }),
});

type FormValues = z.infer<typeof schema>;

const CATEGORIAS = [
  { value: "dublador_solo", label: "Dublador Solo", icon: Mic2, desc: "Você dubla, edita e publica sozinho" },
  { value: "diretor_equipe", label: "Diretor de Equipe", icon: Users, desc: "Você lidera um grupo de dubladores" },
  { value: "editor", label: "Editor / Criador de Conteúdo", icon: Film, desc: "Você edita e publica as obras" },
];

export default function TornarSeZenkatuber() {
  const { currentUser, userProfile, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      whatsapp: "",
      instagram: "",
      discord: "",
      fandubLink: "",
      equipe: "",
      aceitouTermos: false,
    },
  });

  useEffect(() => {
    if (!loading && !currentUser) {
      setLocation("/login");
    }
  }, [loading, currentUser, setLocation]);

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

  const onSubmit = async (values: FormValues) => {
    if (!currentUser || !userProfile) return;
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
        <div className="flex items-center gap-3 mb-2">
          <BadgeCheck className="w-8 h-8 text-blue-400" />
          <h1 className="font-display text-3xl font-bold">Tornar-se Zenkatuber</h1>
        </div>
        <p className="text-muted-foreground mb-8 ml-11">
          Zenkatubers são criadores verificados que publicam conteúdo de fandub diretamente na plataforma.
          Preencha o formulário abaixo para enviar sua candidatura.
        </p>

        {/* Requisitos */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 mb-8">
          <p className="text-sm font-semibold text-blue-300 mb-2">Requisitos básicos</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Ter pelo menos 1 trabalho de fandub ou edição publicado</li>
            <li>Ter conta ativa nas redes sociais informadas</li>
            <li>Idade mínima de 16 anos</li>
            <li>Aceitar a política de conteúdo e responsabilidade por direitos</li>
          </ul>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

            {/* Categoria */}
            <FormField
              control={form.control}
              name="categoria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria de atuação *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid sm:grid-cols-3 gap-3 mt-1"
                    >
                      {CATEGORIAS.map(({ value, label, icon: Icon, desc }) => (
                        <label
                          key={value}
                          className={`relative flex flex-col gap-1.5 p-3.5 rounded-xl border cursor-pointer transition-all ${
                            field.value === value
                              ? "border-primary/60 bg-primary/10"
                              : "border-border bg-card hover:border-primary/30"
                          }`}
                        >
                          <RadioGroupItem value={value} className="sr-only" />
                          <Icon className="w-5 h-5 text-primary" />
                          <span className="text-sm font-semibold">{label}</span>
                          <span className="text-xs text-muted-foreground">{desc}</span>
                        </label>
                      ))}
                    </RadioGroup>
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
                  <FormDescription>
                    Nome da sua equipe de dublagem, se houver.
                  </FormDescription>
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
                <li>Comprometo-me a manter atividade na plataforma; contas inativas por longos períodos podem perder o selo.</li>
                <li>Tenho no mínimo 16 anos.</li>
                <li>As informações de contato fornecidas são verdadeiras e atualizadas.</li>
              </ul>

              <FormField
                control={form.control}
                name="aceitouTermos"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0 mt-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
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
              disabled={submitting}
              className="w-full gap-2"
              size="lg"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <BadgeCheck className="w-4 h-4" />
              )}
              Enviar candidatura
            </Button>
          </form>
        </Form>
      </motion.div>
    </div>
  );
}
