import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";

import { errorHandler } from "./middlewares/errorHandler";

import authRoutes from "./modules/auth/auth.routes";
import clientesRoutes from "./modules/clientes/clientes.routes";
import contratosRoutes from "./modules/contratos/contratos.routes";
import creditosRoutes from "./modules/creditos/creditos.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import faturasRoutes from "./modules/faturas/faturas.routes";
import fechamentosRoutes from "./modules/fechamentos/fechamentos.routes";
import rateioRoutes from "./modules/rateio/rateio.routes";
import usinasRoutes from "./modules/usinas/usinas.routes";
import { processarFilaDeNotificacoes } from "./modules/faturas/notificacoesFatura.service";
import convitesRoutes from "./modules/convites/convites.routes";
import { processarContasDeEnergiaRecebidas } from "./modules/email/email.service";
import { configuracaoRouter as recebimentoFaturasRoutes, webhookRouter as recebimentoFaturasWebhookRoutes } from "./modules/recebimento-faturas/recebimentoFaturas.routes";
import { processarFilaDeRecebimentosFaturas } from "./modules/recebimento-faturas/recebimentoFaturas.service";
import { conexoesEmailRouter, oauthEmailRouter } from "./modules/conexoes-email/conexoesEmail.routes";
import { supabase } from "./config/supabase";
import usuariosRoutes from "./modules/usuarios/usuarios.routes";
import { asaasRouter, asaasWebhookRouter } from "./modules/asaas/asaas.routes";
import carteiraRoutes from "./modules/carteira/carteira.routes";
import comercialRoutes from "./modules/comercial/comercial.routes";
import empresasRoutes from "./modules/empresas/empresas.routes";

dotenv.config();

const app = express();
app.set("trust proxy", 1);

const origensPermitidas = new Set([
  "https://www.andradeenergy.com.br",
  "https://andradeenergy.com.br",
  ...String(process.env.CORS_ALLOWED_ORIGINS ?? "").split(",").map((item) => item.trim()).filter(Boolean),
]);

/*
|--------------------------------------------------------------------------
| Middlewares
|--------------------------------------------------------------------------
*/

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || origensPermitidas.has(origin) || (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) && process.env.NODE_ENV !== "production")) return callback(null, true);
    return callback(new Error("Origem não autorizada."));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type", "Idempotency-Key", "asaas-access-token", "svix-id", "svix-signature", "svix-timestamp"],
}));

// O Resend assina o corpo original. Esta rota precisa permanecer antes do
// express.json(), caso contrário a verificação da assinatura falha.
app.use(
  "/api/webhooks/resend",
  express.raw({ type: "application/json", limit: "1mb" }),
  recebimentoFaturasWebhookRoutes,
);

app.use(express.json({ limit: "1mb" }));

const apiLimiter = rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: "draft-8", legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false });
const convitesLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 60, standardHeaders: "draft-8", legacyHeaders: false });
const financeiroLimiter = rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: "draft-8", legacyHeaders: false });

// O Asaas envia JSON e autentica o webhook pelo cabeçalho
// `asaas-access-token`. A rota é pública, mas o token é obrigatório.
app.use("/api/webhooks/asaas", asaasWebhookRouter);

// Os limitadores precisam ser registrados antes das rotas protegidas.
app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter);
app.use("/api/convites", convitesLimiter);
app.use("/api/asaas", financeiroLimiter);
app.use("/api/carteira", financeiroLimiter);

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use((req, _, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

/*
|--------------------------------------------------------------------------
| Rotas
|--------------------------------------------------------------------------
*/

app.use("/api/auth", authRoutes);
app.use("/api/convites", convitesRoutes);
app.use("/api/usuarios", usuariosRoutes);

app.use("/api/dashboard", dashboardRoutes);

app.use("/api/clientes", clientesRoutes);

app.use("/api/contratos", contratosRoutes);

app.use("/api/faturas", faturasRoutes);

app.use("/api/asaas", asaasRouter);
app.use("/api/carteira", carteiraRoutes);
app.use("/api/comercial", comercialRoutes);
app.use("/api/empresas", empresasRoutes);

app.use("/api/usinas", usinasRoutes);

app.use("/api/fechamentos", fechamentosRoutes);

app.use("/api/creditos", creditosRoutes);

app.use("/api/rateio", rateioRoutes);

app.use("/api/recebimento-faturas", recebimentoFaturasRoutes);

app.use("/api/conexoes-email", conexoesEmailRouter);

// O callback OAuth é público, mas é protegido por state de uso único + PKCE.
app.use("/api/oauth", oauthEmailRouter);

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get("/health", (_, res) => {
  res.json({
    status: "online",
    commit: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? "local",
  });
});

/*
|--------------------------------------------------------------------------
| Error Handler
|--------------------------------------------------------------------------
*/

app.use(errorHandler);

/*
|--------------------------------------------------------------------------
| Start
|--------------------------------------------------------------------------
*/

const PORT = Number(process.env.PORT) || 3333;

async function validarSchemaAntesDeIniciar() {
  const verificacoes = [
    { tabela: "unidades_consumidoras", colunas: "consumo_medio_kwh,percentual_rateio" },
    { tabela: "contratos", colunas: "dados_documento,contrato_gerado_url,contrato_assinado_url" },
    { tabela: "assinaturas_geradores", colunas: "gerador_id,plano_id,ciclo,status,proximo_vencimento" },
    { tabela: "empresas", colunas: "slug,nome,empresa_proprietaria,identidade_personalizada" },
    { tabela: "usuarios", colunas: "empresa_id" },
    { tabela: "solicitacoes_cadastro_clientes", colunas: "cliente_id,status,email_verificado_em" },
    { tabela: "faturas_anexadas_clientes", colunas: "cliente_id,caminho_pdf,dados_fatura" },
  ];

  for (const verificacao of verificacoes) {
    const { error } = await supabase.from(verificacao.tabela).select(verificacao.colunas).limit(1);
    if (error) {
      throw new Error(
        `Schema do Supabase incompatível: aplique as migrações pendentes antes do deploy (${verificacao.tabela}: ${error.message}).`,
      );
    }
  }
}

async function iniciarServidor() {
  await validarSchemaAntesDeIniciar();
  app.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
  processarFilaDeNotificacoes().catch((erro) => console.error("Falha ao processar notificações:", erro.message));
  processarContasDeEnergiaRecebidas().catch((erro) => console.error("Falha ao importar produção por e-mail:", erro.message));
  processarFilaDeRecebimentosFaturas().catch((erro) => console.error("Falha ao processar faturas recebidas por e-mail:", erro.message));
  setInterval(() => {
    processarFilaDeNotificacoes().catch((erro) => console.error("Falha ao processar notificações:", erro.message));
  }, 60_000);
  setInterval(() => {
    processarContasDeEnergiaRecebidas().catch((erro) => console.error("Falha ao importar produção por e-mail:", erro.message));
  }, 5 * 60_000);
  setInterval(() => {
    processarFilaDeRecebimentosFaturas().catch((erro) => console.error("Falha ao processar faturas recebidas por e-mail:", erro.message));
  }, 60_000);
  });
}

iniciarServidor().catch((erro: any) => {
  console.error("Servidor não iniciado:", erro?.message ?? erro);
  process.exit(1);
});
