import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
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
  Check,
  X,
  Link as LinkIcon,
  MessageCircle,
  Instagram,
  Users,
  Loader2,
  BadgeCheck,
  ShieldAlert,
  Settings2,
  Users2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const API_BASE = "/api";

type ZenkatuberRequest = {
  id: number;
  uid: string;
  email: string;
  username: string;
  whatsapp?: string | null;
  instagram?: string | null;
  discord?: string | null;
  fandubLink: string;
  categoria: string;
  equipe?: string | null;
  redesocial?: string | null;
  seguidores?: number | null;
  aceitouTermos: boolean;
  status: string;
  createdAt: string;
};

type ZenkatuberConfig = {
  minFollowers: number;
  minAge: number;
  requireFandub: boolean;
  enabled: boolean;
};

const CATEGORIA_LABELS: Record<string, string> = {
  dublador_solo: "Dublador Solo",
  diretor_equipe: "Diretor de Equipe",
  editor: "Editor",
};

const REDE_LABELS: Record<string, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  twitter: "Twitter/X",
  facebook: "Facebook",
};

export default function AdminZenkatubers() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<ZenkatuberRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const [config, setConfig] = useState<ZenkatuberConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [localConfig, setLocalConfig] = useState<ZenkatuberConfig>({
    minFollowers: 500,
    minAge: 16,
    requireFandub: true,
    enabled: true,
  });

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/zenkatuber/config`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setLocalConfig(data);
      }
    } catch {
    } finally {
      setConfigLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!currentUser?.uid) return;
    setSavingConfig(true);
    try {
      const res = await fetch(`${API_BASE}/zenkatuber/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminUid: currentUser.uid, ...localConfig }),
      });
      if (res.ok) {
        setConfig(localConfig);
        toast({ title: "Configurações salvas!" });
      } else {
        toast({ title: "Erro ao salvar configurações", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao salvar configurações", variant: "destructive" });
    } finally {
      setSavingConfig(false);
    }
  };

  const fetchRequests = async () => {
    if (!currentUser?.uid) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/zenkatuber/requests/${currentUser.uid}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(Array.isArray(data) ? data : []);
      }
    } catch {
      toast({ title: "Erro ao carregar solicitações", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchRequests();
  }, [currentUser?.uid]);

  const handleApprove = async (id: number) => {
    if (!currentUser?.uid) return;
    setProcessingId(id);
    try {
      const res = await fetch(`${API_BASE}/zenkatuber/approve/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminUid: currentUser.uid }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: data.message || "Zenkatuber aprovado!" });
        setRequests((prev) => prev.filter((r) => r.id !== id));
      } else {
        toast({ title: data.error || "Erro ao aprovar", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao aprovar", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: number) => {
    if (!currentUser?.uid) return;
    setProcessingId(id);
    try {
      const res = await fetch(`${API_BASE}/zenkatuber/reject/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminUid: currentUser.uid }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: data.message || "Solicitação rejeitada" });
        setRequests((prev) => prev.filter((r) => r.id !== id));
      } else {
        toast({ title: data.error || "Erro ao rejeitar", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao rejeitar", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const configChanged =
    config &&
    (localConfig.minFollowers !== config.minFollowers ||
      localConfig.minAge !== config.minAge ||
      localConfig.requireFandub !== config.requireFandub ||
      localConfig.enabled !== config.enabled);

  return (
    <div className="container max-w-screen-xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BadgeCheck className="w-7 h-7 text-blue-400" />
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Zenkatubers</h1>
          <p className="text-muted-foreground mt-1">Gerencie solicitações e configurações do programa.</p>
        </div>
      </div>

      {/* Painel de configurações */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Settings2 className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Configurações do Programa</h2>
        </div>

        {configLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Mín. seguidores */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Mínimo de seguidores</Label>
              <Input
                type="number"
                min={0}
                value={localConfig.minFollowers}
                onChange={(e) =>
                  setLocalConfig((c) => ({ ...c, minFollowers: parseInt(e.target.value) || 0 }))
                }
                className="bg-background"
              />
              <p className="text-xs text-muted-foreground">Exigência mínima em qualquer rede social</p>
            </div>

            {/* Idade mínima */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Idade mínima</Label>
              <Input
                type="number"
                min={0}
                max={99}
                value={localConfig.minAge}
                onChange={(e) =>
                  setLocalConfig((c) => ({ ...c, minAge: parseInt(e.target.value) || 0 }))
                }
                className="bg-background"
              />
              <p className="text-xs text-muted-foreground">Idade mínima em anos para candidatura</p>
            </div>

            {/* Exigir link de fandub */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Exigir link de fandub</Label>
              <div className="flex items-center gap-3 h-10">
                <Switch
                  checked={localConfig.requireFandub}
                  onCheckedChange={(v) => setLocalConfig((c) => ({ ...c, requireFandub: v }))}
                />
                <span className="text-sm text-muted-foreground">
                  {localConfig.requireFandub ? "Obrigatório" : "Opcional"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Candidato deve ter trabalho publicado</p>
            </div>

            {/* Programa ativo */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Aceitar novas candidaturas</Label>
              <div className="flex items-center gap-3 h-10">
                <Switch
                  checked={localConfig.enabled}
                  onCheckedChange={(v) => setLocalConfig((c) => ({ ...c, enabled: v }))}
                />
                <span className={["text-sm font-medium", localConfig.enabled ? "text-green-400" : "text-red-400"].join(" ")}>
                  {localConfig.enabled ? "Aberto" : "Fechado"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Desligar bloqueia envio de candidaturas</p>
            </div>
          </div>
        )}

        {configChanged && (
          <div className="flex justify-end mt-4 pt-4 border-t border-border">
            <Button onClick={saveConfig} disabled={savingConfig} size="sm" className="gap-2">
              {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Salvar configurações
            </Button>
          </div>
        )}
      </div>

      {/* Solicitações */}
      <div>
        <h2 className="font-semibold text-foreground mb-4">
          Solicitações pendentes{" "}
          {requests.length > 0 && (
            <Badge variant="outline" className="ml-2 text-xs border-yellow-500/30 text-yellow-400 bg-yellow-500/10">
              {requests.length}
            </Badge>
          )}
        </h2>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-2xl">
            <BadgeCheck className="w-12 h-12 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground font-medium">Nenhuma solicitação pendente</p>
            <p className="text-sm text-muted-foreground/60 mt-1">As novas solicitações vão aparecer aqui.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence>
              {requests.map((req) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                  className="bg-card border border-border rounded-2xl p-5 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-bold text-foreground text-lg">{req.username}</span>
                        <Badge variant="outline" className="text-xs bg-blue-500/10 border-blue-500/30 text-blue-300">
                          {CATEGORIA_LABELS[req.categoria] ?? req.categoria}
                        </Badge>
                        <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-400 bg-yellow-500/10">
                          Pendente
                        </Badge>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {req.email} · Enviado em{" "}
                        {format(new Date(req.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>

                      {/* Seguidores */}
                      {req.seguidores != null && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Users2 className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            <span className="text-foreground font-semibold">
                              {req.seguidores.toLocaleString("pt-BR")}
                            </span>{" "}
                            seguidores
                            {req.redesocial && (
                              <span className="text-muted-foreground">
                                {" "}no {REDE_LABELS[req.redesocial] ?? req.redesocial}
                              </span>
                            )}
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 text-xs">
                        {req.whatsapp && (
                          <a
                            href={`https://wa.me/${req.whatsapp.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-green-500/30 text-green-400 bg-green-500/10 hover:bg-green-500/20 transition-colors"
                          >
                            <MessageCircle className="w-3 h-3" /> {req.whatsapp}
                          </a>
                        )}
                        {req.instagram && (
                          <a
                            href={`https://instagram.com/${req.instagram.replace("@", "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-pink-500/30 text-pink-400 bg-pink-500/10 hover:bg-pink-500/20 transition-colors"
                          >
                            <Instagram className="w-3 h-3" /> {req.instagram}
                          </a>
                        )}
                        {req.discord && (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-indigo-500/30 text-indigo-400 bg-indigo-500/10">
                            <MessageCircle className="w-3 h-3" /> {req.discord}
                          </span>
                        )}
                      </div>

                      {req.fandubLink && (
                        <div className="flex items-start gap-2">
                          <LinkIcon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <a
                            href={req.fandubLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300 underline break-all"
                          >
                            {req.fandubLink}
                          </a>
                        </div>
                      )}

                      {req.equipe && (
                        <div className="flex items-start gap-2">
                          <Users className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <span className="text-xs text-muted-foreground">Equipe: {req.equipe}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 sm:flex-col shrink-0">
                      <Button
                        size="sm"
                        className="flex-1 sm:flex-none gap-1.5 bg-green-600 hover:bg-green-700 text-white border-0"
                        disabled={processingId === req.id}
                        onClick={() => handleApprove(req.id)}
                      >
                        {processingId === req.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Aprovar
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 sm:flex-none gap-1.5 border-red-500/40 text-red-400 hover:bg-red-500/10"
                            disabled={processingId === req.id}
                          >
                            <X className="w-3.5 h-3.5" />
                            Rejeitar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card border-border">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <ShieldAlert className="w-5 h-5 text-destructive" />
                              Rejeitar solicitação?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              A solicitação de <strong>{req.username}</strong> será removida permanentemente.
                              O usuário pode enviar uma nova solicitação no futuro.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-transparent border-border">Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleReject(req.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Rejeitar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
