import { Request, Response } from "express";
import {
    cadastrarParticipacao,
    obterParticipacoes,
} from "./participacoes.service";

export async function listarParticipacoesController(
  req: Request<{ usinaId: string }>,
  res: Response
) {
  try {
    const data = await obterParticipacoes(req.params.usinaId);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json(error);
  }
}

export async function criarParticipacaoController(
  req: Request,
  res: Response
) {
  try {
    const { usinaId, clienteId, percentual } = req.body;

    const data = await cadastrarParticipacao(
      usinaId,
      clienteId,
      percentual
    );

    res.status(201).json(data);
  } catch (error) {
    console.error("ERRO PARTICIPAÇÃO:", error);
    res.status(500).json(error);
  }
}