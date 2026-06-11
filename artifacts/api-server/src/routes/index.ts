import { Router, type IRouter } from "express";
import healthRouter from "./health";
import obrasRouter from "./obras";
import episodiosRouter from "./episodios";
import comentariosRouter from "./comentarios";
import usuariosRouter from "./usuarios";
import statsRouter from "./stats";
import listaRouter from "./lista";
import generosRouter from "./generos";

const router: IRouter = Router();

router.use(healthRouter);
router.use(obrasRouter);
router.use(episodiosRouter);
router.use(comentariosRouter);
router.use(usuariosRouter);
router.use(statsRouter);
router.use(listaRouter);
router.use(generosRouter);

export default router;
