import { Request, Response } from "express";

import {
  atualizarCliente,
  buscarCliente,
  buscarUnidadePorId,
  criarCliente,
  excluirCliente,
  listarClientes,
  listarTodasUnidades,
  listarUnidadesCliente,
  listarUnidadesPorCpf,
  cadastrarUnidadeCliente,
  excluirUnidadeCliente,
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

export async function listarUnidadesClienteController(req: Request, res: Response) {
  try {
    return res.json(await listarUnidadesCliente(req.params.id));
  } catch (e: any) {
    return res.status(500).json({ message: e.message });
  }
}

export async function cadastrarUnidadeClienteController(req: Request, res: Response) {
  try {
    return res.status(201).json(await cadastrarUnidadeCliente(req.params.id, req.body?.numero, req.body?.cpfTitular));
  } catch (e: any) {
    return res.status(400).json({ message: e.message });
  }
}

export async function listarTodasUnidadesController(_: Request, res: Response) {
  try {
    return res.json(await listarTodasUnidades());
  } catch (e: any) {
    return res.status(500).json({ message: e.message });
  }
}

export async function buscarUnidadeController(req: Request, res: Response) {
  try {
    const unidade = await buscarUnidadePorId(req.params.unidadeId);
    if (!unidade) return res.status(404).json({ message: "Unidade consumidora não encontrada." });

    const usuario = (req as any).usuario;
    if (usuario?.perfil === "LEITURA" && usuario?.cliente_id !== unidade.cliente_id) {
      return res.status(403).json({ message: "Você não possui acesso a esta unidade." });
    }
    return res.json(unidade);
  } catch (e: any) {
    return res.status(500).json({ message: e.message });
  }
}

export async function excluirUnidadeClienteController(req: Request, res: Response) {
  try {
    await excluirUnidadeCliente(req.params.unidadeId);
    return res.status(204).send();
  } catch (e: any) {
    return res.status(400).json({ message: e.message });
  }
}

export async function listarMinhasUnidadesController(req: Request, res: Response) {
  try {
    const usuario = (req as any).usuario;
    return res.json(await listarUnidadesPorCpf(usuario?.cpf));
  } catch (e: any) {
    return res.status(500).json({ message: e.message });
  }
}
