import { Router } from "express";
import { loginController } from "./auth.controller";

const router = Router();
console.log("AUTH ROUTES CARREGADAS");
router.post("/login", loginController);

export default router;