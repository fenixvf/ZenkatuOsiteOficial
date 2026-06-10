import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const { signInWithEmail, currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setLocation("/");
    }
  }, [currentUser, setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setIsLoggingIn(true);
      await signInWithEmail(email, password);
    } catch (err: any) {
      console.error("Firebase login error:", err?.code, err?.message);
      const code = err?.code;
      if (
        code === "auth/user-not-found" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential"
      ) {
        setError("E-mail ou senha incorretos.");
      } else if (code === "auth/invalid-email") {
        setError("E-mail inválido.");
      } else if (code === "auth/too-many-requests") {
        setError("Muitas tentativas. Aguarde um momento e tente novamente.");
      } else if (code === "auth/unauthorized-domain") {
        setError("Domínio não autorizado no Firebase. Adicione este domínio nas configurações do Firebase Console.");
      } else if (code === "auth/network-request-failed") {
        setError("Erro de conexão. Verifique sua internet e tente novamente.");
      } else {
        setError(`Erro: ${code || err?.message || "desconhecido"}`);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-background">
      <div
        className="absolute inset-0 z-0 opacity-40"
        style={{
          background: "linear-gradient(45deg, var(--color-background), var(--color-card), var(--color-background), #0a1628)",
          backgroundSize: "400% 400%",
          animation: "gradient 15s ease infinite",
        }}
      />
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}} />

      <div className="relative z-10 w-full max-w-md p-8 md:p-12 glass-panel rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-display text-5xl font-bold tracking-widest text-primary mb-2">ZENKATU</h1>
          <p className="text-muted-foreground mb-8">Sua plataforma premium de animes</p>
        </motion.div>

        <motion.form
          onSubmit={handleLogin}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full space-y-4"
        >
          <div className="text-left space-y-1">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="text-left space-y-1">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button
            type="submit"
            disabled={isLoggingIn}
            className="w-full h-12 text-base font-medium font-sans bg-primary hover:bg-primary/90 text-primary-foreground transition-all"
          >
            {isLoggingIn ? "Entrando..." : "Entrar"}
          </Button>

          <div className="mt-4 text-sm text-muted-foreground/60">
            Ao entrar, você concorda com nossos Termos de Serviço e Política de Privacidade.
          </div>
        </motion.form>
      </div>
    </div>
  );
}
