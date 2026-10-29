import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import {
  useUpdateUsuario,
  useUploadAvatar,
  useGetUsuarioLista,
  useRemoveFromLista,
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
import {
  Camera,
  Loader2,
  Save,
  Trash2,
  BookmarkX,
  Bell,
  BellOff,
  BadgeCheck,
  CalendarDays,
  AlignLeft,
  ExternalLink,
  Mic,
  Plus,
} from "lucide-react";
import { VerifiedBadge } from "@/components/verified-badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePushNotifications } from "@/hooks/use-push-notifications";

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
  const { currentUser, userProfile, loading, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateUsuario = useUpdateUsuario();
  const uploadAvatar = useUploadAvatar();
  const removeFromLista = useRemoveFromLista();

  const push = usePushNotifications(currentUser?.uid ?? null);
  const [localPrefs, setLocalPrefs] = useState({ notifyEpisodios: true, notifyObras: true });
  const [prefsSaving, setPrefsSaving] = useState(false);

  useEffect(() => {
    if (!push.isLoading) {
      setLocalPrefs(push.preferences);
    }
  }, [push.isLoading, push.preferences]);

  const [username, setUsername] = useState(userProfile?.username || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  if (loading || !userProfile) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
      className="container mx-auto w-full min-w-0 max-w-screen-md overflow-x-clip px-4 py-8"
    >
      <div className="grid min-w-0 gap-6">
        {/* Cabeçalho do perfil */}
        <Card className="border-border bg-card/50 backdrop-blur overflow-hidden">
          <div className="h-28 bg-gradient-to-br from-primary/40 via-primary/10 to-transparent relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.35),transparent_60%)]" />
          </div>
          <CardContent className="px-6 pb-6 -mt-14 flex flex-col items-center text-center">
            <div className="relative group shrink-0">
              <div className="h-28 w-28 rounded-full border-4 border-background shadow-xl overflow-hidden bg-secondary flex items-center justify-center">
                <img
                  src={avatarSrc}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                {!avatarSrc && (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-muted-foreground">
                    {userProfile.username?.[0]?.toUpperCase() ||
                      currentUser?.email?.[0]?.toUpperCase() ||
                      "Z"}
                  </div>
                )}
              </div>
              <div
                className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity"
                onClick={handleAvatarClick}
              >
                {isUploading ? (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : (
                  <Camera className="w-8 h-8 text-white" />
                )}
              </div>
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
            </div>

            <div className="flex items-center gap-2 mt-3 min-w-0">
              <h1 className="font-display text-2xl font-bold text-foreground truncate">
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

          </CardContent>
        </Card>

        {/* Informações Pessoais */}
        <Card className="border-border bg-card/50 backdrop-blur">
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
              className="font-display tracking-wide"
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
        <Card className="min-w-0 border-border bg-card/50 backdrop-blur">
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
                className="font-display tracking-wide"
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
        <Card className="min-w-0 border-border bg-card/50 backdrop-blur">
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
                className="font-display tracking-wide"
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
          <Card className="border-border bg-card/50 backdrop-blur">
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
                        checked={localPrefs.notifyObras}
                        onCheckedChange={(checked) => setLocalPrefs((p) => ({ ...p, notifyObras: checked }))}
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        size="sm"
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
                        className="gap-2"
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
        <Card className="border-border bg-card/50 backdrop-blur">
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
        <Card className="border-border bg-card/50 backdrop-blur">
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
                        <img
                          src={
                            obra.capaUrl ||
                            `https://placehold.co/400x600/0F1C2E/1E3A8A?text=${obra.titulo}`
                          }
                          alt={obra.titulo}
                          className="w-full h-full object-cover"
                        />
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
                    >
                      <Trash2 className="w-3 h-3" />
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
