import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, CloudUpload, KeyRound, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

const STORAGE_KEY = "zenkatu.archive.org.credentials.v1";
// Últimos envios concluídos, por episódio. Sem isso, sair da página zera o estado
// deste componente e o campo da URL volta vazio (ele só é preenchido se o episódio
// for salvo no banco), o que deixa o botão "Verificar disponibilidade" morto.
const LAST_UPLOADS_KEY = "zenkatu.archive.org.lastUploads.v1";
const MAX_REMEMBERED_UPLOADS = 20;

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

type RememberedUpload = {
  identifier: string;
  fileName: string;
  title: string;
  url: string;
  savedAt: number;
};

/**
 * Chave do episódio: obra + temporada + número. O título do episódio fica de
 * fora de propósito — se o usuário renomear o episódio, o envio lembrado segue
 * sendo o mesmo.
 */
function rememberedUploadKey(animeTitle: string, season: number, episodeNumber: number): string {
  return `${slugify(animeTitle, 80) || "zenkatu"}-s${season}e${episodeNumber}`;
}

function readRememberedUploads(): Record<string, RememberedUpload> {
  try {
    const raw = window.localStorage.getItem(LAST_UPLOADS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const uploads: Record<string, RememberedUpload> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== "object") continue;
      const entry = value as Partial<RememberedUpload>;
      if (typeof entry.url !== "string" || !entry.url) continue;
      uploads[key] = {
        identifier: typeof entry.identifier === "string" ? entry.identifier : "",
        fileName: typeof entry.fileName === "string" ? entry.fileName : "",
        title: typeof entry.title === "string" ? entry.title : "",
        url: entry.url,
        savedAt: typeof entry.savedAt === "number" ? entry.savedAt : 0,
      };
    }
    return uploads;
  } catch {
    return {};
  }
}

/** Guarda o envio concluído. Falhar aqui é silencioso: o upload já aconteceu. */
function rememberUpload(key: string, upload: RememberedUpload): void {
  try {
    const uploads = readRememberedUploads();
    uploads[key] = upload;
    const recent = Object.fromEntries(
      Object.entries(uploads)
        .sort(([, a], [, b]) => b.savedAt - a.savedAt)
        .slice(0, MAX_REMEMBERED_UPLOADS),
    );
    window.localStorage.setItem(LAST_UPLOADS_KEY, JSON.stringify(recent));
  } catch {
    // localStorage cheio/indisponível: o envio continua funcionando, apenas não
    // fica lembrado na próxima visita.
  }
}

/**
 * Formata um valor de metadado no modo documentado pelo IAS3:
 * `uri($payload_utf8_percent_encoded)` — ver https://archive.org/developers/ias3.html
 *
 * Enviar `encodeURIComponent(...)` sem o envoltório NÃO funciona: o Archive.org
 * só decodifica o valor quando ele está dentro de `uri(...)`, e sem isso o título
 * fica gravado escapado ("Wotakoi%3A%20O%20Amor%20%C3%A9..."). É a mesma
 * trilha da biblioteca oficial deles (internetarchive/iarequest.py).
 *
 * Bônus: o payload sai 100% ASCII, que é o único tipo de valor aceito em
 * cabeçalho HTTP pelo navegador (ByteString) — um emoji ou um travessão no
 * título quebrariam o envio inteiro sem esse envoltório.
 */
function metaHeaderValue(value: string): string {
  const payload = encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `uri(${payload})`;
}

type ArchiveTarget = {
  identifier: string;
  fileName: string | null;
};

