import { Request, Response } from "express";

import {
  importarFatura,
  analisarFatura,
  detalharFatura,
  excluirFatura,
  regenerarDocumentosFatura,
  confirmarFaturaRascunho,
  listarFaturas,
} from "./faturas.service";
import { empresaIdDaRequisicao } from "../../utils/empresaScope";

export async function excluirFaturaController(req: Request, res: Response) {
  try { return res.json(await excluirFatura(req.params.id, empresaIdDaRequisicao(req))); }
  catch (err: any) { return res.status(500).json({ message: err.message }); }
}

export async function confirmarFaturaRascunhoController(req: Request, res: Response) {
  try { return res.json(await confirmarFaturaRascunho(req.params.id, empresaIdDaRequisicao(req))); }
  catch (err: any) { return res.status(400).json({ message: err.message }); }
}

export async function regenerarDocumentosFaturaController(req: Request, res: Response) {
  try { return res.json(await regenerarDocumentosFatura(req.params.id, empresaIdDaRequisicao(req))); }
  catch (err: any) { return res.status(err.message === "Fatura não encontrada." ? 404 : 500).json({ message: err.message }); }
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
    return res.json(await detalharFatura(req.params.id, empresaIdDaRequisicao(req)));
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
      empresaId: empresaIdDaRequisicao(req),
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
