import { Router } from "express";

import {
    dashboardController,
} from "./dashboard.controller";

const router = Router();

router.get(
  "/cliente",
  dashboardController
);

export default router;