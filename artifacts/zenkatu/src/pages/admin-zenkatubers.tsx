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
  UserPlus,
  Pencil,
  Save,
  Trash2,
  List,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const API_BASE = "/api";

type ActiveZenkatuber = {
  uid: string;
  email: string;
  username?: string | null;
  photoUrl?: string | null;
  contactWhatsapp?: string | null;
  contactInstagram?: string | null;
  contactDiscord?: string | null;
  verifiedAt?: string | null;
};

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

  const [activeZenkatubers, setActiveZenkatubers] = useState<ActiveZenkatuber[]>([]);
  const [activeLoading, setActiveLoading] = useState(true);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [editFields, setEditFields] = useState({ whatsapp: "", instagram: "", discord: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [revokingUid, setRevokingUid] = useState<string | null>(null);

  const [grantEmail, setGrantEmail] = useState("");
  const [grantWhatsapp, setGrantWhatsapp] = useState("");
  const [grantInstagram, setGrantInstagram] = useState("");
  const [grantDiscord, setGrantDiscord] = useState("");
  const [granting, setGranting] = useState(false);

  const fetchActiveZenkatubers = async () => {
    if (!currentUser?.uid) return;
    setActiveLoading(true);
    try {
      const res = await fetch(`${API_BASE}/zenkatuber/list/${currentUser.uid}`);
      if (res.ok) {
        const data = await res.json();
        setActiveZenkatubers(Array.isArray(data) ? data : []);
      }
    } catch {
    } finally {
      setActiveLoading(false);
    }
  };

  const startEdit = (z: ActiveZenkatuber) => {
    setEditingUid(z.uid);
    setEditFields({
      whatsapp: z.contactWhatsapp ?? "",
      instagram: z.contactInstagram ?? "",
      discord: z.contactDiscord ?? "",
    });
  };

  const saveEdit = async (uid: string) => {
    if (!currentUser?.uid) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`${API_BASE}/zenkatuber/edit/${uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminUid: currentUser.uid,
          whatsapp: editFields.whatsapp.trim() || null,
          instagram: editFields.instagram.trim() || null,
          discord: editFields.discord.trim() || null,
        }),
      });
      if (res.ok) {
        setActiveZenkatubers((prev) =>
          prev.map((z) =>
            z.uid === uid
              ? {
                  ...z,
                  contactWhatsapp: editFields.whatsapp.trim() || null,
                  contactInstagram: editFields.instagram.trim() || null,
                  contactDiscord: editFields.discord.trim() || null,
                }
              : z
          )
        );
        setEditingUid(null);
        toast({ title: "Contato atualizado!" });
      } else {
        toast({ title: "Erro ao salvar", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleRevoke = async (uid: string, username: string | null | undefined) => {
    if (!currentUser?.uid) return;
    setRevokingUid(uid);
    try {
      const res = await fetch(`${API_BASE}/zenkatuber/revoke/${uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminUid: currentUser.uid }),
      });
      if (res.ok) {
        setActiveZenkatubers((prev) => prev.filter((z) => z.uid !== uid));
        toast({ title: `Selo de ${username || "usuário"} removido.` });
      } else {
        toast({ title: "Erro ao revogar", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao revogar", variant: "destructive" });
    } finally {
      setRevokingUid(null);
    }
  };

  const handleGrant = async () => {
    if (!currentUser?.uid || !grantEmail.trim()) return;
    setGranting(true);
    try {
      const res = await fetch(`${API_BASE}/zenkatuber/grant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminUid: currentUser.uid,
          email: grantEmail.trim(),
          whatsapp: grantWhatsapp.trim() || undefined,
          instagram: grantInstagram.trim() || undefined,
          discord: grantDiscord.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: data.message || "Zenkatuber concedido!" });
        setGrantEmail("");
        setGrantWhatsapp("");
        setGrantInstagram("");
        setGrantDiscord("");
      } else {
        toast({ title: data.error || "Erro ao conceder Zenkatuber", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao conceder Zenkatuber", variant: "destructive" });
    } finally {
      setGranting(false);
    }
  };

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
    fetchActiveZenkatubers();
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

      {/* Adicionar parceiro manualmente */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <UserPlus className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Adicionar parceiro manualmente</h2>
          <span className="text-xs text-muted-foreground ml-1">— para criadores que já eram parceiros antes do sistema</span>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">E-mail da conta *</Label>
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={grantEmail}
              onChange={(e) => setGrantEmail(e.target.value)}
              className="bg-background max-w-sm"
            />
            <p className="text-xs text-muted-foreground">O usuário precisa ter feito login ao menos uma vez na plataforma.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">WhatsApp (opcional)</Label>
              <Input
                placeholder="+55 11 9..."
                value={grantWhatsapp}
                onChange={(e) => setGrantWhatsapp(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Instagram (opcional)</Label>
              <Input
                placeholder="@usuario"
                value={grantInstagram}
                onChange={(e) => setGrantInstagram(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Discord (opcional)</Label>
              <Input
                placeholder="usuario#0000"
                value={grantDiscord}
                onChange={(e) => setGrantDiscord(e.target.value)}
                className="bg-background"
              />
            </div>
          </div>

          <Button
            onClick={handleGrant}
            disabled={granting || !grantEmail.trim()}
            className="gap-2"
          >
            {granting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <BadgeCheck className="w-4 h-4" />
            )}
            Conceder selo Zenkatuber
          </Button>
        </div>
      </div>

      {/* Zenkatubers Ativos */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <List className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Zenkatubers ativos</h2>
            {activeZenkatubers.length > 0 && (
              <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400 bg-blue-500/10">
                {activeZenkatubers.length}
              </Badge>
            )}
          </div>
        </div>

        {activeLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
          </div>
        ) : activeZenkatubers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-border rounded-2xl">
            <BadgeCheck className="w-10 h-10 text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum Zenkatuber ativo ainda.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            <AnimatePresence>
              {activeZenkatubers.map((z) => (
                <motion.div
                  key={z.uid}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, height: 0 }}
                  className="py-4 first:pt-0 last:pb-0"
                >
                  {editingUid === z.uid ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        {z.photoUrl && (
                          <img src={z.photoUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                        )}
                        <span className="font-semibold text-sm text-foreground">{z.username || z.email}</span>
                        <span className="text-xs text-muted-foreground">{z.email}</span>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">WhatsApp</Label>
                          <Input
                            placeholder="+55 11 9..."
                            value={editFields.whatsapp}
                            onChange={(e) => setEditFields((f) => ({ ...f, whatsapp: e.target.value }))}
                            className="bg-background h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Instagram</Label>
                          <Input
                            placeholder="@usuario"
                            value={editFields.instagram}
                            onChange={(e) => setEditFields((f) => ({ ...f, instagram: e.target.value }))}
                            className="bg-background h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Discord</Label>
                          <Input
                            placeholder="usuario#0000"
                            value={editFields.discord}
                            onChange={(e) => setEditFields((f) => ({ ...f, discord: e.target.value }))}
                            className="bg-background h-8 text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="gap-1.5 h-8"
                          onClick={() => saveEdit(z.uid)}
                          disabled={savingEdit}
                        >
                          {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() => setEditingUid(null)}
                          disabled={savingEdit}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {z.photoUrl ? (
                          <img src={z.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <BadgeCheck className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">{z.username || z.email}</span>
                            <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400 bg-blue-500/10 px-1.5 py-0">
                              Zenkatuber
                            </Badge>
                          </div>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            {z.contactWhatsapp && (
                              <span className="text-xs text-green-400 flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" /> {z.contactWhatsapp}
                              </span>
                            )}
                            {z.contactInstagram && (
                              <span className="text-xs text-pink-400 flex items-center gap-1">
                                <Instagram className="w-3 h-3" /> {z.contactInstagram}
                              </span>
                            )}
                            {z.contactDiscord && (
                              <span className="text-xs text-indigo-400 flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" /> {z.contactDiscord}
                              </span>
                            )}
                            {!z.contactWhatsapp && !z.contactInstagram && !z.contactDiscord && (
                              <span className="text-xs text-muted-foreground/50">Sem contatos cadastrados</span>
                            )}
                          </div>
                          {z.verifiedAt && (
                            <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                              Verificado em {format(new Date(z.verifiedAt), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 text-xs"
                          onClick={() => startEdit(z)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Editar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1.5 text-xs border-red-500/40 text-red-400 hover:bg-red-500/10"
                              disabled={revokingUid === z.uid}
                            >
                              {revokingUid === z.uid ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                              Revogar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-card border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5 text-destructive" />
                                Revogar Zenkatuber?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                O selo de <strong>{z.username || z.email}</strong> será removido. Isso pode ser concedido novamente depois.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-transparent border-border">Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRevoke(z.uid, z.username)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Revogar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
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
