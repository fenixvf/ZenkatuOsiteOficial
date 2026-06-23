import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Loader2, Send, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function AdminNotificacoes() {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState("");
  const [url, setUrl] = useState("/");
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ sent: number; failed: number } | null>(null);

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
          adminEmail: currentUser?.email,
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
        description: `${data.sent} entregues, ${data.failed} falhas.`,
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
          <p className="text-muted-foreground mt-1">Envie notificações personalizadas para os usuários inscritos.</p>
        </div>
      </div>

      <Card className="border-border bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Enviar Notificação Personalizada</CardTitle>
          <CardDescription>
            A notificação será entregue a todos os usuários que ativaram push e não filtraram o tipo.
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
            <p className="text-xs text-muted-foreground">{title.length}/80 caracteres</p>
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
            <p className="text-xs text-muted-foreground">{body.length}/200 caracteres</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notif-image">URL da Imagem (opcional)</Label>
            <Input
              id="notif-image"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://..."
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">Imagem exibida junto à notificação (alguns navegadores suportam).</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notif-url">URL de destino ao clicar</Label>
            <Input
              id="notif-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/"
              className="bg-background"
            />
          </div>

          {lastResult && (
            <div className="p-3 rounded-lg bg-secondary/50 border border-border text-sm">
              <span className="text-green-400 font-medium">{lastResult.sent} enviadas com sucesso</span>
              {lastResult.failed > 0 && (
                <span className="text-muted-foreground ml-2">· {lastResult.failed} falhas (subscriptions expiradas removidas)</span>
              )}
            </div>
          )}

          <Button
            onClick={handleSend}
            disabled={isSending || !title.trim() || !body.trim()}
            className="w-full gap-2"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {isSending ? "Enviando..." : "Enviar para todos os inscritos"}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
