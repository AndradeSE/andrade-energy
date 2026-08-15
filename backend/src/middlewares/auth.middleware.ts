import { NextFunction, Request, Response } from "express";

import { supabase } from "../config/supabase";
import { hashToken } from "../utils/token";

export async function exigirAutenticacao(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return res.status(401).json({ message: "Sessão não informada." });

  const { data, error } = await supabase
    .from("sessoes_usuarios")
    .select("usuario_id, usuarios(*)")
    .eq("token_hash", hashToken(token))
    .is("revogada_em", null)
    .gt("expira_em", new Date().toISOString())
    .maybeSingle();

  if (error || !data?.usuarios) return res.status(401).json({ message: "Sessão inválida ou expirada." });
  (req as any).usuario = data.usuarios;
  return next();
}

export function exigirGestor(req: Request, res: Response, next: NextFunction) {
  const perfil = (req as any).usuario?.perfil;
  if (perfil !== "ADMIN" && perfil !== "GESTOR") return res.status(403).json({ message: "Acesso exclusivo do gerador." });
  return next();
}
