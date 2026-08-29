import { Request, Response } from "express";
import { alterarStatusGerador, listarGeradores, removerGerador } from "./usuarios.service";

export async function listarGeradoresController(_: Request, res: Response) {
  try { return res.json(await listarGeradores()); }
  catch (error: any) { return res.status(400).json({ message: error.message ?? "Não foi possível listar os geradores." }); }
}

export async function removerGeradorController(req: Request, res: Response) {
  try { return res.json(await removerGerador(req.params.id, (req as any).usuario.id)); }
  catch (error: any) { return res.status(400).json({ message: error.message ?? "Não foi possível remover o gerador." }); }
}

export async function alterarStatusGeradorController(req: Request, res: Response) {
  try { return res.json(await alterarStatusGerador(req.params.id, Boolean(req.body?.ativo), (req as any).usuario.id)); }
  catch (error: any) { return res.status(400).json({ message: error.message ?? "Não foi possível alterar a conta." }); }
}
