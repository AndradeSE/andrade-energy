import { Request, Response } from "express";

import {
  buscarFechamento,
  criarFechamento,
  listarFechamentos,
  obterResumoOperacao,
} from "./fechamentos.service";

export async function listarFechamentosController(
  req: Request,
  res: Response
) {
  try {
    const data = await listarFechamentos();

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
    const data = await obterResumoOperacao();

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
      req.params.id
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
    const data = await criarFechamento(
      req.body
    );

    res.status(201).json(data);
  } catch (err: any) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
}