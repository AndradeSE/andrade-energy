import { Request, Response } from "express";

import {
  importarFatura,
  analisarFatura,
  detalharFatura,
  excluirFatura,
  regenerarDocumentosFatura,
  confirmarFaturaRascunho,
  listarFaturas,
  obterRelatorioCalculoFatura,
} from "./faturas.service";
import { processarFatura } from "./processarFatura.service";
import { empresaIdDaRequisicao } from "../../utils/empresaScope";

export async function criarFaturaManualController(req: Request, res: Response) {
  try {
    const entrada = req.body ?? {};
    const obrigatorios = ["cliente", "uc", "referencia", "vencimento", "consumo", "valorTotal", "tarifaCheia"];
    if (obrigatorios.some((campo) => entrada[campo] === undefined || entrada[campo] === "")) {
      return res.status(400).json({ message: "Preencha UC, competência, vencimento, consumo, tarifa e valor da concessionária." });
    }
    const dados = {
      cliente: String(entrada.cliente), endereco: "", uc: String(entrada.uc).replace(/\D/g, ""), distribuidora: String(entrada.distribuidora || "CEMIG"),
      referencia: String(entrada.referencia), vencimento: String(entrada.vencimento), consumo: Number(entrada.consumo), energiaInjetada: Number(entrada.energiaInjetada || 0),
      energiaCompensada: Number(entrada.energiaCompensada || 0), energiaCompensadaGD1: Number(entrada.energiaCompensadaGD1 || 0), energiaCompensadaGD2: Number(entrada.energiaCompensadaGD2 || 0),
      saldoAnterior: Number(entrada.saldoAnterior || 0), saldoAtual: Number(entrada.saldoAtual || 0), valorTotal: Number(entrada.valorTotal), economia: 0,
      tarifaCheia: Number(entrada.tarifaCheia), tarifaGD: Number(entrada.tarifaGD || 0), custoDisponibilidade: Number(entrada.custoDisponibilidade || 0), bandeira: "", historico: [], debitos: [],
      valorIluminacaoPublica: Number(entrada.valorIluminacaoPublica || 0), valorBandeira: Number(entrada.valorBandeira || 0), encargosAdicionais: Number(entrada.encargosAdicionais || 0),
    };
    return res.status(201).json(await processarFatura(dados));
  } catch (err: any) { return res.status(400).json({ message: err.message }); }
}

export async function excluirFaturaController(req: Request, res: Response) {
  try { return res.json(await excluirFatura(req.params.id, empresaIdDaRequisicao(req))); }
  catch (err: any) { return res.status(500).json({ message: err.message }); }
}

export async function confirmarFaturaRascunhoController(req: Request, res: Response) {
  try { return res.json(await confirmarFaturaRascunho(req.params.id, empresaIdDaRequisicao(req))); }
  catch (err: any) { return res.status(400).json({ message: err.message }); }
}

export async function regenerarDocumentosFaturaController(req: Request, res: Response) {
  try { return res.json(await regenerarDocumentosFatura(req.params.id, empresaIdDaRequisicao(req))); }
  catch (err: any) { return res.status(err.message === "Fatura não encontrada." ? 404 : 500).json({ message: err.message }); }
}

export async function obterRelatorioCalculoFaturaController(req: Request, res: Response) {
  try { return res.json(await obterRelatorioCalculoFatura(req.params.id, empresaIdDaRequisicao(req))); }
  catch (err: any) { return res.status(err.message === "Fatura não encontrada." ? 404 : 500).json({ message: err.message }); }
}

export async function analisarFaturaController(req: Request, res: Response) {
  try {
    return res.json(await analisarFatura(req));
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
}

export async function detalharFaturaController(req: Request, res: Response) {
  try {
    return res.json(await detalharFatura(req.params.id, empresaIdDaRequisicao(req)));
  } catch (err: any) {
    const naoEncontrada = err.message === "Fatura não encontrada.";
    return res.status(naoEncontrada ? 404 : 500).json({ message: err.message });
  }
}

export async function listarFaturasController(
  req: Request,
  res: Response
) {
  try {
    const { clienteId, uc } = req.query;

    const data = await listarFaturas({
      clienteId: clienteId as string | undefined,
      uc: uc as string | undefined,
      empresaId: empresaIdDaRequisicao(req),
    });

    return res.json(data);
  } catch (err: any) {
    console.error(err);

    return res.status(500).json({
      message: err.message,
    });
  }
}

export async function importarFaturaController(
  req: Request,
  res: Response
) {
  try {
    const resultado =
      await importarFatura(req);

    return res.json(resultado);

  } catch (err: any) {
    console.error(err);

    return res.status(500).json({
      message: err.message,
    });
  }
}
