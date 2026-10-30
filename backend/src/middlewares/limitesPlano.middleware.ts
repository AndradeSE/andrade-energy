import { NextFunction, Request, Response } from "express";
import { supabase } from "../config/supabase";
import { usuarioEhSuperAdministradorAndrade } from "../config/empresa";
import { RecursoLimitado, validarLimitePlano } from "../modules/comercial/limitesPlano";

export function exigirCapacidadeDoPlano(recurso: RecursoLimitado) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuario = (req as any).usuario;
      if (usuarioEhSuperAdministradorAndrade(usuario)) return next();
      const { data: assinatura, error } = await supabase
        .from("assinaturas_geradores")
        .select("status,fim_teste_em,plano:planos_geradores!assinaturas_geradores_plano_id_fkey(limite_usinas,limite_clientes)")
        .eq("gerador_id", usuario.id)
        .in("status", ["ATIVA", "TESTE"])
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!assinatura) return res.status(402).json({ message: "Ative uma assinatura ou período de teste para continuar." });
      if (assinatura.status === "TESTE" && assinatura.fim_teste_em && assinatura.fim_teste_em < new Date().toISOString().slice(0, 10)) {
        return res.status(402).json({ message: "Seu período de teste terminou. Escolha um plano para continuar." });
      }
      const plano: any = Array.isArray(assinatura.plano) ? assinatura.plano[0] : assinatura.plano;
      const tabela = recurso === "usinas" ? "usinas" : "clientes";
      const { count, error: countError } = await supabase.from(tabela).select("id", { count: "exact", head: true }).eq("empresa_id", (req as any).empresaId);
      if (countError) throw countError;
      validarLimitePlano(count ?? 0, recurso === "usinas" ? plano?.limite_usinas : plano?.limite_clientes, recurso);
      return next();
    } catch (error: any) {
      return res.status(403).json({ message: error.message ?? "Não foi possível validar os limites do plano." });
    }
  };
}
