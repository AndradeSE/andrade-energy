console.log("CLIENTES CONTROLLER CARREGADO");
import { Request, Response } from "express";

import {
  atualizarCliente,
  buscarCliente,
  criarCliente,
  excluirCliente,
  listarClientes,
} from "./clientes.service";

export async function listarClientesController(
  req: Request,
  res: Response
) {
  try {
    const data = await listarClientes();
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({
      message: e.message,
    });
  }
}

export async function buscarClienteController(
  req: Request,
  res: Response
) {
  try {
    const data = await buscarCliente(req.params.id);
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({
      message: e.message,
    });
  }
}

export async function criarClienteController(
  req: Request,
  res: Response
) {
  try {
    const data = await criarCliente(req.body);
    return res.status(201).json(data);
  } catch (e: any) {
    return res.status(500).json({
      message: e.message,
    });
  }
}

export async function atualizarClienteController(
  req: Request,
  res: Response
) {
  try {
    const data = await atualizarCliente(
      req.params.id,
      req.body
    );

    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({
      message: e.message,
    });
  }
}

export async function excluirClienteController(
  req: Request,
  res: Response
) {
  try {
    await excluirCliente(req.params.id);

    return res.status(204).send();
  } catch (e: any) {
    return res.status(500).json({
      message: e.message,
    });
  }
}