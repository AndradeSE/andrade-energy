import { Router } from "express";
import { dashboardController } from "./dashboard.controller";

const router = Router();

router.get("/:clienteId", dashboardController);

export default router;