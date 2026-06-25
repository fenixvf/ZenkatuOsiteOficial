import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Loader2, Send, ArrowLeft, Users, Film, Layers, Settings2, Trash2, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface PushStats {
  total: number;
  wantEpisodios: number;
  wantObras: number;
  autoEpisodios: boolean;
  autoObras: boolean;
}

interface Notificacao {
  id: number;
  title: string;
  body: string;
  image?: string | null;
  url?: string | null;
  type: string;
  sentAt: string;
}

export default function AdminNotificacoes() {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [stats, setStats] = useState<PushStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [autoEpisodios, setAutoEpisodios] = useState(true);
  const [autoObras, setAutoObras] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState("");
  const [url, setUrl] = useState("/");
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ sent: number; failed: number } | null>(null);

  const [historico, setHistorico] = useState<Notificacao[]>([]);
  const [historicoLoading, setHistoricoLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const email = currentUser?.email;

  useEffect(() => {
    if (!email) return;
    setStatsLoading(true);
    fetch(`/api/push/stats?adminEmail=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setAutoEpisodios(data.autoEpisodios);
        setAutoObras(data.autoObras);
      })
      .catch(() => toast({ title: "Erro ao carregar estatísticas", variant: "destructive" }))
      .finally(() => setStatsLoading(false));
  }, [email]);

  useEffect(() => {
    if (!email) return;
    setHistoricoLoading(true);
    fetch(`/api/push/historico-admin?adminEmail=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setHistorico(data))
      .catch(() => {})
      .finally(() => setHistoricoLoading(false));
  }, [email]);

  const handleDeleteHistorico = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/push/historico/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminEmail: email }),
      });
      if (!res.ok) throw new Error();
      setHistorico((prev) => prev.filter((n) => n.id !== id));
      toast({ title: "Notificação removida do histórico." });
    } catch {
      toast({ title: "Erro ao remover notificação", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      const res = await fetch("/api/push/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminEmail: email, autoEpisodios, autoObras }),
      });
      if (!res.ok) throw new Error();
      setStats((s) => s ? { ...s, autoEpisodios, autoObras } : s);
      toast({ title: "Configurações salvas!" });
    } catch {
      toast({ title: "Erro ao salvar configurações", variant: "destructive" });
    } finally {
      setSettingsSaving(false);
    }
  };

  const settingsChanged = stats
    ? autoEpisodios !== stats.autoEpisodios || autoObras !== stats.autoObras
    : false;

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast({ title: "Título e mensagem são obrigatórios", variant: "destructive" });
      return;
    }
    setIsSending(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/push/send-custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminEmail: email,
          title: title.trim(),
          body: body.trim(),
          image: image.trim() || undefined,
          url: url.trim() || "/",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao enviar");
      setLastResult(data);
      toast({
        title: "Notificação enviada!",
        description: `${data.sent} entregues${data.failed > 0 ? `, ${data.failed} falhas` : ""}.`,
      });
      setTitle("");
      setBody("");
      setImage("");
      setUrl("/");
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: e.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container max-w-screen-md mx-auto px-4 py-8"
    >
      <div className="flex items-center gap-4 mb-8">
        <Button asChild variant="ghost" size="icon" className="rounded-full">
          <Link href="/admin">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-7 h-7 text-primary" />
            Notificações Push
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie inscritos e envie notificações para os usuários.</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Estatísticas */}
        <Card className="border-border bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Inscritos
            </CardTitle>
            <CardDescription>Usuários que ativaram notificações push neste site.</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="grid grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-secondary/50 border border-border">
                  <Users className="w-5 h-5 text-muted-foreground mb-1" />
                  <p className="text-2xl font-bold font-display">{stats?.total ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Total</p>
                </div>
                <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <Film className="w-5 h-5 text-purple-400 mb-1" />
                  <p className="text-2xl font-bold font-display text-purple-400">{stats?.wantEpisodios ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Episódios</p>
                </div>
                <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <Layers className="w-5 h-5 text-blue-400 mb-1" />
                  <p className="text-2xl font-bold font-display text-blue-400">{stats?.wantObras ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Projetos</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configurações automáticas */}
        <Card className="border-border bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" />
              Notificações Automáticas
            </CardTitle>
            <CardDescription>
              Controle se o site deve disparar notificações automaticamente ao criar conteúdo novo.
              Edições <strong>não</strong> geram notificações independentemente desta configuração.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {statsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 rounded-lg" />
                <Skeleton className="h-12 rounded-lg" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-background/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Film className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Novos episódios</p>
                      <p className="text-xs text-muted-foreground">Notificar quando um episódio for criado</p>
                    </div>
                  </div>
                  <Switch
                    checked={autoEpisodios}
                    onCheckedChange={setAutoEpisodios}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-background/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Layers className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Novos projetos</p>
                      <p className="text-xs text-muted-foreground">Notificar quando uma nova obra for adicionada</p>
                    </div>
                  </div>
                  <Switch
                    checked={autoObras}
                    onCheckedChange={setAutoObras}
                  />
                </div>

                <Button
                  onClick={handleSaveSettings}
                  disabled={settingsSaving || !settingsChanged}
                  size="sm"
                  className="gap-2"
                >
                  {settingsSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Salvar configurações
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Enviar notificação personalizada */}
        <Card className="border-border bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Enviar Notificação Personalizada
            </CardTitle>
            <CardDescription>
              Enviada para <strong>todos os inscritos</strong>, ignorando os filtros individuais de categoria.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="notif-title">Título *</Label>
              <Input
                id="notif-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Grande novidade no Zenkatu!"
                className="bg-background"
                maxLength={80}
              />
              <p className="text-xs text-muted-foreground text-right">{title.length}/80</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notif-body">Mensagem *</Label>
              <Textarea
                id="notif-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Ex: Confira as novidades desta semana na plataforma!"
                className="bg-background resize-none"
                rows={3}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground text-right">{body.length}/200</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="notif-image">URL da Imagem (opcional)</Label>
                <Input
                  id="notif-image"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://..."
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notif-url">URL ao clicar</Label>
                <Input
                  id="notif-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="/"
                  className="bg-background"
                />
              </div>
            </div>

            {lastResult && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm flex items-center gap-2">
                <Bell className="w-4 h-4 text-green-400 shrink-0" />
                <span>
                  <span className="text-green-400 font-medium">{lastResult.sent} entregues</span>
                  {lastResult.failed > 0 && (
                    <span className="text-muted-foreground ml-1">· {lastResult.failed} falhas removidas automaticamente</span>
                  )}
                </span>
              </div>
            )}

            <Button
              onClick={handleSend}
              disabled={isSending || !title.trim() || !body.trim()}
              className="w-full gap-2"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isSending ? "Enviando..." : `Enviar para ${stats?.total ?? 0} inscrito${(stats?.total ?? 0) !== 1 ? "s" : ""}`}
            </Button>
          </CardContent>
        </Card>

        {/* Histórico de notificações */}
        <Card className="border-border bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Histórico de Notificações
            </CardTitle>
            <CardDescription>
              Todas as notificações enviadas que aparecem no sininho dos usuários. Apague para remover da lista deles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {historicoLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : historico.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Bell className="w-8 h-8 text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma notificação no histórico</p>
              </div>
            ) : (
              <div className="space-y-2">
                {historico.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 p-3 rounded-xl border border-border bg-background/50 group"
                  >
                    {n.image ? (
                      <img src={n.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Bell className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground line-clamp-1">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground/50">
                          {new Date(n.sentAt).toLocaleString("pt-BR")}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
                          {n.type}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteHistorico(n.id)}
                      disabled={deletingId === n.id}
                      className="shrink-0 p-1.5 rounded-lg text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      title="Remover do histórico"
                    >
                      {deletingId === n.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
