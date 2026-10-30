import { Request, Response } from "express";
import { obterCreditos } from "./creditos.service";

export async function listarCreditosController(
  req: Request<{ clienteId: string }>,
  res: Response
) {
  try {

    const data = await obterCreditos(
      req.params.clienteId
    );

    return res.json(data);

  } catch (error) {

    console.error(error);

    return res.status(500).json(error);

  }
}
