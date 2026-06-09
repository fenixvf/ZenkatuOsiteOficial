import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { ExternalLink, AlertCircle } from "lucide-react";

function isInIframe() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export default function Login() {
  const { signInWithGoogle, currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inIframe, setInIframe] = useState(false);

  useEffect(() => {
    setInIframe(isInIframe());
  }, []);

  useEffect(() => {
    if (currentUser) {
      setLocation("/");
    }
  }, [currentUser, setLocation]);

  const handleLogin = async () => {
    try {
      setError(null);
      setIsLoggingIn(true);
      await signInWithGoogle();
    } catch (error: any) {
      console.error(error);
      setError("Não foi possível fazer login. Tente abrir o app em uma nova aba.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleOpenNewTab = () => {
    window.open(window.location.href, "_blank");
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full space-y-4"
        >
          {/* Aviso quando dentro do iframe do Replit */}
          {inIframe && (
            <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-left mb-2">
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-400 font-medium">Preview do editor detectado</p>
                <p className="text-xs text-muted-foreground mt-1">
                  O login com Google não funciona dentro do preview. Abra o app em uma nova aba para fazer login.
                </p>
              </div>
            </div>
          )}

          {inIframe ? (
            <Button
              onClick={handleOpenNewTab}
              className="w-full h-14 text-lg font-medium font-sans bg-primary hover:bg-primary/90 text-primary-foreground transition-all gap-3"
            >
              <ExternalLink className="w-5 h-5" />
              Abrir em nova aba para fazer login
            </Button>
          ) : (
            <Button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full h-14 text-lg font-medium font-sans bg-primary hover:bg-primary/90 text-primary-foreground transition-all"
            >
              {isLoggingIn ? "Conectando..." : "Entrar com Google"}
            </Button>
          )}

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <div className="mt-4 text-sm text-muted-foreground/60">
            Ao entrar, você concorda com nossos Termos de Serviço e Política de Privacidade.
          </div>
        </motion.div>
      </div>
    </div>
  );
}
