import { useRef, useState } from "react";
import { Loader2, ImagePlus, Trash2, Upload } from "lucide-react";
import { useUploadImagen } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Lado máximo preservado; o servidor corta os maiores no mesmo tamanho.
const MAX_DIMENSION = 1600;
const QUALITY = 0.82;

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Arquivo de imagem inválido"));
    img.src = src;
  });
}

/** Reduz a imagem e a converte para WebP leve no próprio navegador. */
export async function fileToWebpDataUrl(file: File): Promise<string> {
  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);

  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL("image/webp", QUALITY);
}

interface ImageUploadFieldProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  /** Classe do quadro de pré-visualização (ex.: "h-28 w-20"). */
  previewClassName?: string;
  hint?: string;
  buttonLabel?: string;
  /** Ajuste da pré-visualização: "cover" (capa/banner) ou "contain" (tipografia). */
  fit?: "cover" | "contain";
}

export function ImageUploadField({
  value,
  onChange,
  previewClassName = "h-28 w-20",
  hint,
  buttonLabel,
  fit = "cover",
}: ImageUploadFieldProps) {
  const uploadImagen = useUploadImagen();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Selecione um arquivo de imagem", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const imageData = await fileToWebpDataUrl(file);
      const res = await uploadImagen.mutateAsync({ data: { imageData } });
      onChange(res.url);
      toast({
        title: "Imagem enviada",
        description: "Convertida para WebP e salva no banco de dados.",
      });
    } catch {
      toast({ title: "Erro ao enviar a imagem", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div
          className={cn(
            "shrink-0 max-w-full overflow-hidden rounded-lg border border-border bg-background/60",
            previewClassName,
          )}
        >
          {value ? (
            <img
              src={value}
              alt="Pré-visualização"
              className={cn("h-full w-full", fit === "contain" ? "object-contain p-1" : "object-cover")}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
              <ImagePlus className="h-6 w-6" />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="gap-2"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading
                ? "Convertendo..."
                : buttonLabel || (value ? "Trocar imagem" : "Enviar imagem")}
            </Button>

            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={uploading}
                onClick={() => onChange(null)}
                className="gap-2 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Remover
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {hint ||
              "PNG, JPG ou WebP — convertida para WebP leve e salva no banco de dados."}
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
