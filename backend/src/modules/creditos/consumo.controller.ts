import { Request, Response } from "express";
import { consumirCreditos } from "./consumo.service";

export async function consumirCreditosController(
  req: Request,
  res: Response
) {
  try {

    const {
      clienteId,
      competencia,
      energia,
    } = req.body;

    const data =
      await consumirCreditos(
        clienteId,
        competencia,
        energia
      );

    return res.json(data);

  } catch (err) {

    return res.status(500).json(err);

  }
}