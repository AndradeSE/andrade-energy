import { NextFunction, Request, Response } from "express";

export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {

  console.error(error);

  return res.status(500).json({
    sucesso: false,
    erro: error.message
  });

}