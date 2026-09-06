import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import ordersRouter from "./orders";
import settingsRouter from "./settings";
import managerSessionRouter from "./managerSession";

const router: IRouter = Router();

router.use(healthRouter);
router.use(managerSessionRouter);
router.use(productsRouter);
router.use(ordersRouter);
router.use(settingsRouter);

export default router;
