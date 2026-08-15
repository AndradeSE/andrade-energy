import { Request, Response } from "express";

import {
  importarFatura,
  analisarFatura,
  detalharFatura,
  excluirFatura,
  listarFaturas,
} from "./faturas.service";

export async function excluirFaturaController(req: Request, res: Response) {
  try { return res.json(await excluirFatura(req.params.id)); }
  catch (err: any) { return res.status(500).json({ message: err.message }); }
}

export async function analisarFaturaController(req: Request, res: Response) {
  try {
    return res.json(await analisarFatura(req));
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
}

export async function detalharFaturaController(req: Request, res: Response) {
  try {
    return res.json(await detalharFatura(req.params.id));
  } catch (err: any) {
    const naoEncontrada = err.message === "Fatura não encontrada.";
    return res.status(naoEncontrada ? 404 : 500).json({ message: err.message });
  }
}

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
