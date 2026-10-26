import { createHash } from "node:crypto";
import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpRequest, type IncomingMessage, type RequestOptions } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import montserratRegular from "../assets/fonts/Montserrat-Regular.ttf";
import montserratBold from "../assets/fonts/Montserrat-Bold.ttf";

const bundledFonts = [
  { file: "Montserrat-Regular.ttf", dataUrl: montserratRegular },
  { file: "Montserrat-Bold.ttf", dataUrl: montserratBold },
];

function fontBytes(dataUrl: string): Buffer {
  return Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
}

let bundledFontsInstalled = false;

/**
 * Ambientes serverless (Vercel) não têm fontes instaladas: sem este passo o
 * texto do SVG sai como retângulos vazios. Grava as fontes embutidas no
 * /tmp e aponta o fontconfig para elas antes do primeiro render do Sharp.
 */
function installBundledFonts(): void {
  if (bundledFontsInstalled) return;
  bundledFontsInstalled = true;

  try {
    const fontsDir = path.join(os.tmpdir(), "zenkatu-fonts");
    const cacheDir = path.join(fontsDir, "cache");
    fs.mkdirSync(cacheDir, { recursive: true });

    for (const { file, dataUrl } of bundledFonts) {
      fs.writeFileSync(path.join(fontsDir, file), fontBytes(dataUrl));
    }
    fs.writeFileSync(
      path.join(fontsDir, "fonts.conf"),
      [
        '<?xml version="1.0"?>',
        '<!DOCTYPE fontconfig SYSTEM "fonts.dtd">',
        "<fontconfig>",
        `  <dir>${fontsDir}</dir>`,
        `  <cachedir>${cacheDir}</cachedir>`,
        "</fontconfig>",
        "",
      ].join("\n"),
      "utf8",
    );

    process.env.FONTCONFIG_FILE = path.join(fontsDir, "fonts.conf");
    process.env.FONTCONFIG_PATH = fontsDir;
  } catch {
    // Sem as fontes embutidas o card continua sendo gerado, só sem texto.
  }
}

installBundledFonts();

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 25_000_000;
const REMOTE_TIMEOUT_MS = 8_000;
const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CACHED_CARDS = 40;

type ShareCardInput = {
  title: string;
  synopsis: string;
  coverUrl: string;
  typographyUrl: string | null;
  updatedAt: Date;
};

const cardCache = new Map<string, { image: Buffer; expiresAt: number }>();
const cardsBeingGenerated = new Map<string, Promise<Buffer>>();

export async function generateShareCard(input: ShareCardInput): Promise<Buffer> {
  const cacheKey = createHash("sha256")
    .update(
      JSON.stringify({
        title: input.title,
        synopsis: input.synopsis,
        coverUrl: input.coverUrl,
        typographyUrl: input.typographyUrl,
        updatedAt: input.updatedAt.toISOString(),
      }),
    )
    .digest("hex");

  const cached = cardCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.image;
  if (cached) cardCache.delete(cacheKey);

  const pending = cardsBeingGenerated.get(cacheKey);
  if (pending) return pending;

  const generation = createShareCard(input);
  cardsBeingGenerated.set(cacheKey, generation);
  try {
    const image = await generation;
    cardCache.set(cacheKey, { image, expiresAt: Date.now() + CACHE_TTL_MS });
    while (cardCache.size > MAX_CACHED_CARDS) {
      const oldestKey = cardCache.keys().next().value;
      if (!oldestKey) break;
      cardCache.delete(oldestKey);
    }
    return image;
  } finally {
    cardsBeingGenerated.delete(cacheKey);
  }
}

