import { Request, Response } from "express";

import * as ContratosService from "./contratos.service";
import { obterPropostaParaConvite } from "../convites/propostaConvite.service";
import { supabase } from "../../config/supabase";

export async function propostaDaUnidadeController(req: any, res: any) {
  const { data: unidade, error } = await supabase.from("unidades_consumidoras").select("id,cliente_id").eq("id", req.params.unidadeId).eq("empresa_id", req.usuario.empresa_id).single();
  if (error || !unidade?.cliente_id) return res.status(404).json({ message: "Unidade não encontrada." });
  const proposta = await obterPropostaParaConvite(unidade.cliente_id, req.usuario.empresa_id, unidade.id);
  if (!proposta) return res.status(404).json({ message: "Dados insuficientes para gerar a proposta desta UC." });
  return res.json({ filename: proposta.filename, base64: proposta.content.toString("base64") });
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
    res.json(await ContratosService.registrarAceiteEletronicoService(req.params.id, (req as any).usuario, {
      ip: req.ip,
      userAgent: req.get("user-agent") ?? undefined,
    }));
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
