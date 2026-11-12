import { Router, type IRouter } from "express";
import healthRouter from "./health";
import channel3Router from "./channel3";
import raeteExplanationRouter from "./raete-explanation";
import paypalRouter from "./paypal";

const router: IRouter = Router();

router.use(healthRouter);
router.use(channel3Router);
router.use(raeteExplanationRouter);
router.use(paypalRouter);

export default router;
