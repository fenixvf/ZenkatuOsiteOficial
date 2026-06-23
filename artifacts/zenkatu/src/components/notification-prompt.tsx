import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Sparkles } from "lucide-react";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

const DISMISSED_KEY = "zenkatu:notif-prompt-dismissed";

export function NotificationPrompt() {
  const { currentUser } = useAuth();
  const push = usePushNotifications(currentUser?.uid ?? null);
  const { toast } = useToast();
  const [visible, setVisible] = useState(false);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    if (
      !push.isLoading &&
      push.isSupported &&
      !push.isSubscribed &&
      !push.isNativeApp &&        // não mostrar dentro do app Median
      currentUser &&
      !localStorage.getItem(DISMISSED_KEY)
    ) {
      const timer = setTimeout(() => setVisible(true), 2500);
      return () => clearTimeout(timer);
    }
  }, [push.isLoading, push.isSupported, push.isSubscribed, push.isNativeApp, currentUser]);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  };

  const handleActivate = async () => {
    setActivating(true);
    try {
      await push.subscribe();
      setVisible(false);
      localStorage.setItem(DISMISSED_KEY, "1");
      toast({
        title: "🔔 Notificações ativadas!",
        description: "Você vai receber avisos de novos episódios e animes.",
      });
    } catch (e: any) {
      const denied = e?.message?.includes("negada");
      toast({
        title: denied
          ? "Permissão negada"
          : "Erro ao ativar notificações",
        description: denied
          ? "Ative a permissão de notificações nas configurações do navegador."
          : "Tente novamente mais tarde.",
        variant: "destructive",
      });
      handleDismiss();
    } finally {
      setActivating(false);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-2rem)] max-w-sm"
        >
          <div className="relative rounded-2xl overflow-hidden border border-primary/30 bg-card shadow-2xl shadow-black/40">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />

            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors z-10"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-4 p-5 pr-10">
              <div className="relative shrink-0 mt-0.5">
                <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Bell className="w-6 h-6 text-primary" />
                </div>
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-xl bg-primary/20"
                />
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <Sparkles className="w-2.5 h-2.5 text-primary-foreground" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-snug">
                  Fique por dentro dos lançamentos
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Ative as notificações e receba alertas de novos episódios e animes na hora.
                </p>

                <div className="flex gap-2 mt-3.5">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleActivate}
                    disabled={activating}
                    className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    {activating ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                        className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                      />
                    ) : (
                      <>
                        <Bell className="w-3.5 h-3.5" />
                        Ativar agora
                      </>
                    )}
                  </motion.button>
                  <button
                    onClick={handleDismiss}
                    className="px-3 h-9 rounded-xl bg-secondary/60 text-muted-foreground text-xs font-medium hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    Agora não
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
