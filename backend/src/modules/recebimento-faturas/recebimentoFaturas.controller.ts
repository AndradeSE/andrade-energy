import { Request, Response } from "express";

import {
  ativarRecebimentoFaturas,
  desativarRecebimentoFaturas,
  obterConfirmacaoEncaminhamentoGmail,
  obterRecebimentoFaturas,
  obterRecebimentoGeral,
  definirRecebimentoGeral,
  receberWebhookResend,
  regenerarEnderecoRecebimento,
  verificarWebhookResend,
} from "./recebimentoFaturas.service";

export async function obterRecebimentoGeralController(req: Request, res: Response) {
  try { return res.json(await obterRecebimentoGeral(usuarioDaRequisicao(req))); }
  catch (erro: any) { return res.status(400).json({ message: erro?.message ?? "Não foi possível consultar a ativação geral." }); }
}

export async function ativarRecebimentoGeralController(req: Request, res: Response) {
  try { return res.json(await definirRecebimentoGeral(true, usuarioDaRequisicao(req))); }
  catch (erro: any) { return res.status(400).json({ message: erro?.message ?? "Não foi possível ativar o recebimento geral." }); }
}

export async function desativarRecebimentoGeralController(req: Request, res: Response) {
  try { return res.json(await definirRecebimentoGeral(false, usuarioDaRequisicao(req))); }
  catch (erro: any) { return res.status(400).json({ message: erro?.message ?? "Não foi possível desativar o recebimento geral." }); }
}

function usuarioDaRequisicao(req: Request) {
  return (req as any).usuario;
}

export async function obterRecebimentoFaturasController(req: Request, res: Response) {
  try {
    return res.json(await obterRecebimentoFaturas(req.params.unidadeId, usuarioDaRequisicao(req)));
  } catch (erro: any) {
    return res.status(erro?.message?.includes("acesso") ? 403 : 400).json({ message: erro?.message ?? "Não foi possível consultar o recebimento automático." });
  }
}

export async function obterConfirmacaoEncaminhamentoGmailController(req: Request, res: Response) {
  try {
    return res.json(await obterConfirmacaoEncaminhamentoGmail(req.params.unidadeId, usuarioDaRequisicao(req)));
  } catch (erro: any) {
    return res.status(erro?.message?.includes("acesso") ? 403 : 400).json({ message: erro?.message ?? "Não foi possível consultar a confirmação do Gmail." });
  }
}

export async function ativarRecebimentoFaturasController(req: Request, res: Response) {
  try {
    return res.json(await ativarRecebimentoFaturas(req.params.unidadeId, usuarioDaRequisicao(req)));
  } catch (erro: any) {
    return res.status(400).json({ message: erro?.message ?? "Não foi possível ativar o recebimento automático." });
  }
}

export async function regenerarEnderecoRecebimentoController(req: Request, res: Response) {
  try {
    return res.json(await regenerarEnderecoRecebimento(req.params.unidadeId, usuarioDaRequisicao(req)));
  } catch (erro: any) {
    return res.status(400).json({ message: erro?.message ?? "Não foi possível gerar um novo endereço." });
  }
}

export async function desativarRecebimentoFaturasController(req: Request, res: Response) {
  try {
    return res.json(await desativarRecebimentoFaturas(req.params.unidadeId, usuarioDaRequisicao(req)));
  } catch (erro: any) {
    return res.status(400).json({ message: erro?.message ?? "Não foi possível desativar o recebimento automático." });
  }
}

export async function webhookResendRecebimentoFaturasController(req: Request, res: Response) {
  try {
    if (!Buffer.isBuffer(req.body)) return res.status(400).json({ message: "Corpo do webhook inválido." });
    verificarWebhookResend(req.body, req.headers as Record<string, string | string[] | undefined>);
    const evento = JSON.parse(req.body.toString("utf8"));
    const resultado = await receberWebhookResend(evento, req.header("svix-id") ?? undefined);
    return res.status(202).json(resultado);
  } catch (erro: any) {
    return res.status(400).json({ message: erro?.message ?? "Webhook inválido." });
  }
}
