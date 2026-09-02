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
  confirmarCadastroCliente,
  obterSolicitacaoCadastroCliente,
  anexarFaturaAoCliente,
  listarFaturasAnexadasDoCliente,
  excluirFaturaAnexadaDoCliente,
} from "./clientes.service";
import { empresaIdDaRequisicao } from "../../utils/empresaScope";

export async function listarClientesController(
  req: Request,
  res: Response
) {
  try {
    const data = await listarClientes(empresaIdDaRequisicao(req));
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
    const data = await buscarCliente(req.params.id, empresaIdDaRequisicao(req));
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({
      message: e.message,
    });
  }
}

export async function obterSolicitacaoCadastroClienteController(req: Request, res: Response) {
  try {
    const solicitacao = await obterSolicitacaoCadastroCliente(req.params.id, empresaIdDaRequisicao(req));
    if (!solicitacao) return res.status(404).json({ message: "Nenhuma solicitação de cadastro encontrada." });
    return res.json(solicitacao);
  } catch (e: any) {
    return res.status(400).json({ message: e.message ?? "Não foi possível carregar a solicitação." });
  }
}

export async function confirmarCadastroClienteController(req: Request, res: Response) {
  try {
    return res.json(await confirmarCadastroCliente(
      req.params.id,
      (req as any).usuario.id,
      empresaIdDaRequisicao(req),
    ));
  } catch (e: any) {
    return res.status(400).json({ message: e.message ?? "Não foi possível confirmar o cadastro." });
  }
}

export async function listarFaturasAnexadasClienteController(req: Request, res: Response) {
  try {
    return res.json(await listarFaturasAnexadasDoCliente(
      req.params.id,
      (req as any).usuario,
      empresaIdDaRequisicao(req),
    ));
  } catch (e: any) {
    return res.status(400).json({ message: e.message ?? "Não foi possível carregar as faturas anexadas." });
  }
}

export async function anexarFaturaClienteController(req: Request, res: Response) {
  try {
    return res.status(201).json(await anexarFaturaAoCliente(
      req.params.id,
      (req as any).usuario,
      empresaIdDaRequisicao(req),
      req.file,
    ));
  } catch (e: any) {
    return res.status(400).json({ message: e.message ?? "Não foi possível anexar a fatura." });
  }
}

export async function excluirFaturaAnexadaClienteController(req: Request, res: Response) {
  try {
    return res.json(await excluirFaturaAnexadaDoCliente(
      req.params.id,
      req.params.anexoId,
      empresaIdDaRequisicao(req),
    ));
  } catch (e: any) {
    return res.status(400).json({ message: e.message ?? "Não foi possível excluir a fatura anexada." });
  }
}

export async function criarClienteController(
  req: Request,
  res: Response
) {
  try {
    const data = await criarCliente(req.body, empresaIdDaRequisicao(req));
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
      req.body,
      empresaIdDaRequisicao(req),
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
    await excluirCliente(req.params.id, empresaIdDaRequisicao(req));

    return res.status(204).send();
  } catch (e: any) {
    return res.status(500).json({
      message: e.message,
    });
  }
}

export async function listarUnidadesClienteController(req: Request, res: Response) {
  try {
    return res.json(await listarUnidadesCliente(req.params.id, empresaIdDaRequisicao(req)));
  } catch (e: any) {
    return res.status(500).json({ message: e.message });
  }
}

export async function cadastrarUnidadeClienteController(req: Request, res: Response) {
  try {
    return res.status(201).json(await cadastrarUnidadeCliente(req.params.id, req.body?.numero, req.body?.cpfTitular, empresaIdDaRequisicao(req)));
  } catch (e: any) {
    return res.status(400).json({ message: e.message });
  }
}

export async function listarTodasUnidadesController(req: Request, res: Response) {
  try {
    return res.json(await listarTodasUnidades(empresaIdDaRequisicao(req)));
  } catch (e: any) {
    return res.status(500).json({ message: e.message });
  }
}

export async function buscarUnidadeController(req: Request, res: Response) {
  try {
    const unidade = await buscarUnidadePorId(req.params.unidadeId, empresaIdDaRequisicao(req));
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
    await excluirUnidadeCliente(req.params.unidadeId, empresaIdDaRequisicao(req));
    return res.status(204).send();
  } catch (e: any) {
    return res.status(400).json({ message: e.message });
  }
}

export async function listarMinhasUnidadesController(req: Request, res: Response) {
  try {
    const usuario = (req as any).usuario;
    return res.json(await listarUnidadesPorCpf(usuario?.cpf, empresaIdDaRequisicao(req)));
  } catch (e: any) {
    return res.status(500).json({ message: e.message });
  }
}
