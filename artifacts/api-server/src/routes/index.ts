import { Router, type IRouter } from "express";
import healthRouter from "./health";
import obrasRouter from "./obras";
import episodiosRouter from "./episodios";
import comentariosRouter from "./comentarios";
import usuariosRouter from "./usuarios";
import statsRouter from "./stats";
import listaRouter from "./lista";
import historicoRouter from "./historico";
import generosRouter from "./generos";
import configRouter from "./config";
import pushRouter from "./push";
import zenkatuberRouter from "./zenkatuber";
import shareRouter from "./share";
import imagenesRouter from "./imagenes";
import avaliacoesRouter from "./avaliacoes";
import convitesRouter from "./convites";

const router: IRouter = Router();

router.use(healthRouter);
router.use(shareRouter);
router.use(imagenesRouter);
router.use(avaliacoesRouter);
router.use(obrasRouter);
router.use(episodiosRouter);
router.use(comentariosRouter);
router.use(usuariosRouter);
router.use(statsRouter);
router.use(listaRouter);
router.use(historicoRouter);
router.use(generosRouter);
router.use(configRouter);
router.use(pushRouter);
router.use(zenkatuberRouter);
router.use(convitesRouter);

export default router;
