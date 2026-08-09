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
    const data = await obterParticipacoes(
      req.params.usinaId
    );

    return res.json(data);

  } catch (error: any) {

    console.error(error);

    return res.status(500).json(error);
  }
}

export async function criarParticipacaoController(
  req: Request,
  res: Response
) {
  try {

    const {
      usinaId,
      clienteId,
      percentual,
    } = req.body;

    const data =
      await cadastrarParticipacao(
        usinaId,
        clienteId,
        percentual
      );

    return res.status(201).json(data);

  } catch (error: any) {

    if (error.code === "23505") {
      return res.status(409).json({
        message: "Cliente já vinculado à usina."
      });
    }

    console.error(error);

    return res.status(500).json(error);
  }
}