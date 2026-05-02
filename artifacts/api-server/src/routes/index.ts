import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mapRouter from "./map";
import locationsRouter from "./locations";
import submitRouter from "./submit";
import authRouter from "./auth";
import profileRouter from "./profile";
import reportRouter from "./report";
import verifyRouter from "./verify";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mapRouter);
router.use(locationsRouter);
router.use(submitRouter);
router.use(authRouter);
router.use(profileRouter);
router.use(reportRouter);
router.use(verifyRouter);

export default router;
