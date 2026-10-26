import fs from "node:fs";
import path from "node:path";
import type { Request } from "express";

/**
 * Template do `index.html` do frontend, embutido no bundle do servidor em
 * tempo de build (ver `build.mjs`). O arquivo não existe no sistema de
 * arquivos da function da Vercel, por isso ele é copiado para dentro do
 * bundle durante o build.
 */
declare const __SPA_INDEX_HTML__: string | undefined;

export const socialPreviewUserAgent =
  /facebookexternalhit|facebot|twitterbot|slackbot|discordbot|telegrambot|whatsapp|linkedinbot|pinterest|googlebot|bingbot|vkshare|redditbot|skypeuripreview|instagrambot/i;

export const SITE_NAME = "Zenkatu Streaming";

export type ObraShareData = {
  titulo: string;
  slug: string;
  sinopse: string;
  capaUrl: string;
  tipografiaUrl: string | null;
  updatedAt: Date;
};

export function getRequestOrigin(req: Request): string {
  const forwardedProtocol = req.get("x-forwarded-proto")?.split(",")[0].trim();
  const protocol =
    forwardedProtocol === "https" || forwardedProtocol === "http"
      ? forwardedProtocol
      : req.protocol;
  const host =
    req.get("x-forwarded-host")?.split(",")[0].trim() ??
    req.get("host") ??
    "localhost";
  return new URL(`${protocol}://${host}`).origin;
}

export function toAbsoluteHttpUrl(
  value: string,
  origin: string,
): string | null {
  try {
    const url = new URL(value, origin);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function escapeHtml(value: string): string {
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
      default:
        return "&#39;";
    }
  });
}

export function createShareCardUrl(
  slug: string,
  updatedAt: Date,
  origin: string,
): string {
  const url = new URL(`/api/share/${encodeURIComponent(slug)}/image`, origin);
  url.searchParams.set("v", String(updatedAt.getTime()));
  return url.toString();
}

/** Monta o bloco de <head> com as metatags de preview da obra. */
export function buildObraHead({
  title,
  synopsis,
  canonicalUrl,
  shareCardUrl,
}: {
  title: string;
  synopsis: string;
  canonicalUrl: string;
  shareCardUrl: string;
}): string {
  const pageTitle = `${title} | ${SITE_NAME}`;
  const shortDescription =
    synopsis.length > 200 ? `${synopsis.slice(0, 200).trimEnd()}…` : synopsis;
  const imageAlt = `Capa de ${title} com a tipografia do projeto`;

  const meta = (attribute: "property" | "name", key: string, content: string) =>
    `<meta ${attribute}="${key}" content="${escapeHtml(content)}" />`;

  return [
    `<title>${escapeHtml(pageTitle)}</title>`,
    meta("name", "description", shortDescription),
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
    meta("property", "og:title", pageTitle),
    meta("property", "og:description", synopsis),
    meta("property", "og:url", canonicalUrl),
    meta("property", "og:type", "website"),
    meta("property", "og:site_name", SITE_NAME),
    meta("property", "og:locale", "pt_BR"),
    meta("property", "og:image", shareCardUrl),
    meta("property", "og:image:type", "image/jpeg"),
    meta("property", "og:image:width", "1200"),
    meta("property", "og:image:height", "630"),
    meta("property", "og:image:alt", imageAlt),
    meta("name", "twitter:card", "summary_large_image"),
    meta("name", "twitter:title", pageTitle),
    meta("name", "twitter:description", synopsis),
    meta("name", "twitter:image", shareCardUrl),
    meta("name", "twitter:image:alt", imageAlt),
  ]
    .map((line) => `    ${line}`)
    .join("\n");
}

/**
 * Troca as metatags genéricas do SPA pelas da obra, mantendo o restante do
 * HTML (bundle da aplicação) intacto. Crawlers como Discord, WhatsApp e
 * Facebook leem o <head> sem executar JavaScript.
 */
export function injectObraHead(html: string, head: string): string {
  const cleaned = html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(
      /<meta\b[^>]*(?:property|name)\s*=\s*["'](?:og:[^"']*|twitter:[^"']*|description)["'][^>]*>\s*/gi,
      "",
    )
    .replace(/<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*>\s*/gi, "");

  if (/<\/head>/i.test(cleaned)) {
    return cleaned.replace(/<\/head>/i, `  ${head}\n  </head>`);
  }
  return `${head}\n${cleaned}`;
}

