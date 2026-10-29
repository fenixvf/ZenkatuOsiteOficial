import { Router } from "express";
import sharp from "sharp";
import { db, mediaImagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// Tamanho máximo de lado preservado após a conversão.
const MAX_DIMENSION = 1600;
// Limite de payload JSON do express é 5mb; o base64 precisa caber nele.
const MAX_BASE64_LENGTH = 3.5 * 1024 * 1024;

/**
 * Recebe uma imagem (base64, qualquer formato), converte para WebP leve
 * e grava no banco. Devolve a URL pública que pode ser usada em capa,
 * banner, tipografia ou foto de elenco.
 */
router.post("/imagens", async (req, res) => {
  try {
    const { imageData } = req.body ?? {};
    if (typeof imageData !== "string" || !imageData.trim()) {
      res.status(400).json({ error: "imageData required" });
      return;
    }
    if (imageData.length > MAX_BASE64_LENGTH) {
      res.status(413).json({ error: "Imagem grande demais. Use uma resolução menor." });
      return;
    }

    const base64 = imageData.replace(/^data:image\/\w+;base64,/, "");
    const input = Buffer.from(base64, "base64");
    if (input.length === 0) {
      res.status(400).json({ error: "Imagem inválida" });
      return;
    }

    let webp: Buffer;
    try {
      webp = await sharp(input)
        .rotate()
        .resize({
          width: MAX_DIMENSION,
          height: MAX_DIMENSION,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer();
    } catch {
      res.status(400).json({ error: "Não foi possível processar a imagem." });
      return;
    }

    const [row] = await db
      .insert(mediaImagesTable)
      .values({ imageData: webp.toString("base64") })
      .returning();

    res.status(201).json({ id: row.id, url: `/api/imagens/${row.id}` });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/imagens/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).end();
      return;
    }
    const [img] = await db
      .select()
      .from(mediaImagesTable)
      .where(eq(mediaImagesTable.id, id));
    if (!img) {
      res.status(404).end();
      return;
    }
    res.set("Content-Type", "image/webp");
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.send(Buffer.from(img.imageData, "base64"));
  } catch (e) {
    req.log.error(e);
    res.status(500).end();
  }
});

export default router;
