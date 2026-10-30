import { Request, Response } from "express";

import {
  concluirConexaoEmail,
  excluirConexaoEmail,
  iniciarConexaoEmail,
  obterConexoesEmail,
  processarCallbackOAuth,
} from "./conexoesEmail.service";

function usuarioDaRequisicao(req: Request) {
  return (req as any).usuario;
}

function statusDoErro(erro: any) {
  const mensagem = String(erro?.message ?? "").toLowerCase();
  if (mensagem.includes("não tem acesso") || mensagem.includes("não pertence")) return 403;
  if (mensagem.includes("não encontrada") || mensagem.includes("não encontrado")) return 404;
  return 400;
}

export async function obterConexoesEmailController(req: Request, res: Response) {
  try {
    return res.json(await obterConexoesEmail(req.params.unidadeId, usuarioDaRequisicao(req)));
  } catch (erro: any) {
    return res.status(statusDoErro(erro)).json({ message: erro?.message ?? "Não foi possível consultar as conexões de e-mail." });
  }
}

export async function iniciarConexaoEmailController(req: Request, res: Response) {
  try {
    return res.json(await iniciarConexaoEmail(req.params.unidadeId, usuarioDaRequisicao(req), req.body ?? {}));
  } catch (erro: any) {
    return res.status(statusDoErro(erro)).json({ message: erro?.message ?? "Não foi possível iniciar a conexão de e-mail." });
  }
}

export async function concluirConexaoEmailController(req: Request, res: Response) {
  try {
    return res.json(await concluirConexaoEmail(usuarioDaRequisicao(req), req.body?.state));
  } catch (erro: any) {
    return res.status(statusDoErro(erro)).json({ message: erro?.message ?? "Não foi possível concluir a conexão de e-mail." });
  }
}

export async function excluirConexaoEmailController(req: Request, res: Response) {
  try {
    return res.json(await excluirConexaoEmail(req.params.id, usuarioDaRequisicao(req)));
  } catch (erro: any) {
    return res.status(statusDoErro(erro)).json({ message: erro?.message ?? "Não foi possível remover a conexão de e-mail." });
  }
}

function paginaDeRetorno(status: number, titulo: string, mensagem: string) {
  const cor = status < 400 ? "#176b3a" : "#a42b2b";
  return `<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title><body style="margin:0;display:grid;min-height:100vh;place-items:center;background:#f5f7f5;font-family:Arial,sans-serif;color:#1f2937"><main style="max-width:420px;padding:32px;text-align:center"><h1 style="color:${cor}">${titulo}</h1><p>${mensagem}</p><p style="color:#64748b;font-size:14px">Você já pode voltar ao aplicativo Andrade Energy.</p></main></body></html>`;
}

/**
 * Callback público dos provedores OAuth. Ele só recebe um código de uso único,
 * troca-o no servidor e retorna ao deep link do aplicativo sem nenhum token.
 */
export async function callbackEmailOAuthController(req: Request, res: Response) {
  try {
    const resultado = await processarCallbackOAuth({
      provedor: req.params.provedor ?? req.query.provedor,
      state: req.query.state,
      code: req.query.code,
      error: req.query.error,
    });
    return res.redirect(302, resultado.redirecionamento);
  } catch (erro: any) {
    return res
      .status(400)
      .type("html")
      .send(paginaDeRetorno(400, "Não foi possível conectar", "A autorização expirou, foi recusada ou não pertence a esta solicitação."));
  }
}
