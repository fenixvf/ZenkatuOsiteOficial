import { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import {
  useUpdateUsuario,
  useUploadAvatar,
  useGetUsuarioLista,
  useRemoveFromLista,
  useListConvitesCast,
  useListPersonagensFeitos,
  useListObras,
  useAceitarConviteCast,
  useRecusarConviteCast,
  type VoicePortfolioItem,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Camera,
  Loader2,
  RefreshCw,
  Save,
  Trash2,
  BookmarkX,
  Bell,
  BellOff,
  BadgeCheck,
  CalendarDays,
  AlignLeft,
  ExternalLink,
  ArrowRight,
  Mic,
  Plus,
  Check,
  X,
  Film,
  UserRound,
} from "lucide-react";
import { VerifiedBadge } from "@/components/verified-badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { groupProfileProjects } from "@/lib/profile-projects";

// Somente links do Google Drive são aceitos no portfólio de voz.
const DRIVE_HOSTS = [
  "drive.google.com",
  "docs.google.com",
  "drive.usercontent.google.com",
  "docs.googleusercontent.com",
];

function isDriveUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      DRIVE_HOSTS.includes(url.hostname)
    );
  } catch {
    return false;
  }
}

export default function Perfil() {
  const {
    currentUser,
    userProfile,
    loading,
    isAdmin,
    userProfileLoading,
    userProfileError,
    profileSyncing,
    retryUserProfileSync,
  } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateUsuario = useUpdateUsuario();
  const uploadAvatar = useUploadAvatar();
  const removeFromLista = useRemoveFromLista();

  const push = usePushNotifications(currentUser?.uid ?? null);
  const [localPrefs, setLocalPrefs] = useState({ notifyEpisodios: true, notifyObras: true });
  const [prefsSaving, setPrefsSaving] = useState(false);

  // Abas do perfil: edição, notificações de cast e personagens feitos.
  const [activeTab, setActiveTab] = useState<"perfil" | "notificacoes" | "personagens">("perfil");
  const uid = currentUser?.uid ?? "";

  const { data: convitesRaw, isLoading: convitesLoading, refetch: refetchConvites } =
    useListConvitesCast(uid, {
      query: { enabled: !!uid, queryKey: ["convitesCast", uid] },
    });
  const convites = Array.isArray(convitesRaw) ? convitesRaw : [];
  const pendentes = convites.filter((c) => c.status === "pending");

  const { data: personagensRaw, isLoading: personagensLoading, isError: personagensError, refetch: refetchPersonagens } =
    useListPersonagensFeitos(uid, {
      query: { enabled: !!uid, queryKey: ["personagensFeitos", uid] },
    });
  const { data: obrasRaw, isLoading: obrasLoading, isError: obrasError, refetch: refetchObras } =
    useListObras();
  const personagens = useMemo(
    () => (Array.isArray(personagensRaw) ? personagensRaw : []),
    [personagensRaw],
  );
  const obras = useMemo(() => (Array.isArray(obrasRaw) ? obrasRaw : []), [obrasRaw]);
  const projetos = useMemo(() => {
    return groupProfileProjects(uid, obras, personagens);
  }, [uid, obras, personagens]);

  const aceitarConvite = useAceitarConviteCast();
  const recusarConvite = useRecusarConviteCast();

  const responderConvite = async (conviteId: number, aceitar: boolean) => {
    try {
      const mutation = aceitar ? aceitarConvite : recusarConvite;
      await mutation.mutateAsync({ conviteId, data: { uid } });
      await Promise.all([refetchConvites(), refetchPersonagens()]);
      queryClient.invalidateQueries({ queryKey: ["convitesCast", uid] });
      queryClient.invalidateQueries({ queryKey: ["personagensFeitos", uid] });
      toast({
        title: aceitar ? "Convite aceito!" : "Convite recusado",
        description: aceitar
          ? "O personagem já aparece na aba Personagens feitos."
          : "O convite foi recusado.",
      });
    } catch {
      toast({ title: "Erro ao responder ao convite", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (!push.isLoading) {
      setLocalPrefs(push.preferences);
    }
  }, [push.isLoading, push.preferences]);

  const [username, setUsername] = useState(userProfile?.username || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [avatarBroken, setAvatarBroken] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bio, setBio] = useState(userProfile?.bio || "");
  const [portfolio, setPortfolio] = useState<VoicePortfolioItem[]>(
    userProfile?.voicePortfolio ?? [],
  );
  const [portfolioTitulo, setPortfolioTitulo] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [isSavingPortfolio, setIsSavingPortfolio] = useState(false);
  const profileLoadedRef = useRef(false);

  // Preenche bio e portfólio assim que o perfil chega do servidor.
  useEffect(() => {
    if (userProfile && !profileLoadedRef.current) {
      profileLoadedRef.current = true;
      setBio(userProfile.bio || "");
      setPortfolio(userProfile.voicePortfolio ?? []);
    }
  }, [userProfile]);

  const { data: listaRaw, isLoading: listaLoading } = useGetUsuarioLista(
    currentUser?.uid || "",
    {
      query: {
        enabled: !!currentUser?.uid,
        queryKey: ["getUsuarioLista", currentUser?.uid || ""],
      },
    },
  );
  const lista = Array.isArray(listaRaw) ? listaRaw : [];

  useEffect(() => {
    if (!loading && !currentUser) {
      setLocation("/login");
    }
  }, [loading, currentUser, setLocation]);

  if (!loading && !currentUser) {
    return null;
  }

  if (loading || (currentUser && userProfileLoading)) {
    return (
      <div className="container mx-auto grid w-full max-w-screen-md gap-5 px-4 py-8" aria-label="Carregando seu perfil">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="container mx-auto flex w-full justify-center px-4 py-12">
        <Card className="w-full max-w-md border-border bg-card/70">
          <CardHeader>
            <CardTitle>Não foi possível carregar seu perfil</CardTitle>
            <CardDescription>
              {userProfileError
                ? "A conta está conectada, mas o perfil da Zenkatu não foi sincronizado. Tente novamente."
                : "O perfil ainda não está disponível. Tente sincronizar sua conta novamente."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={retryUserProfileSync}
              disabled={profileSyncing || !currentUser}
              className="gap-2"
            >
              {profileSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSave = async () => {
    if (!username || username.length < 3 || username.length > 20) {
      toast({
        title: "Nome de usuário inválido",
        description: "O nome deve ter entre 3 e 20 caracteres.",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsSaving(true);
      await updateUsuario.mutateAsync({
        uid: currentUser!.uid,
        data: { username },
      });
      queryClient.invalidateQueries({
        queryKey: ["getUsuario", currentUser!.uid],
      });
      toast({
        title: "Perfil atualizado",
        description: "Seu nome de usuário foi salvo.",
      });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBio = async () => {
    try {
      setIsSavingBio(true);
      await updateUsuario.mutateAsync({
        uid: currentUser!.uid,
        data: { bio: bio.trim() || null },
      });
      queryClient.invalidateQueries({
        queryKey: ["getUsuario", currentUser!.uid],
      });
      toast({ title: "Biografia salva" });
    } catch {
      toast({ title: "Erro ao salvar a biografia", variant: "destructive" });
    } finally {
      setIsSavingBio(false);
    }
  };

  const addPortfolioItem = () => {
    const titulo = portfolioTitulo.trim();
    const url = portfolioUrl.trim();
    if (!titulo) {
      toast({
        title: "Dê um título ao item",
        description: "Ex: Demo reel, Dublagem, Locução...",
        variant: "destructive",
      });
      return;
    }
    if (!isDriveUrl(url)) {
      toast({
        title: "Somente URLs do Google Drive",
        description: "Cole um link drive.google.com ou docs.google.com.",
        variant: "destructive",
      });
      return;
    }
    setPortfolio((p) => [...p, { titulo, url }]);
    setPortfolioTitulo("");
    setPortfolioUrl("");
  };

  const removePortfolioItem = (index: number) => {
    setPortfolio((p) => p.filter((_, i) => i !== index));
  };

  const handleSavePortfolio = async () => {
    if (portfolio.some((item) => !isDriveUrl(item.url))) {
      toast({
        title: "Somente URLs do Google Drive",
        description: "Revise os links antes de salvar.",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsSavingPortfolio(true);
      await updateUsuario.mutateAsync({
        uid: currentUser!.uid,
        data: { voicePortfolio: portfolio },
      });
      queryClient.invalidateQueries({
        queryKey: ["getUsuario", currentUser!.uid],
      });
      toast({ title: "Portfólio de voz salvo" });
    } catch {
      toast({ title: "Erro ao salvar o portfólio", variant: "destructive" });
    } finally {
      setIsSavingPortfolio(false);
    }
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setAvatarBroken(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const SIZE = 500;

        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        canvas.width = SIZE;
        canvas.height = SIZE;
        ctx?.drawImage(img, sx, sy, minDim, minDim, 0, 0, SIZE, SIZE);

        setAvatarBroken(false);
        setPreviewUrl(canvas.toDataURL("image/webp", 0.75));

        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              setIsUploading(false);
              return;
            }
            const webpReader = new FileReader();
            webpReader.onload = async () => {
              const base64data = webpReader.result as string;
              try {
                const res = await uploadAvatar.mutateAsync({
                  uid: currentUser!.uid,
                  data: { imageData: base64data },
                });
                queryClient.setQueryData(
                  ["getUsuario", currentUser!.uid],
                  res,
                );
                toast({
                  title: "Avatar atualizado",
                  description: "Foto de perfil alterada com sucesso.",
                });
              } catch {
                setPreviewUrl(null);
                toast({
                  title: "Erro no upload",
                  description: "Não foi possível enviar a imagem.",
                  variant: "destructive",
                });
              } finally {
                setIsUploading(false);
              }
            };
            webpReader.readAsDataURL(blob);
          },
          "image/webp",
          0.75,
        );
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveFromLista = async (obraId: number) => {
    if (!currentUser) return;
    try {
      await removeFromLista.mutateAsync({ uid: currentUser.uid, obraId });
      queryClient.invalidateQueries({
        queryKey: ["getUsuarioLista", currentUser.uid],
      });
      toast({ title: "Removido da lista" });
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  const avatarSrc =
    previewUrl ||
    userProfile.photoUrl ||
    currentUser?.photoURL ||
    "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container mx-auto w-full min-w-0 max-w-screen-md overflow-x-clip px-4 py-7 sm:py-10"
    >
      <div className="grid min-w-0 gap-6">
        {/* Cabeçalho do perfil */}
        <Card className="relative overflow-hidden border-border bg-card/70 shadow-xl shadow-background/30 backdrop-blur">
          <div className="relative h-36 overflow-hidden bg-gradient-to-br from-primary/35 via-primary/10 to-secondary sm:h-44">
            <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(59,130,246,0.34),transparent_55%)]" />
            <div aria-hidden="true" className="absolute -right-12 -top-24 h-72 w-72 rounded-full border border-primary/15" />
            <span className="absolute bottom-4 right-5 font-display text-xs font-bold uppercase tracking-[0.24em] text-foreground/55">Seu espaço na comunidade</span>
          </div>
          <CardContent className="relative -mt-16 flex flex-col items-center px-5 pb-7 text-center sm:-mt-[4.5rem] sm:px-8">
            <div className="relative group shrink-0">
              <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-background bg-secondary shadow-xl sm:h-32 sm:w-32">
                {avatarSrc && !avatarBroken ? (
                  <img
                    src={avatarSrc}
                    alt={`Foto de perfil de ${userProfile.username || "sua conta"}`}
                    className="h-full w-full object-cover"
                    onError={() => setAvatarBroken(true)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-display text-4xl font-bold text-muted-foreground">{userProfile.username?.[0]?.toUpperCase() || "Z"}</div>
                )}
              </div>
              <button
                type="button"
                aria-label="Alterar foto de perfil"
                data-testid="button-change-avatar"
                disabled={isUploading}
                className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-background/75 text-foreground opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 disabled:cursor-wait disabled:opacity-100"
                onClick={handleAvatarClick}
              >
                {isUploading ? (
                  <Loader2 className="h-7 w-7 animate-spin" />
                ) : (
                  <span className="flex flex-col items-center gap-1"><Camera className="h-6 w-6" /><span className="text-[10px] font-semibold">Alterar</span></span>
                )}
              </button>
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
                aria-label="Selecionar nova foto de perfil"
              />
            </div>

            <div className="flex items-center gap-2 mt-3 min-w-0">
              <h1 className="font-display text-2xl font-bold text-foreground truncate sm:text-3xl">
                {userProfile.username || "Sem nome de usuário"}
              </h1>
              {userProfile.isZenkatuber && (
                <VerifiedBadge verifiedAt={userProfile.verifiedAt ?? null} size="lg" />
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border border-primary/25 bg-primary/10 text-primary">
                <BadgeCheck className="w-3.5 h-3.5" />
                {userProfile.isZenkatuber ? "Zenkatuber" : "Membro"}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border border-border bg-secondary/60 text-muted-foreground">
                <CalendarDays className="w-3.5 h-3.5" />
                {userProfile.createdAt
                  ? `Membro desde ${format(
                      new Date(userProfile.createdAt),
                      "MMMM 'de' yyyy",
                      { locale: ptBR },
                    )}`
                  : "Membro da Zenkatu"}
              </span>
            </div>
            <p className="mt-3 max-w-lg text-sm text-muted-foreground">
              Mantenha seu perfil atualizado para que a comunidade conheça sua voz e seus projetos.
            </p>
            <Button asChild variant="outline" className="mt-4 gap-2 rounded-lg">
              <Link href={`/perfil/${currentUser?.uid ?? ""}`} aria-label="Ver como seu perfil aparece publicamente">
                <ExternalLink className="h-4 w-4" /> Ver perfil público
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Abas do perfil */}
        <div role="group" aria-label="Seções do perfil" className="flex min-w-0 gap-1 overflow-x-auto rounded-xl border border-border bg-card/50 p-1 backdrop-blur">
          {(
            [
              { key: "perfil", label: "Meu perfil", icon: UserRound },
              { key: "notificacoes", label: "Notificações", icon: Bell },
              { key: "personagens", label: "Projetos", icon: Film },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              aria-pressed={activeTab === tab.key}
              data-testid={`tab-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              className={`flex min-h-11 min-w-0 flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-4 sm:text-sm ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
              {tab.key === "notificacoes" && pendentes.length > 0 && (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {pendentes.length}
                </span>
              )}
              {tab.key === "personagens" && projetos.length > 0 && (
                <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                  activeTab === tab.key
                    ? "bg-primary-foreground/15 text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}>
                  {projetos.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "perfil" && (
        <>

        {/* Informações Pessoais */}
        <Card id="profile-tabpanel-perfil" tabIndex={0} className="border-border bg-card/60 shadow-lg shadow-background/20 backdrop-blur">
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>Atualize seu nome de usuário.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                value={userProfile.email}
                disabled
                className="bg-secondary/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username" className="text-muted-foreground">
                Nome de Usuário
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))
                }
                className="bg-background border-border"
                placeholder="Seu nome de exibição"
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">
                Apenas letras, números e underline (_). Entre 3 e 20 caracteres.
              </p>
            </div>
            <Button
              onClick={handleSave}
              disabled={isSaving || username === userProfile.username}
              data-testid="button-save-username"
              className="min-h-11 rounded-xl font-display font-semibold tracking-wide transition-transform hover:-translate-y-0.5"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Alterações
            </Button>
          </CardContent>
        </Card>

        {/* Biografia */}
        <Card className="min-w-0 border-border bg-card/60 shadow-lg shadow-background/20 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlignLeft className="w-5 h-5" />
              Biografia
            </CardTitle>
            <CardDescription>
              Conte um pouco sobre você — aparece no seu perfil público.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={1000}
              placeholder="Escreva sua biografia..."
              className="min-h-[120px] bg-background border-border resize-y"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">{bio.length}/1000</p>
              <Button
                onClick={handleSaveBio}
                disabled={isSavingBio || bio.trim() === (userProfile.bio || "")}
                data-testid="button-save-bio"
                className="min-h-11 rounded-xl font-display font-semibold tracking-wide transition-transform hover:-translate-y-0.5"
              >
                {isSavingBio ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar biografia
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Portfólio de Voz */}
        <Card className="min-w-0 border-border bg-card/60 shadow-lg shadow-background/20 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5" />
              Portfólio de Voz
            </CardTitle>
            <CardDescription>
              Adicione seus trabalhos de voz. Somente links do Google Drive são aceitos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {portfolio.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground border-2 border-dashed border-border rounded-lg bg-background/50">
                <Mic className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Nenhum trabalho adicionado ainda.</p>
                <p className="text-xs mt-1">Adicione um link do Drive abaixo.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {portfolio.map((item, index) => (
                  <div
                    key={`${item.url}-${index}`}
                    className="flex min-w-0 items-center gap-3 p-3 rounded-lg border border-border bg-background/50 overflow-hidden"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.titulo}
                      </p>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-w-0 items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="min-w-0 truncate">{item.url}</span>
                      </a>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-destructive hover:text-destructive shrink-0"
                      onClick={() => removePortfolioItem(index)}
                      aria-label="Remover item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="portfolioTitulo" className="text-muted-foreground">
                  Título
                </Label>
                <Input
                  id="portfolioTitulo"
                  value={portfolioTitulo}
                  onChange={(e) => setPortfolioTitulo(e.target.value)}
                  placeholder="Ex: Demo reel 2026"
                  className="bg-background border-border"
                  maxLength={80}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="portfolioUrl" className="text-muted-foreground">
                  Link do Google Drive
                </Label>
                <Input
                  id="portfolioUrl"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addPortfolioItem();
                    }
                  }}
                  placeholder="https://drive.google.com/..."
                  className="bg-background border-border"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 shrink-0"
                onClick={addPortfolioItem}
              >
                <Plus className="w-4 h-4" /> Adicionar item
              </Button>
              <Button
                type="button"
                onClick={handleSavePortfolio}
                disabled={isSavingPortfolio}
                data-testid="button-save-voice-portfolio"
                className="min-h-11 rounded-xl font-display font-semibold tracking-wide transition-transform hover:-translate-y-0.5"
              >
                {isSavingPortfolio ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar portfólio
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              No Drive, abra o arquivo em Compartilhar → "Qualquer pessoa com o link".
            </p>
          </CardContent>
        </Card>

        {/* Notificações Push */}
        {push.isSupported && (
          <Card id="profile-tabpanel-notificacoes" tabIndex={0} className="border-border bg-card/60 shadow-lg shadow-background/20 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notificações Push
              </CardTitle>
              <CardDescription>
                Receba avisos no navegador sobre novos episódios e projetos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {push.isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : push.isSubscribed ? (
                <>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <Bell className="w-4 h-4 text-primary shrink-0" />
                    <p className="text-sm text-primary font-medium">Notificações ativadas neste dispositivo.</p>
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm font-medium text-foreground">O que deseja receber:</p>

                    <div className="flex items-center justify-between py-2 border-b border-border/50">
                      <div>
                        <p className="text-sm font-medium">Novos episódios</p>
                        <p className="text-xs text-muted-foreground">Quando um episódio for lançado</p>
                      </div>
                      <Switch
                        aria-label="Receber notificações de novos episódios"
                        checked={localPrefs.notifyEpisodios}
                        onCheckedChange={(checked) => setLocalPrefs((p) => ({ ...p, notifyEpisodios: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium">Novos projetos</p>
                        <p className="text-xs text-muted-foreground">Quando uma nova obra for adicionada</p>
                      </div>
                      <Switch
                        aria-label="Receber notificações de novos projetos"
                        checked={localPrefs.notifyObras}
                        onCheckedChange={(checked) => setLocalPrefs((p) => ({ ...p, notifyObras: checked }))}
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        size="sm"
                        data-testid="button-save-notification-preferences"
                        disabled={prefsSaving || (localPrefs.notifyEpisodios === push.preferences.notifyEpisodios && localPrefs.notifyObras === push.preferences.notifyObras)}
                        onClick={async () => {
                          setPrefsSaving(true);
                          try {
                            await push.updatePreferences(localPrefs);
                            toast({ title: "Preferências salvas!" });
                          } catch {
                            toast({ title: "Erro ao salvar preferências", variant: "destructive" });
                          } finally {
                            setPrefsSaving(false);
                          }
                        }}
                        className="gap-2 rounded-lg"
                      >
                        {prefsSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Salvar preferências
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive gap-2"
                        onClick={async () => {
                          try {
                            await push.unsubscribe();
                            toast({ title: "Notificações desativadas." });
                          } catch {
                            toast({ title: "Erro ao desativar", variant: "destructive" });
                          }
                        }}
                      >
                        <BellOff className="w-3 h-3" />
                        Desativar
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 space-y-4">
                  <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mx-auto">
                    <BellOff className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Notificações desativadas</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ative para receber avisos sobre novos episódios e projetos diretamente no navegador.
                    </p>
                  </div>
                  <Button
                    onClick={async () => {
                      try {
                        await push.subscribe(localPrefs);
                        toast({ title: "Notificações ativadas!" });
                      } catch (e: any) {
                        const msg = e.message?.includes("negada") ? "Permissão negada. Ative nas configurações do navegador." : "Erro ao ativar notificações.";
                        toast({ title: msg, variant: "destructive" });
                      }
                    }}
                    disabled={push.isLoading}
                    className="gap-2"
                  >
                    <Bell className="w-4 h-4" />
                    Ativar notificações
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Zenkatuber */}
          <Card className="border-border bg-card/60 shadow-lg shadow-background/20 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BadgeCheck className="w-5 h-5 text-blue-400" />
                Programa Zenkatuber
              </CardTitle>
              <CardDescription>
                {userProfile.isZenkatuber
                  ? "Você é um criador verificado na plataforma."
                  : "Criadores de fandub verificados podem publicar obras diretamente na plataforma."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userProfile.isZenkatuber ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <BadgeCheck className="w-5 h-5 text-blue-400 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-300">Zenkatuber Oficial</p>
                    {userProfile.verifiedAt && (
                      <p className="text-xs text-muted-foreground">
                        Verificado desde {new Date(userProfile.verifiedAt).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <Button asChild className="gap-2">
                  <Link href="/tornar-se-zenkatuber">
                    <BadgeCheck className="w-4 h-4" />
                    Solicitar verificação
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

        {/* Minha Lista */}
        <Card className="border-border bg-card/60 shadow-lg shadow-background/20 backdrop-blur">
          <CardHeader>
            <CardTitle>Minha Lista</CardTitle>
            <CardDescription>Obras salvas para assistir depois.</CardDescription>
          </CardHeader>
          <CardContent>
            {listaLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : lista.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg bg-background/50">
                <BookmarkX className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>Sua lista está vazia.</p>
                <p className="text-xs mt-1">
                  Adicione obras na página de cada anime.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {lista.map((obra) => (
                  <div key={obra.id} className="group relative">
                    <Link href={`/obra/${obra.slug}`}>
                      <div className="relative aspect-[2/3] rounded-lg overflow-hidden border border-border bg-card transition-all hover:scale-[1.02] hover:border-primary/50 hover:shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                        {!obra.capaUrl && <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center bg-secondary"><Film className="h-8 w-8 text-muted-foreground/50" /></div>}
                        {obra.capaUrl && <img src={obra.capaUrl} alt={obra.titulo} className="relative z-10 h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 right-0 px-2 pb-2">
                          {obra.tipografiaUrl ? (
                            <img
                              src={obra.tipografiaUrl}
                              alt={obra.titulo}
                              className="max-h-8 w-auto object-contain drop-shadow-lg"
                            />
                          ) : (
                            <p className="text-xs font-medium line-clamp-2 drop-shadow">
                              {obra.titulo}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                    <button
                      onClick={() => handleRemoveFromLista(obra.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-all backdrop-blur-sm"
                      title="Remover da lista"
                      aria-label={`Remover ${obra.titulo} da lista`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        </>
        )}

        {/* Notificações de cast */}
        {activeTab === "notificacoes" && (
          <Card id="profile-tabpanel-notificacoes" role="tabpanel" tabIndex={0} className="border-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notificações
                {pendentes.length > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-destructive-foreground">
                    {pendentes.length}
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Convites de elenco enviados por donos de projeto para o seu perfil.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {convitesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : convites.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg bg-background/50">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhuma notificação por enquanto.</p>
                  <p className="text-xs mt-1">
                    Quando alguém te citar no cast de um projeto, o convite aparece aqui.
                  </p>
                </div>
              ) : (
                convites.map((convite) => (
                  <div
                    key={convite.id}
                    className="flex flex-col gap-3 rounded-lg border border-border bg-background/50 p-3 sm:flex-row sm:items-center"
                  >
                    {convite.obraCapa ? (
                      <img
                        src={convite.obraCapa}
                        alt={convite.obraTitulo}
                        className="h-16 w-12 shrink-0 rounded-md border border-border object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-secondary">
                        <Film className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        Você foi mencionado no cast de{" "}
                        <Link
                          href={`/obra/${convite.obraSlug}`}
                          className="text-primary hover:underline"
                        >
                          {convite.obraTitulo}
                        </Link>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Personagem:{" "}
                        <span className="font-semibold text-foreground">
                          {convite.personagem}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(convite.createdAt), "dd 'de' MMMM 'de' yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {convite.status === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            className="gap-1.5"
                            onClick={() => responderConvite(convite.id, true)}
                            disabled={aceitarConvite.isPending}
                          >
                            <Check className="h-4 w-4" /> Aceitar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => responderConvite(convite.id, false)}
                            disabled={recusarConvite.isPending}
                          >
                            <X className="h-4 w-4" /> Recusar
                          </Button>
                        </>
                      ) : convite.status === "accepted" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                          <Check className="h-3.5 w-3.5" /> Aceito
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs text-muted-foreground">
                          Recusado
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Personagens feitos */}
        {activeTab === "personagens" && (
          <Card id="profile-tabpanel-personagens" tabIndex={0} className="border-border bg-card/60 shadow-lg shadow-background/20 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Film className="w-5 h-5" />
                Projetos em que participo
              </CardTitle>
              <CardDescription>
                Seus projetos e as participações de elenco que você confirmou. Este resumo também aparece no seu perfil público.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {personagensLoading || obrasLoading ? (
                <div className="grid gap-3 sm:grid-cols-2" aria-label="Carregando projetos">
                  {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-28 rounded-xl" />)}
                </div>
              ) : personagensError || obrasError ? (
                <div role="alert" className="rounded-lg border border-destructive/25 bg-background/50 p-8 text-center">
                  <p className="text-sm text-muted-foreground">Não foi possível carregar os projetos.</p>
                  <Button
                    onClick={() => void Promise.all([refetchPersonagens(), refetchObras()])}
                    data-testid="button-retry-profile-projects"
                    variant="outline"
                    size="sm"
                    className="mt-4"
                  >
                    Tentar novamente
                  </Button>
                </div>
              ) : projetos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg bg-background/50">
                  <Film className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhum projeto para mostrar ainda.</p>
                  <p className="text-xs mt-1">
                    Seus projetos e participações aceitas vão aparecer aqui.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {projetos.map((projeto) => {
                    return (
                      <article key={projeto.id} className="overflow-hidden rounded-xl border border-border bg-background/50 transition-colors hover:border-primary/35">
                        <Link href={`/obra/${projeto.slug}`} data-testid={`link-profile-project-${projeto.id}`} className="group flex items-center gap-3 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                          {projeto.capaUrl ? (
                            <img src={projeto.capaUrl} alt="" className="h-20 w-14 shrink-0 rounded-md border border-border object-cover" loading="lazy" />
                          ) : (
                            <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded-md border border-border bg-secondary"><Film className="h-5 w-5 text-muted-foreground" /></div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-display text-lg font-bold text-foreground group-hover:text-primary">{projeto.titulo}</p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {projeto.isOwner && <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Criado por você</span>}
                              {projeto.participations.length > 0 && <span className="rounded-full border border-border bg-secondary/70 px-2 py-0.5 text-[10px] text-muted-foreground">{projeto.participations.length} {projeto.participations.length === 1 ? "personagem" : "personagens"}</span>}
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                        </Link>
                        {projeto.participations.length > 0 ? (
                          <div className="border-t border-border/70 px-3 py-3">
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Participação confirmada</p>
                            <ul className="space-y-2">
                              {projeto.participations.map((entry) => (
                                <li key={entry.id} className="flex min-w-0 items-start justify-between gap-3 text-sm">
                                  <span className="min-w-0 truncate font-medium text-foreground">{entry.personagem}</span>
                                  <span className="shrink-0 text-right text-xs text-muted-foreground">como {entry.nome}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p className="border-t border-border/70 px-3 py-3 text-xs text-muted-foreground">Você é responsável por este projeto.</p>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </motion.div>
  );
}
