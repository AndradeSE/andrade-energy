import { Request, Response } from "express";
import { login } from "./auth.service";

export async function loginController(
  req: Request,
  res: Response
) {
  try {
    const { email, senha } = req.body;

    const usuario =
      await login(email, senha);

    res.json(usuario);

  } catch (error: any) {

    res.status(401).json({
      message: error.message,
    });

  }
}