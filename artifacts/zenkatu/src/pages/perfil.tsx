import { useState, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useUpdateUsuario, useUploadAvatar } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Perfil() {
  const { currentUser, userProfile, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const updateUsuario = useUpdateUsuario();
  const uploadAvatar = useUploadAvatar();
  
  const [username, setUsername] = useState(userProfile?.username || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!loading && !currentUser) {
    setLocation("/login");
    return null;
  }

  if (loading || !userProfile) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const handleSave = async () => {
    if (!username || username.length < 3 || username.length > 20) {
      toast({
        title: "Nome de usuário inválido",
        description: "O nome deve ter entre 3 e 20 caracteres.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSaving(true);
      await updateUsuario.mutateAsync({
        uid: currentUser!.uid,
        data: { username }
      });
      toast({
        title: "Perfil atualizado",
        description: "Seu nome de usuário foi salvo com sucesso."
      });
    } catch (e) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar o perfil.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

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
        
        // Resize image if it's too large (max 500x500 for avatar)
        const MAX_SIZE = 500;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(async (blob) => {
          if (!blob) {
            setIsUploading(false);
            return;
          }
          
          const webpReader = new FileReader();
          webpReader.onload = async () => {
            const base64data = webpReader.result as string;
            // The API expects imageData, let's call the upload mutation
            try {
              const res = await uploadAvatar.mutateAsync({
                data: { imageData: base64data }
              });
              
              await updateUsuario.mutateAsync({
                uid: currentUser!.uid,
                data: { photoUrl: res.photoUrl }
              });
              
              toast({
                title: "Avatar atualizado",
                description: "Sua foto de perfil foi alterada com sucesso."
              });
            } catch (error) {
              toast({
                title: "Erro no upload",
                description: "Não foi possível enviar a imagem.",
                variant: "destructive"
              });
            } finally {
              setIsUploading(false);
            }
          };
          webpReader.readAsDataURL(blob);
        }, "image/webp", 0.75);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container max-w-screen-md mx-auto px-4 py-8"
    >
      <div className="flex items-center gap-4 mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Meu Perfil</h1>
      </div>

      <div className="grid gap-6">
        <Card className="border-border bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>Atualize seu nome de usuário e foto de perfil.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
              <div className="relative group">
                <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                  <AvatarImage src={userProfile.photoUrl || currentUser?.photoURL || ""} />
                  <AvatarFallback className="text-4xl bg-secondary">
                    {userProfile.username?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || "Z"}
                  </AvatarFallback>
                </Avatar>
                
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
                  <Label htmlFor="email" className="text-muted-foreground">Email</Label>
                  <Input 
                    id="email" 
                    value={userProfile.email} 
                    disabled 
                    className="bg-secondary/50 border-border"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-muted-foreground">Nome de Usuário</Label>
                  <Input 
                    id="username" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} 
                    className="bg-background border-border"
                    placeholder="Seu nome de exibição"
                    maxLength={20}
                  />
                  <p className="text-xs text-muted-foreground">Apenas letras, números e underline (_). Entre 3 e 20 caracteres.</p>
                </div>

                <Button 
                  onClick={handleSave} 
                  disabled={isSaving || username === userProfile.username}
                  className="font-display tracking-wide"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Salvar Alterações
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid sm:grid-cols-2 gap-6">
          <Card className="border-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
              <CardDescription>Episódios assistidos recentemente.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg bg-background/50">
                <p>Nenhum episódio no histórico ainda.</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Minha Lista</CardTitle>
              <CardDescription>Obras salvas para assistir depois.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg bg-background/50">
                <p>Sua lista está vazia.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
