import { Request, Response } from "express";

import { autenticar, cadastrarConta } from "./auth.service";

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

export async function cadastroController(req: Request, res: Response) {
  try {
    return res.status(201).json(await cadastrarConta(req.body));
  } catch (err: any) {
    return res.status(400).json({ message: err.message ?? "Não foi possível criar a conta." });
  }
}
