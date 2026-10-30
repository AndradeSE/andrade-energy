import { Router } from "express";

import { exigirAutenticacao, exigirGestor } from "../../middlewares/auth.middleware";
import {
  ativarRecebimentoFaturasController,
  desativarRecebimentoFaturasController,
  obterConfirmacaoEncaminhamentoGmailController,
  obterRecebimentoFaturasController,
  obterRecebimentoGeralController,
  ativarRecebimentoGeralController,
  desativarRecebimentoGeralController,
  regenerarEnderecoRecebimentoController,
  webhookResendRecebimentoFaturasController,
} from "./recebimentoFaturas.controller";

const configuracaoRouter = Router();
const webhookRouter = Router();

configuracaoRouter.get("/geral", exigirAutenticacao, exigirGestor, obterRecebimentoGeralController);
configuracaoRouter.post("/geral/ativar", exigirAutenticacao, exigirGestor, ativarRecebimentoGeralController);
configuracaoRouter.post("/geral/desativar", exigirAutenticacao, exigirGestor, desativarRecebimentoGeralController);

configuracaoRouter.get("/unidades/:unidadeId", exigirAutenticacao, obterRecebimentoFaturasController);
configuracaoRouter.get("/unidades/:unidadeId/confirmacao-gmail", exigirAutenticacao, obterConfirmacaoEncaminhamentoGmailController);
configuracaoRouter.post("/unidades/:unidadeId/ativar", exigirAutenticacao, ativarRecebimentoFaturasController);
configuracaoRouter.post("/unidades/:unidadeId/regenerar", exigirAutenticacao, regenerarEnderecoRecebimentoController);
configuracaoRouter.post("/unidades/:unidadeId/desativar", exigirAutenticacao, desativarRecebimentoFaturasController);

// Endpoint público configurado no Resend:
// POST /api/webhooks/resend/inbound
webhookRouter.post("/inbound", webhookResendRecebimentoFaturasController);

export { configuracaoRouter, webhookRouter };
