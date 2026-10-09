import { Router } from "express";

import { exigirAutenticacao } from "../../middlewares/auth.middleware";
import {
  callbackEmailOAuthController,
  concluirConexaoEmailController,
  excluirConexaoEmailController,
  iniciarConexaoEmailController,
  obterConexoesEmailController,
} from "./conexoesEmail.controller";

const conexoesEmailRouter = Router();
const oauthEmailRouter = Router();
oauthEmailRouter.get("/email/retorno-web", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'");
  // O portal confirma o estado por sua sessão autenticada. Esta página não
  // considera parâmetros da URL prova de conexão e nunca recebe tokens.
  return res.type("html").send('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Retorno ao portal — Andrade Energy</title><body style="font-family:system-ui;background:#f5f7f5;color:#172033;padding:32px"><main style="max-width:500px;margin:10vh auto"><h1>Volte ao portal Andrade Energy</h1><p>A etapa de autorização foi encerrada. O portal verificará se a conexão e o recebimento automático foram concluídos.</p><p>Você pode fechar esta aba.</p></main></body></html>');
});

conexoesEmailRouter.get("/unidades/:unidadeId", exigirAutenticacao, obterConexoesEmailController);
conexoesEmailRouter.post("/unidades/:unidadeId/iniciar", exigirAutenticacao, iniciarConexaoEmailController);
conexoesEmailRouter.post("/concluir", exigirAutenticacao, concluirConexaoEmailController);
conexoesEmailRouter.delete("/:id", exigirAutenticacao, excluirConexaoEmailController);

// O provedor é parte do caminho para permitir o mesmo callback em Google e Microsoft.
oauthEmailRouter.get("/email/callback/:provedor", callbackEmailOAuthController);
// Variante útil para configurações antigas que usem ?provedor=GMAIL|OUTLOOK.
oauthEmailRouter.get("/email/callback", callbackEmailOAuthController);

export { conexoesEmailRouter, oauthEmailRouter };
