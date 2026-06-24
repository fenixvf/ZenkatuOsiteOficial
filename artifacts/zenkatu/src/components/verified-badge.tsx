import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface VerifiedBadgeProps {
  verifiedAt?: string | null;
  size?: "sm" | "md" | "lg";
}

export function VerifiedBadge({ verifiedAt, size = "sm" }: VerifiedBadgeProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const sizeMap = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const iconSize = sizeMap[size];

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex items-center"
        aria-label="Zenkatuber verificado"
        title="Zenkatuber verificado"
      >
        <BadgeCheck className={`${iconSize} text-blue-400 fill-blue-500/20 hover:text-blue-300 transition-colors`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[300] w-52 rounded-xl border border-blue-500/30 bg-card shadow-xl shadow-black/30 p-3"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-blue-300">Zenkatuber Oficial</span>
            </div>
            {verifiedAt && (
              <p className="text-xs text-muted-foreground">
                Verificado desde{" "}
                <span className="text-foreground font-medium">
                  {format(new Date(verifiedAt), "dd 'de' MMM, yyyy", { locale: ptBR })}
                </span>
              </p>
            )}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1.5 w-3 h-3 rotate-45 bg-card border-r border-b border-blue-500/30" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
