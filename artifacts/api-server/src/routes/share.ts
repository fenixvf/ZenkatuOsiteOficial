import { Router } from "express";
import { db, obrasTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateShareCard, renderImageFallback } from "../lib/share-card";
import {
  buildSharePage,
  createShareCardUrl,
  getRequestOrigin,
  socialPreviewUserAgent,
  toAbsoluteHttpUrl,
} from "../lib/share-page";

const router = Router();

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

    res.set("Cache-Control", "public, max-age=3600, s-maxage=86400");

    try {
      const image = await generateShareCard({
        title: obra.titulo,
        synopsis: obra.sinopse,
        coverUrl,
        typographyUrl,
        updatedAt: obra.updatedAt,
      });
      res.type("image/jpeg").send(image);
      return;
    } catch (cardError) {
      // Compatibilidade entre formatos: se o card não puder ser montado
      // (formato exótico da capa, timeout, etc.), serve a capa normalizada
      // para o preview continuar carregando no Discord/WhatsApp.
      req.log.warn(
        { err: cardError, slug: req.params.slug },
        "Card de compartilhamento falhou; usando a capa como fallback",
      );
      const fallback = await renderImageFallback(coverUrl);
      res.type(fallback.contentType).send(fallback.buffer);
    }
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

export default router;
