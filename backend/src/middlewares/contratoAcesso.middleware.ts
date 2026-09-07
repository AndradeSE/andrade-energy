import { Request, Response, NextFunction } from "express";
import { listarAcessoContratos } from "../modules/contratos/acessoContrato.service";
import { supabase } from "../config/supabase";

export async function exigirContratoDaUc(req: Request, res: Response, next: NextFunction) {
  const usuario = (req as any).usuario;
  if (usuario?.perfil !== "LEITURA") return next();
  try {
    const acessos = await listarAcessoContratos(usuario);
    let unidadeId = String(req.params.unidadeId ?? "");
    if (req.params.id && req.baseUrl.endsWith("/faturas")) {
      const { data, error } = await supabase.from("faturas").select("unidade_consumidora_id,numero_instalacao")
        .eq("id", req.params.id).eq("empresa_id", usuario.empresa_id).eq("cliente_id", usuario.cliente_id).maybeSingle();
      if (error || !data) return res.status(404).json({ message: "Fatura não encontrada." });
      unidadeId = data.unidade_consumidora_id || acessos.find(u => String(u.numero) === String(data.numero_instalacao))?.id || "";
      if (!unidadeId) return res.status(403).json({ code: "CONTRATO_PENDENTE", message: "A fatura não possui uma unidade vinculada com acesso autorizado." });
    }
    const numero = String(req.query.uc ?? "");
    if (!unidadeId && !numero && !(req.params.id && req.baseUrl.endsWith("/faturas"))) {
      const liberadas = acessos.filter(u => u.liberado);
      if (!liberadas.length) return res.status(403).json({ code: "CONTRATO_PENDENTE", message: "Conclua a assinatura do contrato para acessar sua unidade." });
      // Listagens agregadas são filtradas pelo controlador; o dashboard usa
      // uma UC liberada como padrão, sem agregar dados de unidades pendentes.
      res.locals.unidadesComContrato = liberadas;
      return next();
    }
    const solicitadas = unidadeId ? acessos.filter(u => u.id === unidadeId) : numero ? acessos.filter(u => String(u.numero) === numero) : acessos;
    if (!solicitadas.length || solicitadas.some(u => !u.liberado)) return res.status(403).json({ code: "CONTRATO_PENDENTE", message: "Conclua a assinatura do contrato desta unidade para acessar a operação." });
    res.locals.unidadesComContrato = solicitadas;
    return next();
  } catch { return res.status(503).json({ message: "Não foi possível verificar o contrato. Tente novamente." }); }
}
