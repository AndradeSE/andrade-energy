import { supabase } from "../config/supabase";
import { EMPRESA_ANDRADE_ID } from "../config/empresa";
import { NextFunction, Request, Response } from "express";

export function empresaIdDaRequisicao(req: any) {
  return String(req?.empresaId ?? req?.usuario?.empresa_id ?? EMPRESA_ANDRADE_ID);
}

export function incluirEmpresa<T extends Record<string, unknown>>(dados: T, empresaId: string) {
  return { ...dados, empresa_id: empresaId };
}

export async function garantirRegistroDaEmpresa(tabela: string, id: string, empresaId: string) {
  const { data, error } = await supabase.from(tabela).select("id").eq("id", id).eq("empresa_id", empresaId).maybeSingle();
  if (error) throw error;
  if (!data) {
    const erro: any = new Error("Registro não encontrado para esta empresa.");
    erro.status = 404;
    throw erro;
  }
}

export function exigirRegistroDaEmpresa(tabela: string, parametro = "id") {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await garantirRegistroDaEmpresa(tabela, req.params[parametro], empresaIdDaRequisicao(req));
      return next();
    } catch {
      return res.status(404).json({ message: "Registro não encontrado para esta empresa." });
    }
  };
}
