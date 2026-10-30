import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-8 w-8",
} as const;

type StarRatingProps = {
  /** Nota atual (0–5). */
  value: number;
  /** Quando informado, as estrelas viram botões clicáveis. */
  onChange?: (estrelas: number) => void;
  size?: keyof typeof SIZES;
  className?: string;
  /** Mostra o valor ao lado das estrelas (ex.: "4,8"). */
  label?: string;
};

/** Estrelas de avaliação — exibição simples ou interativa (com `onChange`). */
export function StarRating({
  value,
  onChange,
  size = "md",
  className,
  label,
}: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const ativas = hover || value;
  const interativo = Boolean(onChange);
  const iconSize = SIZES[size];

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      onMouseLeave={() => setHover(0)}
      role={interativo ? "radiogroup" : "img"}
      aria-label={`Avaliação: ${value} de 5 estrelas`}
    >
      {[1, 2, 3, 4, 5].map((estrela) => {
        const preenchida = estrela <= ativas;
        const star = (
          <Star
            className={cn(
              iconSize,
              "transition-colors",
              preenchida
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-white/25",
            )}
          />
        );

        if (!interativo) return <span key={estrela}>{star}</span>;

        return (
          <button
            key={estrela}
            type="button"
            aria-label={`Avaliar com ${estrela} ${estrela === 1 ? "estrela" : "estrelas"}`}
            onMouseEnter={() => setHover(estrela)}
            onFocus={() => setHover(estrela)}
            onBlur={() => setHover(0)}
            onClick={() => onChange?.(estrela)}
            className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
          >
            {star}
          </button>
        );
      })}
      {label ? (
        <span className="ml-1.5 text-sm font-semibold text-amber-300">
          {label}
        </span>
      ) : null}
    </div>
  );
}
