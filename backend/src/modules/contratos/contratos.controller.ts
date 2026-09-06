import { Request, Response } from "express";

import * as ContratosService from "./contratos.service";
import { obterPropostaParaConvite } from "../convites/propostaConvite.service";
import { supabase } from "../../config/supabase";

export async function propostaDaUnidadeController(req: any, res: any) {
  const { data: unidade, error } = await supabase.from("unidades_consumidoras").select("id,cliente_id").eq("id", req.params.unidadeId).eq("empresa_id", req.usuario.empresa_id).single();
  if (error || !unidade?.cliente_id) return res.status(404).json({ message: "Unidade não encontrada." });
  const proposta = await obterPropostaParaConvite(unidade.cliente_id, req.usuario.empresa_id, unidade.id);
  if (!proposta) return res.status(404).json({ message: "Dados insuficientes para gerar a proposta desta UC." });
  return res.json({ filename: proposta.filename, base64: proposta.content.toString("base64"), resumo: proposta.resumo });
}

export async function dadosIniciaisContratoController(req: any, res: any) {
  try {
    const empresaId = empresaIdDaRequisicao(req);
    const { data: unidade, error } = await supabase
      .from("unidades_consumidoras")
      .select("id,cliente_id,usina_id,desconto_percentual,usinas(id,nome,endereco,titularidade_ucs_recebedoras)")
      .eq("id", req.params.unidadeId)
      .eq("empresa_id", empresaId)
      .single();
    if (error || !unidade?.cliente_id) return res.status(404).json({ message: "Unidade não encontrada." });

    const [{ data: unidadeGeradora, error: erroUnidadeGeradora }, proposta] = await Promise.all([
      supabase.from("unidades_consumidoras")
        .select("titular,cpf_titular,endereco")
        .eq("empresa_id", empresaId)
        .eq("usina_id", unidade.usina_id)
        .eq("tipo", "GERADORA")
        .maybeSingle(),
      obterPropostaParaConvite(unidade.cliente_id, empresaId, unidade.id),
    ]);
    if (erroUnidadeGeradora) throw erroUnidadeGeradora;
    const usina = Array.isArray(unidade.usinas) ? unidade.usinas[0] : unidade.usinas as any;
    return res.json({
      locador: {
        nome: unidadeGeradora?.titular ?? usina?.nome ?? "Titular da usina",
        documento: unidadeGeradora?.cpf_titular ?? "",
        endereco: unidadeGeradora?.endereco ?? usina?.endereco ?? "",
        email: "",
        telefone: "",
      },
      titularidadeUcs: String(usina?.titularidade_ucs_recebedoras ?? "GERADOR").toUpperCase(),
      proposta: proposta?.resumo ?? null,
    });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ message: e.message });
  }
}
import { empresaIdDaRequisicao, garantirRegistroDaEmpresa, incluirEmpresa } from "../../utils/empresaScope";

export async function buscarContratoController(
  req: Request,
  res: Response
) {
  try {

    const contrato =
      await ContratosService.obterContratoCliente(
        req.params.clienteId
      );

    res.json(contrato);

  } catch (e: any) {

    console.error(e);

    res.status(500).json({
      message: e.message,
    });

  }
}

export async function criarContratoController(
  req: Request,
  res: Response
) {
  try {
    if (req.body?.cliente_id) {
      await garantirRegistroDaEmpresa("clientes", req.body.cliente_id, empresaIdDaRequisicao(req));
    }

    const contrato =
      await ContratosService.criarContratoService(
        incluirEmpresa(req.body, empresaIdDaRequisicao(req))
      );

    res.status(201).json(contrato);

  } catch (e: any) {

    console.error(e);

    res.status(500).json({
      message: e.message,
    });

  }
}

export async function buscarContratoDaUnidadeController(
  req: Request,
  res: Response
) {
  try {
    const contrato = await ContratosService.obterContratoDaUnidade(
      req.params.unidadeId
    );
    res.json(contrato);
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ message: e.message });
  }
}

export async function salvarContratoDaUnidadeController(
  req: Request,
  res: Response
) {
  try {
    const contrato = await ContratosService.salvarContratoDaUnidadeService(
      req.params.unidadeId,
      req.body
    );

    res.json(contrato);
  } catch (e: any) {
    console.error(e);
    res.status(400).json({ message: e.message });
  }
}

export async function gerarContratoDaUnidadeController(req: Request, res: Response) {
  try {
    res.json(await ContratosService.gerarContratoDaUnidadeService(req.params.unidadeId, req.body));
  } catch (e: any) {
    console.error(e);
    res.status(400).json({ message: e.message });
  }
}

export async function importarContratoAssinadoDaUnidadeController(req: Request, res: Response) {
  try {
    res.json(await ContratosService.importarContratoAssinadoDaUnidadeService(req.params.unidadeId, req.file));
  } catch (e: any) {
    console.error(e);
    res.status(400).json({ message: e.message });
  }
}

export async function registrarAceiteEletronicoController(req: Request, res: Response) {
  try {
    res.json(await ContratosService.registrarAceiteEletronicoService(req.params.id, (req as any).usuario, req.body, {
      ip: req.ip,
      userAgent: req.get("user-agent") ?? undefined,
    }));
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
}

export async function solicitarCodigoAssinaturaController(req: Request, res: Response) {
  try {
    res.json(await ContratosService.solicitarCodigoAssinaturaService(req.params.id, (req as any).usuario));
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
}

export async function importarContratoAssinadoPeloClienteController(req: Request, res: Response) {
  try {
    res.json(await ContratosService.importarContratoAssinadoPeloClienteService(req.params.id, (req as any).usuario, req.file));
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
}

export async function atualizarContratoController(
  req: Request,
  res: Response
) {
  try {

    const contrato =
      await ContratosService.atualizarContratoService(
        req.params.id,
        req.body
      );

    res.json(contrato);

  } catch (e: any) {

    console.error(e);

    res.status(500).json({
      message: e.message,
    });

  }
}

export async function excluirContratoController(
  req: Request,
  res: Response
) {
  try {

    const retorno =
      await ContratosService.excluirContratoService(
        req.params.id
      );

    res.json(retorno);

  } catch (e: any) {

    console.error(e);

    res.status(500).json({
      message: e.message,
    });

  }
}

export async function cancelarContratoController(req: Request, res: Response) {
  try { res.json(await ContratosService.cancelarContratoService(req.params.id)); }
  catch (e: any) { res.status(500).json({ message: e.message }); }
}
