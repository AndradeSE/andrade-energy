import { Request, Response } from "express";

import {
  importarFatura,
  listarFaturas,
} from "../modules/faturas/faturas.service";

export async function listarFaturasController(
  req: Request,
  res: Response
) {
  try {
    const { clienteId, uc } = req.query;

    const data = await listarFaturas({
      clienteId: clienteId as string | undefined,
      uc: uc as string | undefined,
    });

    return res.status(200).json(data);

  } catch (err: any) {
    console.error(err);

    return res.status(500).json({
      sucesso: false,
      message: err.message,
    });
  }
}

export async function importarFaturaController(
  req: Request,
  res: Response
) {
  try {

    const resultado =
      await importarFatura(req);

    return res.status(200).json(resultado);

  } catch (err: any) {

    console.error(err);

    return res.status(500).json({
      sucesso: false,
      message:
        err.message ?? "Erro ao importar fatura.",
    });

  }
}