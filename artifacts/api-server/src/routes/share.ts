import { Router } from "express";
import { db, obrasTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const socialPreviewUserAgent =
  /facebookexternalhit|facebot|twitterbot|slackbot|discordbot|telegrambot|whatsapp|linkedinbot|pinterest|googlebot|bingbot|vkshare|redditbot|skypeuripreview/i;

router.get("/share/:slug", async (req, res) => {
  try {
    const [obra] = await db
      .select({
        titulo: obrasTable.titulo,
        slug: obrasTable.slug,
        sinopse: obrasTable.sinopse,
        capaUrl: obrasTable.capaUrl,
        tipografiaUrl: obrasTable.tipografiaUrl,
      })
      .from(obrasTable)
      .where(eq(obrasTable.slug, req.params.slug));

    if (!obra) {
      res.status(404).type("text/plain").send("Projeto não encontrado.");
      return;
    }

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
    const origin = new URL(`${protocol}://${host}`).origin;
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
  canonicalUrl,
}: {
  title: string;
  synopsis: string;
  coverUrl: string | null;
  typographyUrl: string | null;
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

  const imageTags = escapedCoverUrl
    ? `
    <meta property="og:image" content="${escapedCoverUrl}" />
    <meta property="og:image:alt" content="Capa de ${escapedTitle}" />
    <meta name="twitter:image" content="${escapedCoverUrl}" />
    <meta name="twitter:image:alt" content="Capa de ${escapedTitle}" />`
    : "";
  const typographyTags = escapedTypographyUrl
    ? `
    <meta property="og:image" content="${escapedTypographyUrl}" />
    <meta property="og:image:alt" content="Tipografia de ${escapedTitle}" />
    <meta name="zenkatu:tipografia" content="${escapedTypographyUrl}" />`
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
