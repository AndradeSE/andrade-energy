import { NextFunction, Request, Response } from "express";

import { supabase } from "../config/supabase";
import { hashToken } from "../utils/token";
import { empresaIdDoUsuario } from "../config/empresa";
import { EMPRESA_ANDRADE_ID } from "../config/empresa";

export async function exigirAutenticacao(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return res.status(401).json({ message: "Sessão não informada." });

  const { data, error } = await supabase
    .from("sessoes_usuarios")
    .select("id, usuario_id, expira_em, usuarios(*)")
    .eq("token_hash", hashToken(token))
    .is("revogada_em", null)
    .gt("expira_em", new Date().toISOString())
    .maybeSingle();

  const usuario = Array.isArray(data?.usuarios) ? data.usuarios[0] : data?.usuarios;
  if (error || !usuario || usuario.ativo !== true) {
    // A consulta principal ignora sessões revogadas. Fazemos uma segunda
    // leitura apenas para distinguir a conta de consumidor excluída de uma
    // sessão substituída/expirada, permitindo ao app voltar direto ao login.
    const { data: sessaoAnterior } = await supabase
      .from("sessoes_usuarios")
      .select("usuarios(ativo, perfil)")
      .eq("token_hash", hashToken(token))
      .maybeSingle();
    const usuarioAnterior = Array.isArray(sessaoAnterior?.usuarios)
      ? sessaoAnterior.usuarios[0]
      : sessaoAnterior?.usuarios;
    if (usuarioAnterior?.perfil === "LEITURA" && usuarioAnterior.ativo !== true) {
      return res.status(401).json({
        code: "CONTA_EXCLUIDA",
        message: "Esta conta de consumidor foi excluída. Entre novamente para continuar.",
      });
    }
    return res.status(401).json({ message: "Sessão inválida, expirada ou conta desativada." });
  }

  // Expiração deslizante: cada uso válido mantém a sessão deste aparelho
  // ativa por mais 30 dias. Uma sessão revogada por login em outro aparelho
  // continua inválida e nunca chega a este ponto.
  const novaExpiracao = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error: renovacaoError } = await supabase
    .from("sessoes_usuarios")
    .update({ expira_em: novaExpiracao })
    .eq("id", data!.id)
    .is("revogada_em", null);
  if (renovacaoError) {
    console.error("Não foi possível renovar a sessão ativa:", renovacaoError.message);
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

export function exigirSuperAdministradorAndrade(req: Request, res: Response, next: NextFunction) {
  const usuario = (req as any).usuario;
  if (usuario?.perfil !== "ADMIN" || empresaIdDoUsuario(usuario) !== EMPRESA_ANDRADE_ID) {
    return res.status(403).json({ message: "Acesso exclusivo da administração Andrade Energy." });
  }
  return next();
}
