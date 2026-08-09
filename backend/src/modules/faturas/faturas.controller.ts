import { Request, Response } from "express";

import {
  importarFatura,
  listarFaturas,
} from "./faturas.service";

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

    return res.json(data);
  } catch (err: any) {
    console.error(err);

    return res.status(500).json({
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

    return res.json(resultado);

  } catch (err: any) {
    console.error(err);

    return res.status(500).json({
      message: err.message,
    });
  }
}