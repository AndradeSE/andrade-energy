import { Router } from "express";

import { exigirAutenticacao } from "../../middlewares/auth.middleware";
import {
  ativarRecebimentoFaturasController,
  desativarRecebimentoFaturasController,
  obterRecebimentoFaturasController,
  regenerarEnderecoRecebimentoController,
  webhookResendRecebimentoFaturasController,
} from "./recebimentoFaturas.controller";

const configuracaoRouter = Router();
const webhookRouter = Router();

configuracaoRouter.get("/unidades/:unidadeId", exigirAutenticacao, obterRecebimentoFaturasController);
configuracaoRouter.post("/unidades/:unidadeId/ativar", exigirAutenticacao, ativarRecebimentoFaturasController);
configuracaoRouter.post("/unidades/:unidadeId/regenerar", exigirAutenticacao, regenerarEnderecoRecebimentoController);
configuracaoRouter.post("/unidades/:unidadeId/desativar", exigirAutenticacao, desativarRecebimentoFaturasController);

// Endpoint público configurado no Resend:
// POST /api/webhooks/resend/inbound
webhookRouter.post("/inbound", webhookResendRecebimentoFaturasController);

export { configuracaoRouter, webhookRouter };