function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Extrai identificador e nome de arquivo de uma URL do Archive.org.
 * Aceita /download/, /serve/, /details/ e os links diretos dos nós
 * (https://ia801607.us.archive.org/12/items/{identifier}/{arquivo}).
 */
function parseArchiveUrl(raw: string): ArchiveTarget | null {
  const value = raw.trim();
  if (!value) return null;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  const segments = parsed.pathname.split("/").filter(Boolean).map(decodeSegment);
  if (segments.length === 0) return null;

  if (host === "archive.org" || host === "www.archive.org") {
    const [scope, identifier, ...rest] = segments;
    if (!identifier) return null;
    if (scope !== "download" && scope !== "serve" && scope !== "details") return null;
    return { identifier, fileName: rest.length > 0 ? rest.join("/") : null };
  }

  if (host.endsWith(".archive.org")) {
    const marker = segments.indexOf("items");
    if (marker >= 0 && segments[marker + 1]) {
      const rest = segments.slice(marker + 2);
      return { identifier: segments[marker + 1], fileName: rest.length > 0 ? rest.join("/") : null };
    }
  }

  return null;
}

type ProbeResult = "exists" | "missing" | "unknown";

type MetadataResult =
  | { kind: "limited" }
  | { kind: "http-error"; status: number }
  | { kind: "timeout" }
  | { kind: "network" }
  | { kind: "invalid" }
  | { kind: "removed" }
  | { kind: "pending"; reason?: string }
  | { kind: "ready"; isDark: boolean; files: string[] };

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

/**
 * Lê o catálogo do Archive.org (API de metadados com CORS liberado).
 *
 * IMPORTANTE: uma resposta vazia (`{}`) ou um erro de leitura NÃO significa que o
 * item não existe. Logo após um upload o arquivo já é servido, mas o catálogo
 * ainda não indexou o item — a própria API documenta códigos como 101 (item sendo
 * criado) e 102/106 (nó de dados indisponível) para esse caso.
 * Ver https://archive.org/developers/md-read.html
 */
async function fetchMetadata(identifier: string): Promise<MetadataResult> {
  let response: Response;
  try {
    // NÃO usar `cache: "no-store"` aqui: a spec do Fetch manda o navegador
    // acrescentar `Pragma: no-cache` (Firefox) e também `Cache-Control: no-cache`
    // (Safari) nesse modo. Esses cabeçalhos não são "safelisted", então o
    // navegador dispara um preflight OPTIONS — e o archive.org só autoriza
    // `Content-Type, Authorization, Baggage, Sentry-Trace`, o que faz o preflight
    // falhar e o fetch rejeitar com TypeError (o usuário vê "verifique sua
    // conexão"). Quebramos o cache pela query string: é requisição simples, sem
    // preflight, e a resposta nunca é reaproveitada.
    response = await fetchWithTimeout(
      `https://archive.org/metadata/${encodeURIComponent(identifier)}?extended_err=1&cb=${Date.now()}`,
      {},
      15000,
    );
  } catch (error) {
    return isAbortError(error) ? { kind: "timeout" } : { kind: "network" };
  }

  if (response.status === 429 || response.status === 503) return { kind: "limited" };
  if (!response.ok) return { kind: "http-error", status: response.status };

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const data =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null;
  if (!data) return { kind: "invalid" };

  const errcode = typeof data.errcode === "number" ? data.errcode : null;
  const error = typeof data.error === "string" && data.error ? data.error : null;

  // 104 = item apagado; os demais (101 item sendo criado, 102/105/106 nó de dados
  // indisponível, 103/400 tarefas pendentes) indicam que o item existe, mas não
  // conseguimos ler os arquivos agora.
  if (errcode === 104) return { kind: "removed" };
  if (errcode !== null || error) return { kind: "pending", reason: error ?? undefined };
  if (Object.keys(data).length === 0) return { kind: "pending" };

  const files = Array.isArray(data.files) ? (data.files as Array<Record<string, unknown>>) : [];
  const names = files
    .map((entry) => (typeof entry.name === "string" ? entry.name : ""))
    .filter((name): name is string => name.length > 0);

  return {
    kind: "ready",
    isDark: data.is_dark === true || data.nodownload === true,
    files: names,
  };
}

/**
 * Pergunta ao gateway S3 se o item foi criado. É o mesmo endpoint que recebe o
 * PUT do upload: 307/302 (redirecionamento) significa que o bucket existe e
 * 404 que ele nunca foi criado. Ambas as respostas trazem
 * Access-Control-Allow-Origin: *.
 *
 * `redirect: "manual"` é obrigatório: o destino do redirecionamento é um host
 * sem CORS, então seguir o redirect quebraria a leitura. Nesse modo a resposta
 * vira "opaqueredirect", detectável pelo tipo.
 */
async function probeS3(identifier: string): Promise<ProbeResult> {
  try {
    const response = await fetchWithTimeout(
      `https://s3.us.archive.org/${encodeURIComponent(identifier)}?cb=${Date.now()}`,
      { method: "HEAD", redirect: "manual" },
      15000,
    );
    if (response.type === "opaqueredirect" || (response.status >= 300 && response.status < 400)) {
      return "exists";
    }
    if (response.status === 404) return "missing";
    return response.ok ? "exists" : "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Segunda opinião usando o endereço que o player realmente consome. /download/
 * redireciona quando o item existe e responde 503 quando não existe, e as duas
 * respostas têm CORS liberado.
 */
async function probeDownload(identifier: string, fileName: string): Promise<ProbeResult> {
  const path = `${encodeURIComponent(identifier)}/${fileName.split("/").map(encodeURIComponent).join("/")}`;
  try {
    const response = await fetchWithTimeout(
      `https://archive.org/download/${path}?cb=${Date.now()}`,
      { method: "HEAD", redirect: "manual" },
      15000,
    );
    if (response.type === "opaqueredirect" || (response.status >= 300 && response.status < 400)) {
      return "exists";
    }
    if (response.status === 503 || response.status === 404) return "missing";
    return response.ok ? "exists" : "unknown";
  } catch {
    return "unknown";
  }
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
  const [rememberedUpload, setRememberedUpload] = useState<RememberedUpload | null>(null);
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

  const memoryKey = rememberedUploadKey(animeTitle, season, episodeNumber);

  // Ao reabrir a página (ou voltar para o episódio), recupera o último envio
  // feito neste navegador para que a verificação continue disponível mesmo sem
  // o episódio ter sido salvo no banco.
  useEffect(() => {
    setRememberedUpload(readRememberedUploads()[memoryKey] ?? null);
  }, [memoryKey]);

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
    let lastPaint = Date.now();
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const now = Date.now();
      // O navegador dispara até ~20 eventos de progresso por segundo. Repintar a
      // cada um deles faz a página do admin renderizar 20x/s durante o envio (ela
      // tem gráficos e animações), o que deixa a interface travada; e medir a
      // velocidade em janelas de ~50ms produz um número instável, que chega a
      // mostrar 0 B/s. Limitamos a 120ms: a velocidade passa a ser a média da
      // janela inteira e o React re-renderiza ~8x/s em vez de 20x/s.
      if (event.loaded < event.total && now - lastPaint < 120) return;
      const elapsedSeconds = Math.max((now - lastTime) / 1000, 0.001);
      const speed = (event.loaded - lastLoaded) / elapsedSeconds;
      lastLoaded = event.loaded;
      lastTime = now;
      lastPaint = now;
      setUploadState({
        status: "uploading",
        progress: Math.min(100, (event.loaded / event.total) * 100),
        speed,
      });
    };

    xhr.onload = () => {
      xhrRef.current = null;
      if (xhr.status === 200) {
        const record: RememberedUpload = {
          identifier,
          fileName,
          title: metadataTitle,
          url,
          savedAt: Date.now(),
        };
        rememberUpload(memoryKey, record);
        setRememberedUpload(record);
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
      xhr.setRequestHeader("x-archive-meta-title", metaHeaderValue(metadataTitle));
      xhr.setRequestHeader("x-archive-queue-derive", "0");
      // Tamanho declarado do arquivo: a documentação do IAS3 aponta ganho
      // potencial de velocidade e o uploader oficial do Archive.org envia esse
      // cabeçalho em todo upload.
      xhr.setRequestHeader("x-archive-size-hint", String(file.size));
      // Prioriza a ingestão do arquivo para o item ficar disponível mais rápido.
      xhr.setRequestHeader("x-archive-interactive-priority", "1");
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

  /**
   * De onde sai a URL verificada: o envio recém-concluído, depois o que estiver
   * no campo do episódio, e — se o campo estiver vazio (episódio não salvo) ou
   * apontar para fora do Archive.org — o último envio lembrado neste navegador.
   */
  const resolveTargetUrl = (): string => {
    if (uploadState.status === "success") return uploadState.url;
    const typed = currentUrl.trim();
    if (parseArchiveUrl(typed)) return typed;
    if (rememberedUpload) return rememberedUpload.url;
    return typed;
  };

  const checkAvailability = async () => {
    const url = resolveTargetUrl();
    const target = parseArchiveUrl(url);
    if (!target) {
      setAvailabilityMessage("Envie um vídeo ou informe uma URL direta do Archive.org primeiro.");
      return;
    }

    setCheckingAvailability(true);
    setAvailabilityMessage("");
    try {
      const metadata = await fetchMetadata(target.identifier);

      if (metadata.kind === "limited") {
        setAvailabilityMessage("O Archive.org está limitando as verificações. Aguarde um pouco e tente novamente.");
        return;
      }
      if (metadata.kind === "http-error") {
        setAvailabilityMessage(`Não foi possível confirmar a disponibilidade (HTTP ${metadata.status}).`);
        return;
      }
      if (metadata.kind === "timeout") {
        setAvailabilityMessage("A verificação demorou demais. Tente novamente em alguns minutos.");
        return;
      }
      if (metadata.kind === "network") {
        setAvailabilityMessage("Não foi possível falar com o Archive.org agora. Verifique sua conexão e tente novamente.");
        return;
      }
      if (metadata.kind === "invalid") {
        setAvailabilityMessage("O Archive.org respondeu uma informação inesperada. Tente novamente em alguns minutos.");
        return;
      }
      if (metadata.kind === "removed") {
        setAvailabilityMessage("Este item foi removido do Archive.org. Envie o vídeo novamente.");
        return;
      }

      if (metadata.kind === "ready") {
        if (metadata.isDark) {
          setAvailabilityMessage(
            "O item existe no Archive.org, mas ainda não está liberado para download. Aguarde alguns minutos e verifique novamente.",
          );
          return;
        }

        const names = metadata.files;
        const requested = target.fileName ? decodeSegment(target.fileName).toLowerCase() : null;
        const match = requested ? names.find((name) => name.toLowerCase() === requested) : names[0];

        if (match) {
          setAvailabilityMessage("O vídeo já está disponível no Archive.org.");
          return;
        }

        if (names.length === 0) {
          setAvailabilityMessage(
            "O item foi criado, mas ainda não tem arquivos catalogados. O Archive.org ainda está processando o envio — tente novamente em alguns minutos.",
          );
          return;
        }

        if (requested) {
          const videos = names.filter((name) => /\.(mp4|webm|mkv|ogv|m3u8|mp3|m4v)$/i.test(name));
          const hint = videos.length > 0 ? ` Arquivos no item: ${videos.slice(0, 3).join(", ")}.` : "";
          setAvailabilityMessage(
            `O item existe no Archive.org, mas o arquivo "${requested}" não está entre os arquivos dele.${hint} Confira a URL salva no episódio.`,
          );
          return;
        }

        setAvailabilityMessage(
          "O item existe no Archive.org, mas não contém um arquivo de vídeo. Confira a URL salva no episódio.",
        );
        return;
      }

      // O catálogo ainda não respondeu (item recém-enviado ou leitura indisponível).
      // Nesse estado o arquivo já pode ser servido, então não dá para afirmar que o
      // vídeo não existe: confirmamos direto no armazenamento antes de responder.
      const onS3: ProbeResult = await probeS3(target.identifier);
      const onDownload: ProbeResult =
        onS3 !== "exists" && target.fileName
          ? await probeDownload(target.identifier, target.fileName)
          : "unknown";

      if (onS3 === "exists" || onDownload === "exists") {
        setAvailabilityMessage(
          "O upload foi concluído e o item já existe no Archive.org, mas o catálogo ainda está sendo atualizado. Tente verificar novamente em alguns minutos.",
        );
        return;
      }

      if (onS3 === "missing") {
        setAvailabilityMessage(
          `O Archive.org não encontrou este item — o envio pode não ter sido concluído. Confira as chaves e envie o vídeo novamente.${metadata.reason ? ` Detalhe: ${metadata.reason}` : ""}`,
        );
        return;
      }

      setAvailabilityMessage(
        `Não foi possível confirmar agora${metadata.reason ? `: ${metadata.reason}` : ""}. Tente novamente em alguns minutos.`,
      );
    } catch {
      setAvailabilityMessage("Não foi possível falar com o Archive.org agora. Verifique sua conexão e tente novamente.");
    } finally {
      setCheckingAvailability(false);
    }
  };

  const isUploading = uploadState.status === "uploading";
  const progress = uploadState.status === "uploading" ? uploadState.progress : 0;
  const speed = uploadState.status === "uploading" ? uploadState.speed : 0;
  const displayedUrl = resolveTargetUrl();

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
          O vídeo pode levar alguns minutos para ser catalogado no Archive.org. Depois do upload, use o botão abaixo para conferir: ele consulta a API de metadados e, enquanto o catálogo não responder, confirma a existência do item direto no armazenamento do Archive.org.
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
        {rememberedUpload && uploadState.status !== "uploading" && uploadState.status !== "success" && (
          <p className="text-[11px] text-muted-foreground" role="status">
            Lembrado neste navegador: envio de{" "}
            {rememberedUpload.fileName ? `"${rememberedUpload.fileName}"` : "vídeo"}
            {rememberedUpload.savedAt ? ` (${new Date(rememberedUpload.savedAt).toLocaleString("pt-BR")})` : ""}. Você
            pode verificar sem reenviar.
          </p>
        )}
      </div>
    </section>
  );
}
