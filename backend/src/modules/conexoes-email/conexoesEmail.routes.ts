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

conexoesEmailRouter.get("/unidades/:unidadeId", exigirAutenticacao, obterConexoesEmailController);
conexoesEmailRouter.post("/unidades/:unidadeId/iniciar", exigirAutenticacao, iniciarConexaoEmailController);
conexoesEmailRouter.post("/concluir", exigirAutenticacao, concluirConexaoEmailController);
conexoesEmailRouter.delete("/:id", exigirAutenticacao, excluirConexaoEmailController);

// O provedor é parte do caminho para permitir o mesmo callback em Google e Microsoft.
oauthEmailRouter.get("/email/callback/:provedor", callbackEmailOAuthController);
// Variante útil para configurações antigas que usem ?provedor=GMAIL|OUTLOOK.
oauthEmailRouter.get("/email/callback", callbackEmailOAuthController);

export { conexoesEmailRouter, oauthEmailRouter };
