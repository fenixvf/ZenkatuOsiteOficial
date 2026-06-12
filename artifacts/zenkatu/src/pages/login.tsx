import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const { signInWithEmail, signUpWithEmail, currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setLocation("/");
    }
  }, [currentUser, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isRegister && password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (isRegister && password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    try {
      setIsLoading(true);
      if (isRegister) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      console.error("Firebase auth error:", err?.code, err?.message);
      const code = err?.code;
      if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("E-mail ou senha incorretos.");
      } else if (code === "auth/email-already-in-use") {
        setError("Este e-mail já possui uma conta. Faça login.");
      } else if (code === "auth/invalid-email") {
        setError("E-mail inválido.");
      } else if (code === "auth/weak-password") {
        setError("Senha muito fraca. Use pelo menos 6 caracteres.");
      } else if (code === "auth/too-many-requests") {
        setError("Muitas tentativas. Aguarde um momento.");
      } else if (code === "auth/unauthorized-domain") {
        setError("Domínio não autorizado. Adicione este domínio no Firebase Console.");
      } else {
        setError(`Erro: ${code || err?.message || "desconhecido"}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError(null);
    setPassword("");
    setConfirmPassword("");
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
          <p className="text-muted-foreground mb-8">Projetos de fãs para fãs</p>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.form
            key={isRegister ? "register" : "login"}
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="w-full space-y-4"
          >
            <p className="text-sm font-medium text-foreground mb-2">
              {isRegister ? "Criar nova conta" : "Entrar na sua conta"}
            </p>

            <div className="text-left space-y-1">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
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
                autoComplete={isRegister ? "new-password" : "current-password"}
              />
            </div>

            {isRegister && (
              <div className="text-left space-y-1">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 text-base font-medium font-sans bg-primary hover:bg-primary/90 text-primary-foreground transition-all"
            >
              {isLoading ? (isRegister ? "Criando conta..." : "Entrando...") : (isRegister ? "Criar conta" : "Entrar")}
            </Button>

            <button
              type="button"
              onClick={toggleMode}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isRegister ? "Já tem conta? Faça login" : "Não tem conta? Cadastre-se"}
            </button>

            <div className="mt-2 text-xs text-muted-foreground/60">
              Ao entrar, você concorda com nossos Termos de Serviço e Política de Privacidade.
            </div>
          </motion.form>
        </AnimatePresence>
      </div>
    </div>
  );
}
