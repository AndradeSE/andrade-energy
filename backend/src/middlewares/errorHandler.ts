import { NextFunction, Request, Response } from "express";
import { ImagemFaturaError } from "../services/ocr/imagemFatura";

export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (error instanceof ImagemFaturaError) return res.status(400).json({ message: error.message });

  // Não incluir payloads, URLs ou mensagens de provedores nos logs públicos.
  console.error("Falha interna da API", { metodo: req.method, rota: req.path.split("/").filter(Boolean).slice(0, 2).join("/"), tipo: error?.name ?? "Error" });

  return res.status(500).json({
    sucesso: false,
    erro: "Não foi possível concluir a operação. Tente novamente ou contate o suporte."
  });

}
