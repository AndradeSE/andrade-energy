import { NextFunction, Request, Response } from "express";

import { supabase } from "../config/supabase";
import { hashToken } from "../utils/token";
import { empresaIdDoUsuario } from "../config/empresa";
import { usuarioEhSuperAdministradorAndrade } from "../config/empresa";

export async function exigirAutenticacao(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return res.status(401).json({ message: "Sessão não informada." });

  const { data, error } = await supabase
    .from("sessoes_usuarios")
    .select("id, usuario_id, empresa_ativa_id, expira_em, usuarios(*)")
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

  let empresaAtivaId = String(data?.empresa_ativa_id ?? usuario.empresa_id ?? "");
  const { data: vinculo } = await supabase
    .from("empresa_usuarios")
    .select("empresa_id,papel,permissoes")
    .eq("usuario_id", usuario.id)
    .eq("empresa_id", empresaAtivaId)
    .eq("ativo", true)
    .maybeSingle();
  let papelEmpresa = vinculo?.papel ?? null;
  let permissoesEmpresa = vinculo?.permissoes ?? {};
  if (!vinculo) {
    const { data: principal } = await supabase
      .from("empresa_usuarios")
      .select("empresa_id,papel,permissoes")
      .eq("usuario_id", usuario.id)
      .eq("ativo", true)
      .order("principal", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!principal) return res.status(403).json({ message: "Sua conta não possui acesso a uma empresa ativa." });
    empresaAtivaId = principal.empresa_id;
    papelEmpresa = principal.papel;
    permissoesEmpresa = principal.permissoes ?? {};
    await supabase.from("sessoes_usuarios").update({ empresa_ativa_id: empresaAtivaId }).eq("id", data!.id);
  }

  const usuarioDaSessao = { ...usuario, empresa_principal_id: usuario.empresa_id, empresa_id: empresaAtivaId, papel_empresa: papelEmpresa, permissoes: permissoesEmpresa };
  (req as any).usuario = usuarioDaSessao;
  (req as any).empresaId = empresaAtivaId;
  (req as any).sessaoId = data!.id;
  if (String(papelEmpresa ?? "").startsWith("COLABORADOR_")) {
    void supabase.from("empresa_usuarios").update({ ultimo_acesso_em: new Date().toISOString(), atualizado_em: new Date().toISOString() }).eq("usuario_id", usuario.id).eq("empresa_id", empresaAtivaId);
  }
  return next();
}

export function exigirGestor(req: Request, res: Response, next: NextFunction) {
  const perfil = (req as any).usuario?.perfil;
  const papel = String((req as any).usuario?.papel_empresa ?? "").toUpperCase();
  if (perfil !== "ADMIN" && perfil !== "GESTOR" && papel !== "COLABORADOR_GERADOR") return res.status(403).json({ message: "Acesso exclusivo da operação geradora." });
  if (papel === "COLABORADOR_GERADOR") {
    const recurso = req.baseUrl.includes("/clientes")
      ? (req.path.includes("unidade") ? "unidades" : "clientes")
      : req.baseUrl.includes("/usinas") ? "usinas"
        : req.baseUrl.includes("/contratos") ? "contratos"
          : req.baseUrl.includes("/faturas") ? "faturas"
            : null;
    if (recurso && (req as any).usuario?.permissoes?.[recurso] === false) {
      return res.status(403).json({ message: `Seu acesso a ${recurso} não foi liberado pelo titular.` });
    }
  }
  return next();
}

export function exigirOperacaoComercial(req: Request, res: Response, next: NextFunction) {
  const usuario = (req as any).usuario;
  const papel = String(usuario?.papel_empresa ?? "").toUpperCase();
  if (usuarioEhSuperAdministradorAndrade(usuario)) return next();
  if (papel === "COLABORADOR_COMERCIAL" && usuario?.permissoes?.geradores !== false) return next();
  return res.status(403).json({ message: "Acesso não liberado para a gestão comercial." });
}

export function exigirTitularFinanceiro(req: Request, res: Response, next: NextFunction) {
  const usuario = (req as any).usuario;
  const papel = String(usuario?.papel_empresa ?? "").toUpperCase();
  if (["COLABORADOR_GERADOR", "COLABORADOR_COMERCIAL"].includes(papel)) {
    return res.status(403).json({ message: "Colaboradores não possuem acesso à carteira, recebíveis ou transferências." });
  }
  if (!["ADMIN", "GESTOR"].includes(String(usuario?.perfil ?? "").toUpperCase())) {
    return res.status(403).json({ message: "Acesso financeiro exclusivo do titular." });
  }
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
  if (!usuarioEhSuperAdministradorAndrade(usuario)) {
    return res.status(403).json({ message: "Acesso exclusivo da administração Andrade Energy." });
  }
  return next();
}
