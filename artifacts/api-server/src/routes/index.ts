import { Router, type IRouter } from "express";
import healthRouter from "./health";
import channel3Router from "./channel3";
import raeteExplanationRouter from "./raete-explanation";

const router: IRouter = Router();

router.use(healthRouter);
router.use(channel3Router);
router.use(raeteExplanationRouter);

export default router;
