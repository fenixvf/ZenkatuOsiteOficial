import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import {
  useUpdateUsuario,
  useUploadAvatar,
  useGetUsuarioLista,
  useRemoveFromLista,
  useGetUsuarioHistorico,
  useClearHistorico,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Camera, Loader2, Save, Trash2, BookmarkX, History, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Perfil() {
  const { currentUser, userProfile, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateUsuario = useUpdateUsuario();
  const uploadAvatar = useUploadAvatar();
  const removeFromLista = useRemoveFromLista();
  const clearHistorico = useClearHistorico();

  const [username, setUsername] = useState(userProfile?.username || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const { data: historicoRaw, isLoading: historicoLoading } = useGetUsuarioHistorico(
    currentUser?.uid || "",
    {
      query: {
        enabled: !!currentUser?.uid,
        queryKey: ["getUsuarioHistorico", currentUser?.uid || ""],
      },
    },
  );
  const historico = Array.isArray(historicoRaw) ? historicoRaw : [];

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

  const handleClearHistorico = async () => {
    if (!currentUser) return;
    try {
      await clearHistorico.mutateAsync({ uid: currentUser.uid });
      queryClient.invalidateQueries({
        queryKey: ["getUsuarioHistorico", currentUser.uid],
      });
      toast({ title: "Histórico limpo" });
    } catch {
      toast({ title: "Erro ao limpar histórico", variant: "destructive" });
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
      className="container max-w-screen-md mx-auto px-4 py-8"
    >
      <div className="flex items-center gap-4 mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">
          Meu Perfil
        </h1>
      </div>

      <div className="grid gap-6">
        {/* Informações Pessoais */}
        <Card className="border-border bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>
              Atualize seu nome de usuário e foto de perfil.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
              <div className="relative group shrink-0">
                <div className="h-32 w-32 rounded-full border-4 border-background shadow-xl overflow-hidden bg-secondary">
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

              <div className="flex-1 space-y-4 w-full">
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
                      setUsername(
                        e.target.value.replace(/[^a-zA-Z0-9_]/g, ""),
                      )
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
              </div>
            </div>
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
                        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <p className="absolute bottom-0 left-0 right-0 p-2 text-xs font-medium line-clamp-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                          {obra.titulo}
                        </p>
                      </div>
                    </Link>
                    <button
                      onClick={() => handleRemoveFromLista(obra.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
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

        {/* Histórico */}
        <Card className="border-border bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Histórico
              </CardTitle>
              <CardDescription>
                Episódios assistidos recentemente.
              </CardDescription>
            </div>
            {historico.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive shrink-0">
                    <Trash2 className="w-4 h-4 mr-1" />
                    Limpar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Limpar histórico?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Todos os episódios assistidos serão removidos do seu histórico. Essa ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearHistorico}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Limpar histórico
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardHeader>
          <CardContent>
            {historicoLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : historico.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg bg-background/50">
                <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>Nenhum episódio no histórico ainda.</p>
                <p className="text-xs mt-1">Assista algum episódio para ele aparecer aqui.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historico.map((item) => (
                  <Link key={item.id} href={`/obra/${item.obraSlug}`}>
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/50 hover:border-primary/40 hover:bg-primary/5 transition-all group cursor-pointer">
                      <img
                        src={item.obraCapaUrl || `https://placehold.co/56x80/0F1C2E/1E3A8A`}
                        alt={item.obraTitulo}
                        className="w-12 h-16 object-cover rounded flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">
                          {item.obraTitulo}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          T{item.episodioTemporada} E{item.episodioNumero} — {item.episodioTitulo}
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(item.watchedAt), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
