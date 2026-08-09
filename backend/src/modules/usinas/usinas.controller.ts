import { Request, Response } from "express";

import {
  atualizarUsinaService,
  buscarUsinaService,
  criarUsinaService,
  excluirUsinaService,
  listarUsinasService,
  obterDashboardUsina,
} from "./usinas.service";

export async function listarUsinasController(
  req: Request,
  res: Response
) {
  try {
    const data = await listarUsinasService();

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
      req.params.id
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
      req.body
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
      req.body
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
      req.params.id
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
      req.params.id
    );

    res.json(data);
  } catch (e: any) {
    res.status(500).json({
      message: e.message,
    });
  }
}