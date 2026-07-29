import { Request, Response } from "express";
import { obterDashboard } from "./dashboard.service";

type Params = {
  clienteId: string;
};

export async function dashboardController(
  req: Request<Params>,
  res: Response
) {

   try {
    console.log("Dashboard solicitado:", req.params.clienteId);
 const dashboard = await obterDashboard(req.params.clienteId);

    console.log("Dashboard retornado");

    res.json(dashboard);
  } catch (error) {
    console.error("Erro no dashboard:", error);
    res.status(500).json({ error: String(error) });
  }
}