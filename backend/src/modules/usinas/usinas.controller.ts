import { Request, Response } from "express";

import {
  atualizarUsinaService,
  buscarUsinaService,
  criarUsinaService,
  excluirUsinaService,
  listarUsinasService,
  obterDashboardUsina,
  importarFaturaGeradora,
  alocarUnidadeNaUsina,
  cadastrarIntegracaoInversor,
  excluirIntegracaoInversor,
  listarIntegracoesInversores,
} from "./usinas.service";
import { empresaIdDaRequisicao, garantirRegistroDaEmpresa } from "../../utils/empresaScope";

export async function alocarUnidadeController(req: Request, res: Response) {
  try {
    const empresaId = empresaIdDaRequisicao(req);
    await garantirRegistroDaEmpresa("usinas", req.params.id, empresaId);
    return res.json(await alocarUnidadeNaUsina(req.params.id, req.body, empresaId));
  }
  catch (e: any) { return res.status(400).json({ message: e.message }); }
}

export async function importarFaturaGeradoraController(req: Request, res: Response) {
  try {
    if (!req.file) return res.status(400).json({ message: "Arquivo não enviado." });
    await garantirRegistroDaEmpresa("usinas", req.params.id, empresaIdDaRequisicao(req));
    return res.json(await importarFaturaGeradora(req.params.id, req.file.path));
  } catch (e: any) {
    return res.status(400).json({ message: e.message });
  }
}

export async function listarUsinasController(
  req: Request,
  res: Response
) {
  try {
    const data = await listarUsinasService(empresaIdDaRequisicao(req));

    res.json(data);
  } catch (e: any) {
    res.status(500).json({
      message: e.message,
    });
  }
}

export async function buscarUsinaController(
  req: Request,
  res: Response
) {
  try {
    const data = await buscarUsinaService(
      req.params.id,
      empresaIdDaRequisicao(req),
    );

    res.json(data);
  } catch (e: any) {
    res.status(500).json({
      message: e.message,
    });
  }
}

export async function criarUsinaController(
  req: Request,
  res: Response
) {
  try {
    const data = await criarUsinaService(
      req.body,
      empresaIdDaRequisicao(req),
    );

    res.status(201).json(data);
  } catch (e: any) {
    res.status(500).json({
      message: e.message,
    });
  }
}

export async function atualizarUsinaController(
  req: Request,
  res: Response
) {
  try {
    const data = await atualizarUsinaService(
      req.params.id,
      req.body,
      empresaIdDaRequisicao(req),
    );

    res.json(data);
  } catch (e: any) {
    res.status(500).json({
      message: e.message,
    });
  }
}

export async function excluirUsinaController(
  req: Request,
  res: Response
) {
  try {
    const data = await excluirUsinaService(
      req.params.id,
      empresaIdDaRequisicao(req),
    );

    res.json(data);
  } catch (e: any) {
    res.status(500).json({
      message: e.message,
    });
  }
}

export async function dashboardUsinaController(
  req: Request,
  res: Response
) {
  try {
    const data = await obterDashboardUsina(
      req.params.id,
      empresaIdDaRequisicao(req),
    );

    res.json(data);
  } catch (e: any) {
    res.status(500).json({
      message: e.message,
    });
  }
}

export async function listarIntegracoesInversoresController(req: Request, res: Response) {
  try {
    const empresaId = empresaIdDaRequisicao(req);
    await garantirRegistroDaEmpresa("usinas", req.params.id, empresaId);
    return res.json(await listarIntegracoesInversores(req.params.id, empresaId));
  } catch (e: any) {
    return res.status(400).json({ message: e.message });
  }
}

export async function cadastrarIntegracaoInversorController(req: Request, res: Response) {
  try {
    const empresaId = empresaIdDaRequisicao(req);
    await garantirRegistroDaEmpresa("usinas", req.params.id, empresaId);
    return res.status(201).json(await cadastrarIntegracaoInversor(req.params.id, req.body, empresaId));
  } catch (e: any) {
    return res.status(400).json({ message: e.message });
  }
}

export async function excluirIntegracaoInversorController(req: Request, res: Response) {
  try {
    const empresaId = empresaIdDaRequisicao(req);
    await garantirRegistroDaEmpresa("usinas", req.params.id, empresaId);
    return res.json(await excluirIntegracaoInversor(req.params.id, req.params.integracaoId, empresaId));
  } catch (e: any) {
    return res.status(400).json({ message: e.message });
  }
}
