import { Router, type Request, type Response } from "express";
import { db, obrasTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  buildObraHead,
  buildSharePage,
  createShareCardUrl,
  getRequestOrigin,
  injectObraHead,
  loadSpaIndexHtml,
  resolveObraSlug,
  toAbsoluteHttpUrl,
} from "../lib/share-page";

const router = Router();

/**
 * Serve a página da obra injetando as metatags de preview (título, sinopse,
 * capa e tipografia) direto no HTML do SPA. A Vercel reescreve /obra/:slug
 * para a function da API (ver vercel.json), então tanto o Discord/WhatsApp
 * quanto o navegador recebem a mesma URL — os crawlers leem as metatags e os
 * usuários continuam entrando pela aplicação React.
 */
async function handleObraPage(req: Request, res: Response) {
  const slug = resolveObraSlug(req);
  const template = loadSpaIndexHtml();
  const cacheHeader =
    "public, max-age=60, s-maxage=300, stale-while-revalidate=3600";

  let obra: {
    titulo: string;
    slug: string;
    sinopse: string;
    capaUrl: string;
    tipografiaUrl: string | null;
    updatedAt: Date;
  } | null = null;

  if (slug) {
    try {
      const [found] = await db
        .select({
          titulo: obrasTable.titulo,
          slug: obrasTable.slug,
          sinopse: obrasTable.sinopse,
          capaUrl: obrasTable.capaUrl,
          tipografiaUrl: obrasTable.tipografiaUrl,
          updatedAt: obrasTable.updatedAt,
        })
        .from(obrasTable)
        .where(eq(obrasTable.slug, slug));
      obra = found ?? null;
    } catch (error) {
      req.log.error(error, "Erro ao buscar a obra para o preview da página");
    }
  }

  if (!obra) {
    // Slug inexistente ou banco indisponível: o SPA cuida do conteúdo
    // (página 404 ou dados em cache), sem quebrar a navegação.
    if (template) {
      res.set("Cache-Control", "public, max-age=30, s-maxage=60");
      res.type("html").send(template);
      return;
    }
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

  const shareCardUrl = createShareCardUrl(obra.slug, obra.updatedAt, origin);

  if (!template) {
    // Build parcial: cai para a página de compartilhamento, que já contém
    // todas as metatags necessárias.
    res.set("Cache-Control", cacheHeader);
    res.type("html").send(
      buildSharePage({
        title: obra.titulo,
        synopsis: obra.sinopse,
        coverUrl: toAbsoluteHttpUrl(obra.capaUrl, origin),
        typographyUrl: obra.tipografiaUrl
          ? toAbsoluteHttpUrl(obra.tipografiaUrl, origin)
          : null,
        shareCardUrl,
        canonicalUrl: canonicalUrl.toString(),
      }),
    );
    return;
  }

  const head = buildObraHead({
    title: obra.titulo,
    synopsis: obra.sinopse,
    canonicalUrl: canonicalUrl.toString(),
    shareCardUrl,
  });

  res.set("Cache-Control", cacheHeader);
  res.type("html").send(injectObraHead(template, head));
}

router.get("/obra/:slug", (req, res) => void handleObraPage(req, res));
router.get("/obra/:slug/", (req, res) => void handleObraPage(req, res));

export default router;
