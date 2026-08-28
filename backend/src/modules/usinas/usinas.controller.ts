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
} from "./usinas.service";
import { empresaIdDaRequisicao, garantirRegistroDaEmpresa } from "../../utils/empresaScope";

export async function alocarUnidadeController(req: Request, res: Response) {
  try { await garantirRegistroDaEmpresa("usinas", req.params.id, empresaIdDaRequisicao(req)); return res.json(await alocarUnidadeNaUsina(req.params.id, req.body)); }
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
