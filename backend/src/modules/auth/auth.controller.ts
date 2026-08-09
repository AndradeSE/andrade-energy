import { Request, Response } from "express";

import { autenticar } from "./auth.service";

export async function loginController(
  req: Request,
  res: Response
) {
  try {
    const { email, senha } = req.body;

    const resultado = await autenticar(
      email,
      senha
    );

    return res.json(resultado);

  } catch (err: any) {

    console.error("ERRO LOGIN:", err);

    return res.status(401).json({
      message: err.message,
    });

  }
}