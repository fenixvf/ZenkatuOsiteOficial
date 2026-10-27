import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, CloudUpload, KeyRound, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

const STORAGE_KEY = "zenkatu.archive.org.credentials.v1";

type ArchiveCredentials = {
  accessKey: string;
  secretKey: string;
};

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; progress: number; speed: number }
  | { status: "success"; url: string }
  | { status: "error"; message: string }
  | { status: "cancelled"; message: string };

function slugify(value: string, maxLength = 80): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}

function makeFileName(originalName: string): string {
  const name = originalName.replace(/\.mp4$/i, "");
  return `${slugify(name, 100) || "video"}.mp4`;
}

function formatBytesPerSecond(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B/s";
  const units = ["B/s", "KB/s", "MB/s", "GB/s"];
  let amount = value;
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit += 1;
  }
  return `${amount.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${units[unit]}`;
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let amount = value;
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit += 1;
  }
  return `${amount.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${units[unit]}`;
}

export interface ArchiveUploaderProps {
  animeTitle: string;
  season: number;
  episodeNumber: number;
  episodeTitle: string;
  currentUrl: string;
  onUploaded: (url: string) => void;
}

export function ArchiveUploader({
  animeTitle,
  season,
  episodeNumber,
  episodeTitle,
  currentUrl,
  onUploaded,
}: ArchiveUploaderProps) {
  const [credentials, setCredentials] = useState<ArchiveCredentials>({
    accessKey: "",
    secretKey: "",
  });
  const [credentialsLoaded, setCredentialsLoaded] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle" });
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const cancelledByUserRef = useRef(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<ArchiveCredentials>;
        setCredentials({
          accessKey: typeof parsed.accessKey === "string" ? parsed.accessKey : "",
          secretKey: typeof parsed.secretKey === "string" ? parsed.secretKey : "",
        });
      }
    } catch {
      setAvailabilityMessage("Não foi possível ler as chaves salvas neste navegador.");
    } finally {
      setCredentialsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!credentialsLoaded) return;
    try {
      if (credentials.accessKey || credentials.secretKey) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      setAvailabilityMessage("Não foi possível salvar as chaves neste navegador.");
    }
  }, [credentials, credentialsLoaded]);

  useEffect(() => {
    return () => {
      xhrRef.current?.abort();
      xhrRef.current = null;
    };
  }, []);

  const clearCredentials = () => {
    setCredentials({ accessKey: "", secretKey: "" });
    setAvailabilityMessage("Chaves removidas deste navegador.");
  };

  const upload = () => {
    if (!file) {
      setUploadState({ status: "error", message: "Selecione um arquivo .mp4 para enviar." });
      return;
    }
    if (!/\.mp4$/i.test(file.name) || (file.type && file.type !== "video/mp4")) {
      setUploadState({ status: "error", message: "Selecione um arquivo MP4 válido." });
      return;
    }

    const accessKey = credentials.accessKey.trim();
    const secretKey = credentials.secretKey.trim();
    if (!accessKey || !secretKey) {
      setUploadState({ status: "error", message: "Preencha a access key e a secret key do Archive.org." });
      return;
    }
    if (/[\r\n]/.test(accessKey) || /[\r\n]/.test(secretKey)) {
      setUploadState({ status: "error", message: "As chaves contêm caracteres inválidos." });
      return;
    }

    const metadataTitle = `${animeTitle} - T${season}E${episodeNumber} - ${episodeTitle}`.trim();
    const identifierSlug = slugify(`${animeTitle}-t${season}e${episodeNumber}-${episodeTitle}`, 80) || "video";
    const identifier = `zenkatu-${identifierSlug}-${Date.now()}`;
    const fileName = makeFileName(file.name);
    const url = `https://archive.org/download/${identifier}/${fileName}`;
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    cancelledByUserRef.current = false;
    setUploadState({ status: "uploading", progress: 0, speed: 0 });
    setAvailabilityMessage("");

    let lastLoaded = 0;
    let lastTime = Date.now();
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const now = Date.now();
      const elapsedSeconds = Math.max((now - lastTime) / 1000, 0.001);
      const speed = (event.loaded - lastLoaded) / elapsedSeconds;
      lastLoaded = event.loaded;
      lastTime = now;
      setUploadState({
        status: "uploading",
        progress: Math.min(100, (event.loaded / event.total) * 100),
        speed,
      });
    };

    xhr.onload = () => {
      xhrRef.current = null;
      if (xhr.status === 200) {
        setUploadState({ status: "success", url });
        onUploaded(url);
        return;
      }
      if (xhr.status === 403) {
        setUploadState({ status: "error", message: "Acesso negado: confira se as chaves do Archive.org estão corretas." });
      } else if (xhr.status === 429 || xhr.status === 503) {
        setUploadState({ status: "error", message: "O Archive.org está recebendo muitos envios. Aguarde um pouco e tente novamente." });
      } else {
        setUploadState({ status: "error", message: `O Archive.org recusou o envio (HTTP ${xhr.status}). Tente novamente.` });
      }
    };

    xhr.onerror = () => {
      xhrRef.current = null;
      setUploadState({
        status: "error",
        message: "A conexão foi interrompida. Verifique sua internet e tente enviar novamente.",
      });
    };

    xhr.onabort = () => {
      xhrRef.current = null;
      if (cancelledByUserRef.current) {
        setUploadState({ status: "cancelled", message: "Envio cancelado. O arquivo pode ter sido enviado parcialmente." });
      }
    };

    try {
      xhr.open("PUT", `https://s3.us.archive.org/${identifier}/${fileName}`);
      xhr.setRequestHeader("authorization", `LOW ${accessKey}:${secretKey}`);
      xhr.setRequestHeader("x-archive-auto-make-bucket", "1");
      xhr.setRequestHeader("x-archive-meta-mediatype", "movies");
      xhr.setRequestHeader("x-archive-meta-title", encodeURIComponent(metadataTitle));
      xhr.setRequestHeader("x-archive-queue-derive", "0");
      xhr.send(file);
    } catch {
      xhrRef.current = null;
      setUploadState({
        status: "error",
        message: "Não foi possível iniciar o envio. Confira as chaves e tente novamente.",
      });
    }
  };

  const cancelUpload = () => {
    if (!xhrRef.current) return;
    cancelledByUserRef.current = true;
    xhrRef.current.abort();
  };

  const checkAvailability = async () => {
    const url = uploadState.status === "success" ? uploadState.url : currentUrl.trim();
    if (!url || !/^https:\/\/archive\.org\/download\//i.test(url)) {
      setAvailabilityMessage("Envie um vídeo ou informe uma URL direta do Archive.org primeiro.");
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    setCheckingAvailability(true);
    setAvailabilityMessage("");
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Range: "bytes=0-0" },
        cache: "no-store",
        signal: controller.signal,
      });
      if (response.ok || response.status === 206) {
        setAvailabilityMessage("O vídeo já está disponível no Archive.org.");
        await response.body?.cancel();
      } else if (response.status === 404 || response.status === 403) {
        setAvailabilityMessage("O vídeo ainda não está disponível publicamente. Aguarde alguns minutos e verifique novamente.");
      } else if (response.status === 429 || response.status === 503) {
        setAvailabilityMessage("O Archive.org está limitando as verificações. Aguarde um pouco e tente novamente.");
      } else {
        setAvailabilityMessage(`Não foi possível confirmar a disponibilidade (HTTP ${response.status}).`);
      }
    } catch (error) {
      const message = error instanceof Error && error.name === "AbortError"
        ? "A verificação demorou demais. Tente novamente em alguns minutos."
        : "Não foi possível verificar a URL. O Archive.org pode estar processando o vídeo ou bloqueando a consulta do navegador.";
      setAvailabilityMessage(message);
    } finally {
      window.clearTimeout(timeout);
      setCheckingAvailability(false);
    }
  };

  const isUploading = uploadState.status === "uploading";
  const progress = uploadState.status === "uploading" ? uploadState.progress : 0;
  const speed = uploadState.status === "uploading" ? uploadState.speed : 0;
  const displayedUrl = uploadState.status === "success" ? uploadState.url : currentUrl.trim();

  return (
    <section className="space-y-4 rounded-xl border border-blue-500/25 bg-blue-500/[0.04] p-4" aria-label="Upload direto para Archive.org">
      <div className="flex items-center gap-2">
        <CloudUpload className="h-4 w-4 text-blue-400" aria-hidden="true" />
        <h3 className="text-sm font-semibold">Enviar vídeo para o Archive.org</h3>
      </div>

      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs font-medium">
            <span className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" /> Access key</span>
            <Input
              type="password"
              autoComplete="off"
              value={credentials.accessKey}
              onChange={(event) => setCredentials((current) => ({ ...current, accessKey: event.target.value }))}
              disabled={isUploading}
              className="bg-background text-sm"
              aria-label="Access key do Archive.org"
            />
          </label>
          <label className="space-y-1.5 text-xs font-medium">
            <span>Secret key</span>
            <Input
              type="password"
              autoComplete="new-password"
              value={credentials.secretKey}
              onChange={(event) => setCredentials((current) => ({ ...current, secretKey: event.target.value }))}
              disabled={isUploading}
              className="bg-background text-sm"
              aria-label="Secret key do Archive.org"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            As chaves ficam apenas no localStorage deste navegador. Não compartilhe este dispositivo.
          </p>
          <Button type="button" size="sm" variant="outline" onClick={clearCredentials} disabled={isUploading}>
            Limpar chaves
          </Button>
        </div>
      </div>

      <label className="block space-y-1.5 text-xs font-medium">
        <span>Arquivo MP4</span>
        <Input
          type="file"
          accept=".mp4,video/mp4"
          disabled={isUploading}
          onChange={(event) => {
            const selected = event.target.files?.[0] ?? null;
            setFile(selected);
            setUploadState({ status: "idle" });
          }}
          className="h-auto min-h-10 cursor-pointer bg-background py-2 text-xs file:mr-3 file:rounded-md file:bg-secondary file:px-3 file:py-1 file:text-xs"
        />
      </label>
      {file && (
        <p className="text-xs text-muted-foreground">
          {file.name} · {formatBytes(file.size)}
        </p>
      )}

      {isUploading ? (
        <div className="space-y-2" aria-live="polite">
          <div className="flex justify-between gap-3 text-xs">
            <span>Enviando… {Math.floor(progress)}%</span>
            <span>{formatBytesPerSecond(speed)}</span>
          </div>
          <Progress value={progress} aria-label={`Progresso do upload: ${Math.floor(progress)}%`} />
          <div className="flex justify-between gap-3 text-[11px] text-muted-foreground">
            <span>{file ? `${formatBytes((progress / 100) * file.size)} de ${formatBytes(file.size)}` : "Enviando arquivo"}</span>
            <Button type="button" variant="destructive" size="sm" onClick={cancelUpload} className="h-7 gap-1">
              <X className="h-3.5 w-3.5" /> Cancelar envio
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          onClick={upload}
          disabled={!file || !credentials.accessKey || !credentials.secretKey}
          className="w-full gap-2"
          variant="secondary"
        >
          <CloudUpload className="h-4 w-4" />
          Enviar vídeo diretamente
        </Button>
      )}

      {uploadState.status === "error" && (
        <p className="flex items-start gap-2 text-xs text-destructive" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {uploadState.message}
        </p>
      )}
      {uploadState.status === "cancelled" && (
        <p className="flex items-start gap-2 text-xs text-amber-400" role="status">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {uploadState.message}
        </p>
      )}
      {uploadState.status === "success" && (
        <p className="flex items-start gap-2 text-xs text-emerald-400" role="status">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          Upload concluído. A URL foi preenchida no campo do player; salve o episódio para gravá-la no banco.
        </p>
      )}

      <div className="space-y-2 rounded-lg border border-border/70 bg-background/60 p-3">
        <p className="text-xs text-muted-foreground">
          O vídeo pode levar alguns minutos para ficar disponível no Archive.org. Depois do upload, use o botão abaixo para conferir.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={checkAvailability}
            disabled={checkingAvailability || !displayedUrl}
            className="gap-2"
          >
            {checkingAvailability && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Verificar disponibilidade
          </Button>
          {availabilityMessage && <p className="text-xs text-muted-foreground" role="status">{availabilityMessage}</p>}
        </div>
      </div>
    </section>
  );
}