async function createShareCard({
  title,
  synopsis,
  coverUrl,
  typographyUrl,
}: ShareCardInput): Promise<Buffer> {
  const [cover, typography] = await Promise.all([
    downloadPublicImage(coverUrl),
    typographyUrl ? downloadPublicImage(typographyUrl) : Promise.resolve(null),
  ]);

  const titleLines = wrapText(title, 34, 2);
  const synopsisLines = wrapText(synopsis, 58, 3);
  const logo = typography
    ? await sharp(typography, { limitInputPixels: MAX_IMAGE_PIXELS })
        .resize({
          width: 500,
          height: 190,
          fit: "inside",
          withoutEnlargement: true,
        })
        .png()
        .toBuffer({ resolveWithObject: true })
    : null;

  const titleY = logo ? Math.max(330, 108 + logo.info.height + 34) : 205;
  const titleText = titleLines
    .map(
      (line, index) =>
        `<text x="66" y="${titleY + index * 42}" class="title">${escapeXml(line)}</text>`,
    )
    .join("");
  const synopsisY = titleY + titleLines.length * 42 + 22;
  const synopsisText = synopsisLines
    .map(
      (line, index) =>
        `<text x="68" y="${synopsisY + index * 29}" class="synopsis">${escapeXml(line)}</text>`,
    )
    .join("");

  const overlay = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
      <defs>
        <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#050914" stop-opacity="0.98"/>
          <stop offset="47%" stop-color="#050914" stop-opacity="0.9"/>
          <stop offset="72%" stop-color="#050914" stop-opacity="0.48"/>
          <stop offset="100%" stop-color="#050914" stop-opacity="0.16"/>
        </linearGradient>
        <linearGradient id="bottom" x1="0" y1="0" x2="0" y2="1">
          <stop offset="50%" stop-color="#050914" stop-opacity="0"/>
          <stop offset="100%" stop-color="#050914" stop-opacity="0.55"/>
        </linearGradient>
        <style>
          .brand { font-family: Montserrat, sans-serif; font-weight: 700; font-size: 17px; letter-spacing: 4px; fill: #75a9ff; }
          .title { font-family: Montserrat, sans-serif; font-weight: 700; font-size: 34px; fill: #fff; }
          .synopsis { font-family: Montserrat, sans-serif; font-weight: 400; font-size: 19px; fill: #e5e7eb; }
          .button { font-family: Montserrat, sans-serif; font-weight: 700; font-size: 15px; letter-spacing: 1px; fill: #fff; }
        </style>
      </defs>
      <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="#050914" fill-opacity="0.18"/>
      <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#shade)"/>
      <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#bottom)"/>
      <text x="68" y="58" class="brand">ZENKATU STREAMING</text>
      ${logo ? `<rect x="56" y="82" width="530" height="225" rx="18" fill="#050914" fill-opacity="0.22"/>` : ""}
      ${titleText}
      ${synopsisText}
      <rect x="66" y="567" width="226" height="42" rx="21" fill="#3178f6"/>
      <text x="179" y="594" class="button" text-anchor="middle">ASSISTA NO ZENKATU</text>
    </svg>
  `);

  const layers: Array<{ input: Buffer; left: number; top: number }> = [
    { input: overlay, left: 0, top: 0 },
  ];
  if (logo) {
    layers.push({ input: logo.data, left: 70, top: 100 });
  }

  const background = await sharp(cover, { limitInputPixels: MAX_IMAGE_PIXELS })
    .rotate()
    .resize(CARD_WIDTH, CARD_HEIGHT, { fit: "cover", position: "attention" })
    .jpeg({ quality: 86 })
    .toBuffer();

  return sharp(background)
    .composite(layers)
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}

export async function downloadPublicImage(
  value: string,
  redirectCount = 0,
): Promise<Buffer> {
  if (redirectCount > 3) {
    throw new Error("A imagem excedeu o limite de redirecionamentos.");
  }

  const url = new URL(value);
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username ||
    url.password ||
    (url.port && url.port !== (url.protocol === "https:" ? "443" : "80"))
  ) {
    throw new Error("A URL da imagem não é permitida.");
  }

  const pinnedAddress = await getPublicIpv4Address(url.hostname);

  return new Promise<Buffer>((resolve, reject) => {
    const options: RequestOptions = {
      headers: {
        accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,application/octet-stream",
        "user-agent": "ZenkatuShareCard/1.0",
      },
      lookup: (_hostname, lookupOptions, callback) => {
        // O autoSelectFamily (padrão desde o Node 20) pede a lista de
        // endereços; as versões antigas pedem (ip, família).
        if (lookupOptions.all) {
          callback(null, [{ address: pinnedAddress, family: 4 }]);
          return;
        }
        callback(null, pinnedAddress, 4);
      },
    };

    const onResponse = (response: IncomingMessage) => {
      const statusCode = response.statusCode ?? 0;
      if ([301, 302, 303, 307, 308].includes(statusCode)) {
        const location = response.headers.location;
        response.resume();
        response.once("end", () => {
          if (!location) {
            reject(new Error("A imagem redirecionou sem informar o destino."));
            return;
          }
          downloadPublicImage(new URL(location, url).toString(), redirectCount + 1)
            .then(resolve, reject);
        });
        return;
      }

      if (statusCode !== 200) {
        response.resume();
        reject(new Error(`O servidor da imagem respondeu com HTTP ${statusCode}.`));
        return;
      }

      const contentType = response.headers["content-type"]
        ?.split(";")[0]
        .trim()
        .toLowerCase();
      if (
        contentType &&
        !contentType.startsWith("image/") &&
        contentType !== "application/octet-stream"
      ) {
        response.resume();
        reject(new Error("O endereço informado não retornou uma imagem."));
        return;
      }

      const contentLength = Number(response.headers["content-length"]);
      if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
        response.resume();
        reject(new Error("A imagem excede o tamanho máximo permitido."));
        return;
      }

      const chunks: Buffer[] = [];
      let totalBytes = 0;
      response.on("data", (chunk: Buffer | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        totalBytes += buffer.length;
        if (totalBytes > MAX_IMAGE_BYTES) {
          response.destroy(new Error("A imagem excede o tamanho máximo permitido."));
          return;
        }
        chunks.push(buffer);
      });
      response.on("end", () => {
        if (totalBytes === 0) {
          reject(new Error("O servidor retornou uma imagem vazia."));
          return;
        }
        resolve(Buffer.concat(chunks, totalBytes));
      });
      response.on("error", reject);
    };

    const request =
      url.protocol === "https:"
        ? httpsRequest(url, options, onResponse)
        : httpRequest(url, options, onResponse);
    request.setTimeout(REMOTE_TIMEOUT_MS, () => {
      request.destroy(new Error("O servidor da imagem demorou demais para responder."));
    });
    request.on("error", reject);
    // Sem end() a requisição fica montada e nunca é enviada ao servidor.
    request.end();
  });
}

async function getPublicIpv4Address(hostname: string): Promise<string> {
  const ipVersion = isIP(hostname);
  if (ipVersion === 4) {
    if (!isPublicIpv4(hostname)) throw new Error("A URL da imagem usa um IP privado.");
    return hostname;
  }
  if (ipVersion !== 0) {
    throw new Error("Endereços IPv6 não são aceitos para imagens compartilhadas.");
  }

  const records = await dnsLookup(hostname, { all: true, family: 4, verbatim: true });
  if (records.length === 0 || records.some(({ address }) => !isPublicIpv4(address))) {
    throw new Error("O domínio da imagem não aponta apenas para IPs públicos.");
  }
  return records[0].address;
}

function isPublicIpv4(address: string): boolean {
  if (isIP(address) !== 4) return false;
  const [a, b, c] = address.split(".").map(Number);

  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113)
  );
}

function wrapText(value: string, maxCharacters: number, maxLines: number): string[] {
  const segments = value
    .trim()
    .split(/\s+/)
    .flatMap((word) => {
      if (word.length <= maxCharacters) return [word];
      return word.match(new RegExp(`.{1,${maxCharacters}}`, "gu")) ?? [word];
    });
  const lines: string[] = [];
  let currentLine = "";
  let index = 0;

  for (; index < segments.length; index += 1) {
    const candidate = currentLine
      ? `${currentLine} ${segments[index]}`
      : segments[index];
    if (candidate.length <= maxCharacters) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) lines.push(currentLine);
    currentLine = segments[index];
    if (lines.length === maxLines) break;
  }

  if (currentLine && lines.length < maxLines) lines.push(currentLine);
  if (index < segments.length - 1 && lines.length > 0) {
    const lastLine = lines[lines.length - 1];
    lines[lines.length - 1] = `${lastLine.slice(0, maxCharacters - 1).trimEnd()}…`;
  }
  return lines;
}

/**
 * Rede de segurança para formatos que o Sharp não consegue processar (ou para
 * falhas pontuais de decode). Sempre devolve uma imagem utilizável como
 * og:image: prioriza JPEG recortado em 1200x630 e, se o Sharp falhar, os
 * bytes originais com o Content-Type correto para o formato de origem.
 */
export async function renderImageFallback(
  url: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  const raw = await downloadPublicImage(url);

  try {
    const jpeg = await sharp(raw, { limitInputPixels: MAX_IMAGE_PIXELS })
      .rotate()
      .resize(CARD_WIDTH, CARD_HEIGHT, {
        fit: "cover",
        position: "attention",
      })
      .jpeg({ quality: 86 })
      .toBuffer();
    return { buffer: jpeg, contentType: "image/jpeg" };
  } catch {
    return { buffer: raw, contentType: sniffImageContentType(raw) };
  }
}

export function sniffImageContentType(buffer: Buffer): string {
  const ascii = (start: number, length: number) =>
    buffer.subarray(start, start + length).toString("latin1");

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    ascii(1, 3) === "PNG"
  ) {
    return "image/png";
  }
  const gifHeader = ascii(0, 6);
  if (gifHeader === "GIF87a" || gifHeader === "GIF89a") {
    return "image/gif";
  }
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") {
    return "image/webp";
  }
  if (ascii(4, 4) === "ftyp") {
    const brand = ascii(8, 4);
    return brand === "avif" || brand === "avis" ? "image/avif" : "image/heif";
  }
  if (ascii(0, 2) === "BM") return "image/bmp";
  if (
    (ascii(0, 4) === "II*\u0000" || ascii(0, 4) === "MM\u0000*")
  ) {
    return "image/tiff";
  }

  const head = buffer.subarray(0, 512).toString("utf8").trimStart();
  if (head.startsWith("<svg") || head.startsWith("<?xml")) {
    return "image/svg+xml";
  }
  return "application/octet-stream";
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&apos;";
      default:
        return character;
    }
  });
}
