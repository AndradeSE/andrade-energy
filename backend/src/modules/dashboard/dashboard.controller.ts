import { Request, Response } from "express";

import { dashboardCliente } from "./dashboard.service";
import { empresaIdDaRequisicao } from "../../utils/empresaScope";

export async function dashboardController(
  req: Request,
  res: Response
) {
  try {
    const clienteId =
      String(req.query.clienteId);

    const data =
      await dashboardCliente(clienteId, req.query.uc ? String(req.query.uc) : undefined, empresaIdDaRequisicao(req));

    return res.json(data);

  } catch (e: any) {

    return res.status(500).json({
      message: e.message,
    });

  }
}
