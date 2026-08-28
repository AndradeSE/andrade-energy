import { Request, Response } from "express";

import {
  buscarFechamento,
  fecharUsina,
  listarFechamentos,
  obterResumoOperacao,
} from "./fechamentos.service";
import { empresaIdDaRequisicao, garantirRegistroDaEmpresa } from "../../utils/empresaScope";

export async function listarFechamentosController(
  req: Request,
  res: Response
) {
  try {
    const data = await listarFechamentos(empresaIdDaRequisicao(req));

    res.json(data);
  } catch (err: any) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
}

export async function resumoOperacaoController(
  req: Request,
  res: Response
) {
  try {
    const data = await obterResumoOperacao(empresaIdDaRequisicao(req));

    res.json(data);
  } catch (err: any) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
}

export async function buscarFechamentoController(
  req: Request,
  res: Response
) {
  try {
    const data = await buscarFechamento(
      req.params.id,
      empresaIdDaRequisicao(req)
    );

    res.json(data);
  } catch (err: any) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
}

export async function criarFechamentoController(
  req: Request,
  res: Response
) {
  try {
    const empresaId = empresaIdDaRequisicao(req);
    await garantirRegistroDaEmpresa("usinas", req.body?.usinaId, empresaId);
    const data = await fecharUsina(req.body, empresaId);

    res.status(201).json(data);
  } catch (err: any) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
}
