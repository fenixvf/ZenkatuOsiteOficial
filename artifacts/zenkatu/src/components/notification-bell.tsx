import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, ExternalLink, Megaphone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation } from "wouter";

const LAST_SEEN_KEY = "zenkatu:notif-last-seen";
const API_BASE = "/api";

interface Notificacao {
  id: number;
  title: string;
  body: string;
  image?: string | null;
  url?: string | null;
  type: string;
  sentAt: string;
}

function useNotificacoes(isSubscribed: boolean) {
  const [notifs, setNotifs] = useState<Notificacao[]>([]);

  useEffect(() => {
    if (!isSubscribed) return;
    fetch(`${API_BASE}/push/historico`)
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setNotifs(data.slice(0, 3)))
      .catch(() => {});
  }, [isSubscribed]);

  return notifs;
}

function useUnreadCount(notifs: Notificacao[]) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (notifs.length === 0) return;
    const lastSeen = Number(localStorage.getItem(LAST_SEEN_KEY) ?? 0);
    setUnread(notifs.filter((n) => new Date(n.sentAt).getTime() > lastSeen).length);
  }, [notifs]);

  const markAllRead = () => {
    localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
    setUnread(0);
  };

  return { unread, markAllRead };
}

export function NotificationBell({ isSubscribed }: { isSubscribed: boolean }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [, setLocation] = useLocation();

  const notifs = useNotificacoes(isSubscribed);
  const { unread, markAllRead } = useUnreadCount(notifs);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!isSubscribed || notifs.length === 0) return null;

  const handleOpen = () => {
    setOpen((v) => !v);
    if (!open) markAllRead();
  };

  const handleNotifClick = (url: string | null | undefined) => {
    setOpen(false);
    if (url && url.startsWith("/")) {
      setLocation(url);
    } else if (url) {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Notificações"
      >
        <Bell className="w-5 h-5" />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center"
            >
              {unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 z-[200] rounded-2xl border border-border bg-card shadow-2xl shadow-black/30 overflow-hidden"
          >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Notificações</span>
              </div>
              <span className="text-xs text-muted-foreground">Últimas {notifs.length}</span>
            </div>

            {/* Lista */}
            <div className="divide-y divide-border/40">
              {notifs.map((n, i) => (
                <motion.button
                  key={n.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleNotifClick(n.url)}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-secondary/60 transition-colors text-left group"
                >
                  {n.image ? (
                    <img
                      src={n.image}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover shrink-0 mt-0.5"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Bell className="w-4 h-4 text-primary" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground line-clamp-1 leading-snug">
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                      {n.body}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(n.sentAt), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>

                  {n.url && (
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 mt-1 transition-colors" />
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
