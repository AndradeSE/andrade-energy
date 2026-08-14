import { Request, Response } from "express";

import * as ContratosService from "./contratos.service";

console.log("========== CONTROLLER ==========");
console.log(ContratosService);
console.log("===============================");

export async function buscarContratoController(
  req: Request,
  res: Response
) {
  try {

    const contrato =
      await ContratosService.obterContratoCliente(
        req.params.clienteId
      );

    res.json(contrato);

  } catch (e: any) {

    console.error(e);

    res.status(500).json({
      message: e.message,
    });

  }
}

export async function criarContratoController(
  req: Request,
  res: Response
) {
  try {

    const contrato =
      await ContratosService.criarContratoService(
        req.body
      );

    res.status(201).json(contrato);

  } catch (e: any) {

    console.error(e);

    res.status(500).json({
      message: e.message,
    });

  }
}

export async function atualizarContratoController(
  req: Request,
  res: Response
) {
  try {

    const contrato =
      await ContratosService.atualizarContratoService(
        req.params.id,
        req.body
      );

    res.json(contrato);

  } catch (e: any) {

    console.error(e);

    res.status(500).json({
      message: e.message,
    });

  }
}

export async function excluirContratoController(
  req: Request,
  res: Response
) {
  try {

    const retorno =
      await ContratosService.excluirContratoService(
        req.params.id
      );

    res.json(retorno);

  } catch (e: any) {

    console.error(e);

    res.status(500).json({
      message: e.message,
    });

  }
}