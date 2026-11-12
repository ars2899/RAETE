import { Router, type IRouter } from "express";
import healthRouter from "./health";
import channel3Router from "./channel3";

const router: IRouter = Router();

router.use(healthRouter);
router.use(channel3Router);

export default router;
