import { Router } from "express";
import { db, obrasTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request } from "express";
import { generateShareCard } from "../lib/share-card";

const router = Router();

const socialPreviewUserAgent =
  /facebookexternalhit|facebot|twitterbot|slackbot|discordbot|telegrambot|whatsapp|linkedinbot|pinterest|googlebot|bingbot|vkshare|redditbot|skypeuripreview/i;

router.get("/share/:slug/image", async (req, res) => {
  try {
    const [obra] = await db
      .select({
        titulo: obrasTable.titulo,
        sinopse: obrasTable.sinopse,
        capaUrl: obrasTable.capaUrl,
        tipografiaUrl: obrasTable.tipografiaUrl,
        updatedAt: obrasTable.updatedAt,
      })
      .from(obrasTable)
      .where(eq(obrasTable.slug, req.params.slug));

    if (!obra) {
      res.status(404).type("text/plain").send("Projeto não encontrado.");
      return;
    }

    const origin = getRequestOrigin(req);
    const coverUrl = toAbsoluteHttpUrl(obra.capaUrl, origin);
    const typographyUrl = obra.tipografiaUrl
      ? toAbsoluteHttpUrl(obra.tipografiaUrl, origin)
      : null;
    if (!coverUrl || (obra.tipografiaUrl && !typographyUrl)) {
      throw new Error("A capa ou a tipografia do projeto não tem uma URL válida.");
    }

    const image = await generateShareCard({
      title: obra.titulo,
      synopsis: obra.sinopse,
      coverUrl,
      typographyUrl,
      updatedAt: obra.updatedAt,
    });

    res.set("Cache-Control", "public, max-age=3600, s-maxage=86400");
    res.type("image/jpeg").send(image);
  } catch (error) {
    req.log.error(error, "Erro ao gerar a imagem de compartilhamento");
    res.status(502).type("text/plain").send("Não foi possível gerar a imagem do preview.");
  }
});

router.get("/share/:slug", async (req, res) => {
  try {
    const [obra] = await db
      .select({
        titulo: obrasTable.titulo,
        slug: obrasTable.slug,
        sinopse: obrasTable.sinopse,
        capaUrl: obrasTable.capaUrl,
        tipografiaUrl: obrasTable.tipografiaUrl,
        updatedAt: obrasTable.updatedAt,
      })
      .from(obrasTable)
      .where(eq(obrasTable.slug, req.params.slug));

    if (!obra) {
      res.status(404).type("text/plain").send("Projeto não encontrado.");
      return;
    }

    const origin = getRequestOrigin(req);
    const canonicalUrl = new URL(
      `/obra/${encodeURIComponent(obra.slug)}`,
      origin,
    );
    const episodeId = req.query.ep;
    if (typeof episodeId === "string" && /^\d+$/.test(episodeId)) {
      canonicalUrl.searchParams.set("ep", episodeId);
    }

    if (!socialPreviewUserAgent.test(req.get("user-agent") ?? "")) {
      res.redirect(302, `${canonicalUrl.pathname}${canonicalUrl.search}`);
      return;
    }

    const html = buildSharePage({
      title: obra.titulo,
      synopsis: obra.sinopse,
      coverUrl: toAbsoluteHttpUrl(obra.capaUrl, origin),
      typographyUrl: obra.tipografiaUrl
        ? toAbsoluteHttpUrl(obra.tipografiaUrl, origin)
        : null,
      shareCardUrl: createShareCardUrl(obra.slug, obra.updatedAt, origin),
      canonicalUrl: canonicalUrl.toString(),
    });

    res.set("Cache-Control", "public, max-age=300, s-maxage=300");
    res.type("html").send(html);
  } catch (error) {
    req.log.error(error, "Erro ao gerar preview de compartilhamento");
    res.status(500).type("text/plain").send("Não foi possível gerar o preview.");
  }
});

function buildSharePage({
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
  const escapedTypographyUrl = typographyUrl
    ? escapeHtml(typographyUrl)
    : null;
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

function createShareCardUrl(slug: string, updatedAt: Date, origin: string) {
  const url = new URL(
    `/api/share/${encodeURIComponent(slug)}/image`,
    origin,
  );
  url.searchParams.set("v", String(updatedAt.getTime()));
  return url.toString();
}

function getRequestOrigin(req: Request): string {
  const forwardedProtocol = req
    .get("x-forwarded-proto")
    ?.split(",")[0]
    .trim();
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

function toAbsoluteHttpUrl(value: string, origin: string): string | null {
  try {
    const url = new URL(value, origin);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function escapeHtml(value: string): string {
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

export default router;