/**
 * Retorna o HTML base do frontend. Prioridade: template embutido no bundle
 * (Vercel) → arquivo gerado pelo build do frontend (Render/dev) → null.
 */
export function loadSpaIndexHtml(): string | null {
  if (typeof __SPA_INDEX_HTML__ === "string" && __SPA_INDEX_HTML__.length > 0) {
    return __SPA_INDEX_HTML__;
  }

  try {
    const filePath = path.resolve(
      process.cwd(),
      "artifacts/zenkatu/dist/public/index.html",
    );
    const contents = fs.readFileSync(filePath, "utf8");
    return contents.length > 0 ? contents : null;
  } catch {
    return null;
  }
}

/**
 * Extrai o slug da obra da URL. O caminho `/obra/:slug` é o caso normal
 * (rewrite da Vercel preserva a URL original); o caminho da própria function
 * com `?slug=` cobre o caso em que a Vercel repassa o destino do rewrite.
 */
export function resolveObraSlug(req: Request): string | null {
  const pathMatch = req.path.match(/^\/obra\/([^/]+)\/?$/);
  const candidate = pathMatch
    ? safeDecode(pathMatch[1])
    : req.path === "/api/index.mjs" && typeof req.query.slug === "string"
      ? safeDecode(req.query.slug)
      : null;

  if (!candidate) return null;
  return /^[\w][\w.-]{0,254}$/.test(candidate) ? candidate : null;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function buildSharePage({
  title,
  synopsis,
  coverUrl,
  typographyUrl,
  shareCardUrl,
  canonicalUrl,
}: {
  title: string;
  synopsis: string;
  coverUrl: string | null;
  typographyUrl: string | null;
  shareCardUrl: string;
  canonicalUrl: string;
}) {
  const escapedTitle = escapeHtml(title);
  const escapedSynopsis = escapeHtml(synopsis);
  const pageTitle = `${title} | Zenkatu`;
  const shortDescription =
    synopsis.length > 157 ? `${synopsis.slice(0, 157).trimEnd()}…` : synopsis;
  const escapedPageTitle = escapeHtml(pageTitle);
  const escapedDescription = escapeHtml(shortDescription);
  const escapedCanonicalUrl = escapeHtml(canonicalUrl);
  const escapedCoverUrl = coverUrl ? escapeHtml(coverUrl) : null;
  const escapedTypographyUrl = typographyUrl ? escapeHtml(typographyUrl) : null;
  const escapedShareCardUrl = escapeHtml(shareCardUrl);
  const imageTags = `
    <meta property="og:image" content="${escapedShareCardUrl}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Capa de ${escapedTitle} com a tipografia do projeto" />
    <meta name="twitter:image" content="${escapedShareCardUrl}" />
    <meta name="twitter:image:alt" content="Capa de ${escapedTitle} com a tipografia do projeto" />`;
  const typographyTags = escapedTypographyUrl
    ? `<meta name="zenkatu:tipografia" content="${escapedTypographyUrl}" />`
    : "";

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapedPageTitle}</title>
    <meta name="description" content="${escapedDescription}" />
    <meta property="og:title" content="${escapedPageTitle}" />
    <meta property="og:description" content="${escapedSynopsis}" />
    <meta property="og:url" content="${escapedCanonicalUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Zenkatu Streaming" />
    ${imageTags}
    ${typographyTags}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapedPageTitle}" />
    <meta name="twitter:description" content="${escapedSynopsis}" />
    <link rel="canonical" href="${escapedCanonicalUrl}" />
  </head>
  <body>
    <main>
      <h1>${escapedTitle}</h1>
      <p>${escapedSynopsis}</p>
      ${escapedCoverUrl ? `<img src="${escapedCoverUrl}" alt="Capa de ${escapedTitle}" />` : ""}
      ${escapedTypographyUrl ? `<img src="${escapedTypographyUrl}" alt="Tipografia de ${escapedTitle}" />` : ""}
      <p><a href="${escapedCanonicalUrl}">Assistir no Zenkatu</a></p>
    </main>
  </body>
</html>`;
}
