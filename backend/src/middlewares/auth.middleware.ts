import { NextFunction, Request, Response } from "express";

import { supabase } from "../config/supabase";
import { hashToken } from "../utils/token";
import { empresaIdDoUsuario } from "../config/empresa";

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

  const usuario = Array.isArray(data?.usuarios) ? data.usuarios[0] : data?.usuarios;
  if (error || !usuario || usuario.ativo !== true) {
    return res.status(401).json({ message: "Sessão inválida, expirada ou conta desativada." });
  }
  (req as any).usuario = usuario;
  (req as any).empresaId = empresaIdDoUsuario(usuario);
  return next();
}

export function exigirGestor(req: Request, res: Response, next: NextFunction) {
  const perfil = (req as any).usuario?.perfil;
  if (perfil !== "ADMIN" && perfil !== "GESTOR") return res.status(403).json({ message: "Acesso exclusivo do gerador." });
  return next();
}

export function exigirAdministrador(req: Request, res: Response, next: NextFunction) {
  if ((req as any).usuario?.perfil !== "ADMIN") {
    return res.status(403).json({ message: "Apenas a conta administradora pode convidar novos geradores." });
  }
  return next();
}
