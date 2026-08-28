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

export function exigirClienteDaSessaoOuGestor(parametro = "clienteId", origem: "params" | "query" = "params") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const usuario: any = (req as any).usuario;
    const perfil = String(usuario?.perfil ?? "").toUpperCase();
    const bruto = origem === "query" ? req.query[parametro] : req.params[parametro];
    const clienteId = String(Array.isArray(bruto) ? bruto[0] : bruto ?? "");
    if (!clienteId) return res.status(400).json({ message: "Cliente não informado." });
    const empresaId = empresaIdDaRequisicao(req);
    const { data, error } = await supabase.from("clientes").select("id,cpf").eq("id", clienteId).eq("empresa_id", empresaId).maybeSingle();
    if (error || !data) return res.status(404).json({ message: "Cliente não encontrado para esta empresa." });
    if (["ADMIN", "GESTOR"].includes(perfil)) return next();
    const somenteDigitos = (valor: unknown) => String(valor ?? "").replace(/\D/g, "");
    const mesmoVinculo = String(usuario?.cliente_id ?? "") === clienteId;
    const cpfUsuario = somenteDigitos(usuario?.cpf);
    const cpfCliente = somenteDigitos(data.cpf);
    const mesmoCpf = cpfUsuario.length >= 9 && cpfCliente.length >= 9 && cpfUsuario.slice(0, 9) === cpfCliente.slice(0, 9);
    if (!mesmoVinculo && !mesmoCpf) return res.status(403).json({ message: "Você não tem acesso a este cliente." });
    return next();
  };
}
