import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import scansRouter from "./scans";
import subscriptionsRouter from "./subscriptions";
import settingsRouter from "./settings";
import notificationsRouter from "./notifications";
import apikeysRouter from "./apikeys";
import statsRouter from "./stats";
import workspacesRouter from "./workspaces";
 
const router: IRouter = Router();
 
router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(scansRouter);
router.use(subscriptionsRouter);
router.use(settingsRouter);
router.use(notificationsRouter);
router.use(apikeysRouter);
router.use(statsRouter);
router.use(workspacesRouter);
 
export default router;