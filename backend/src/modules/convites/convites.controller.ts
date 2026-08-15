import { Request, Response } from "express";
import { consultarConvite, criarConvite } from "./convites.service";

export async function criarConviteController(req: Request, res: Response) {
  try { return res.status(201).json(await criarConvite(req.body, (req as any).usuario)); }
  catch (e: any) { return res.status(400).json({ message: e.message }); }
}

export async function consultarConviteController(req: Request, res: Response) {
  try { return res.json(await consultarConvite(req.params.token)); }
  catch (e: any) { return res.status(400).json({ message: e.message }); }
}
