import { Request, Response } from "express";
import { processarFatura } from "../services/faturas/processarFatura.service";

export async function processarFaturaController(
  req: Request,
  res: Response
) {
  try {

    if (!req.file) {
      return res.status(400).json({
        erro: "Nenhum PDF enviado."
      });
    }

    const resultado =
      await processarFatura(req.file.path);

    return res.json(resultado);

  } catch (error: any) {
  console.error(error);

  return res.status(500).json({
    message: error.message,
    stack: error.stack
  });
}
}