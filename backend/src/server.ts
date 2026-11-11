import { automaticRecoveryEnabled, createNeonFailoverMonitor } from "./config/neonFailoverMonitor";
import { sourceSupabase } from "./config/supabase";
import {renderReserveEnvironment} from './config/contingencyExecutor';
import cors from "cors";
import { startNeonProductionSnapshots } from "./config/neonSnapshotRuntime";
import { initializeNeonRecovery, neonRecoveryGuard } from "./config/neonRecoveryRuntime";
import { recoveryActive, recoveryStatus } from "./config/neonRecoveryState";
import { prepareRecoveryEvents, publishRecoveryTransition } from "./config/neonRecoveryEvents";
import { exigirAutenticacao } from "./middlewares/auth.middleware";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import { apiRateLimit } from "./config/distributedRateLimit";

import { errorHandler } from "./middlewares/errorHandler";

import authRoutes from "./modules/auth/auth.routes";
import { consultaSessaoAutenticada } from "./modules/auth/authRateLimit.policy";
import clientesRoutes from "./modules/clientes/clientes.routes";
import contratosRoutes from "./modules/contratos/contratos.routes";
import { avisarContratosProximosDoVencimento } from "./modules/contratos/vencimentoContrato.service";
import { avisarFaturasProximasDoVencimento } from "./modules/faturas/lembreteVencimento.service";
import {processarRateiosAutomaticos} from "./modules/usinas/rateioAutomatico.service";
import creditosRoutes from "./modules/creditos/creditos.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import faturasRoutes from "./modules/faturas/faturas.routes";
import fechamentosRoutes from "./modules/fechamentos/fechamentos.routes";
import rateioRoutes from "./modules/rateio/rateio.routes";
import usinasRoutes from "./modules/usinas/usinas.routes";
import { processarFilaDeNotificacoes } from "./modules/faturas/notificacoesFatura.service";
import { processarConvitesAdesoes } from "./modules/comercial/adesaoAssinatura.service";
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
import { mercadoPagoWebhookRouter } from "./modules/comercial/mercadoPagoWebhook.routes";
import colaboradoresRoutes from "./modules/colaboradores/colaboradores.routes";
import notificacoesRoutes from "./modules/notificacoes/notificacoes.routes";
import privacidadeRoutes from "./modules/privacidade/privacidade.routes";
import { auditar } from "./utils/audit";
import { backgroundJobsEnabled } from "./config/backgroundJobs";
import { trackRequestTask } from "./config/requestTasks";
import { assistenteVoiceRouter } from "./modules/assistente/voice.routes";
import uploadsRoutes from "./modules/uploads/uploads.routes";
import cotasRoutes from "./modules/cotas/cotas.routes";
import { monitorServiceQuotas } from "./modules/cotas/cotas.service";
import { processarPushPendente } from "./modules/notificacoes/push.service";
import { enfileirarLembretesAutoleitura, executeScheduledJob, scheduledJobs } from "./config/scheduledJobs";
import type { ScheduledJob } from "./config/durableScheduledJob";
import { contingencyRequestGuard } from "./config/contingencyRequestGuard";
import { contingencyExecutor } from './config/contingencyExecutor';
import { createRenderReserveIngress } from './config/renderReserveIngress';
import { renderReserveReady } from './config/renderReserveReadiness';
import { observeRenderForContingency,lastRenderReserveObservation } from './config/contingencyAutomatic';
import { observePrimaryReturn, primaryEnvironment, primaryReadyForReturn } from './config/contingencyReturn';
import contingencyRoutes from "./config/contingency.routes";

dotenv.config();
const executorIdentity = contingencyExecutor(process.env);

export const app = express();
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
  allowedHeaders: ["Authorization", "Content-Type", "Idempotency-Key", "asaas-access-token", "x-request-id", "x-signature", "svix-id", "svix-signature", "svix-timestamp"],
}));

app.use(neonRecoveryGuard);
const renderIngress = createRenderReserveIngress(supabase);
app.use((req, res, next) => recoveryActive() ? next() : renderIngress(req, res, next));
app.use((req, res, next) => recoveryActive() ? next() : contingencyRequestGuard(req, res, next));
app.get("/api/reserva-dados/status", apiRateLimit("data-reserve-status", { windowMs: 60_000, limit: 60 }), exigirAutenticacao, (_req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  res.json(recoveryStatus());
});

// O Resend assina o corpo original. Esta rota precisa permanecer antes do
// express.json(), caso contrário a verificação da assinatura falha.
app.use(
  "/api/webhooks/resend",
  express.raw({ type: "application/json", limit: "1mb" }),
  recebimentoFaturasWebhookRoutes,
);

app.use(express.json({ limit: "1mb" }));

const apiLimiter = apiRateLimit("api", { windowMs: 60_000, limit: 300, standardHeaders: "draft-8", legacyHeaders: false });
const authLimiter = apiRateLimit("auth-public", { windowMs: 15 * 60_000, limit: 30, skip: consultaSessaoAutenticada, standardHeaders: "draft-8", legacyHeaders: false });
const authSessionLimiter = apiRateLimit("auth-session", { windowMs: 60_000, limit: 60, skip: req => !consultaSessaoAutenticada(req), standardHeaders: "draft-8", legacyHeaders: false });
const convitesLimiter = apiRateLimit("invites", { windowMs: 15 * 60_000, limit: 60, standardHeaders: "draft-8", legacyHeaders: false });
const financeiroLimiter = apiRateLimit("finance", { windowMs: 60_000, limit: 60, standardHeaders: "draft-8", legacyHeaders: false });

// O Asaas envia JSON e autentica o webhook pelo cabeçalho
// `asaas-access-token`. A rota é pública, mas o token é obrigatório.
app.use("/api/webhooks/asaas", asaasWebhookRouter);
app.use("/api/webhooks/mercado-pago", mercadoPagoWebhookRouter);

// Os limitadores precisam ser registrados antes das rotas protegidas.
app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter);
app.use("/api/auth", authSessionLimiter);
app.use("/api/convites", convitesLimiter);
app.use("/api/asaas", financeiroLimiter);
app.use("/api/carteira", financeiroLimiter);

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use((req, _, next) => {
  // Nunca registrar query strings nem identificadores de rota: convites,
  // recuperação de senha e OAuth podem conter credenciais nesses locais.
  const namespace = req.path.split("/").filter(Boolean).slice(0, 2).join("/");
  console.log(`${req.method} /${namespace}`);
  next();
});

// Registra centralmente todas as operações autenticadas de colaboradores.
// O listener é instalado antes das rotas e consulta req.usuario ao final,
// depois que exigirAutenticacao identificou a pessoa e a empresa ativa.
app.use((req, res, next) => {
  const inicio = Date.now();
  res.on("finish", () => {
    const usuario = (req as any).usuario;
    const papel = String(usuario?.papel_empresa ?? "").toUpperCase();
    const rota = req.originalUrl.split("?")[0];
    if (!papel.startsWith("COLABORADOR_") || rota === "/api/colaboradores/auditoria") return;
    const partes = rota.replace(/^\/api\//, "").split("/").filter(Boolean);
    const recursoId = partes.find((parte) => /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(parte)) ?? null;
    trackRequestTask(auditar({
      empresaId: String(usuario.empresa_id),
      usuarioId: String(usuario.id),
      acao: `COLABORADOR_${req.method}`,
      recurso: partes[0] ?? "api",
      recursoId,
      detalhes: { rota, status: res.statusCode, papel, duracao_ms: Date.now() - inicio },
    }));
  });
  next();
});

/*
|--------------------------------------------------------------------------
| Rotas
|--------------------------------------------------------------------------
*/

app.use("/api/auth", authRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/cotas-servicos", cotasRoutes);
app.use("/api/contingencia", contingencyRoutes);
app.use("/api/convites", convitesRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/colaboradores", colaboradoresRoutes);
app.use("/api/notificacoes", notificacoesRoutes);
app.use("/api/privacidade", privacidadeRoutes);
app.use("/api/assistente", assistenteVoiceRouter);

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

app.get("/health", async (_, res) => {
  if (recoveryActive()) return res.setHeader("Cache-Control", "no-store").json({ status: "read-only", environment: "production", database: "NEON" });
  let reserveReady=false;
  let primaryReady=false;
  const primaryEnv=primaryEnvironment(process.env);
  if(primaryEnv) {
    try {
      const {data,error}=await supabase.from('contingencia_controle')
        .select('render_reserva_commit_validado,render_reserva_validado_em').eq('id',true).single();
      primaryReady=!error && primaryReadyForReturn(process.env,data);
    } catch { primaryReady=false; }
  }
  if(executorIdentity==='RENDER_RESERVA') {
    try {
      const {data,error}=await supabase.from('contingencia_controle')
        .select('render_reserva_commit_validado,render_reserva_validado_em').eq('id',true).single();
      reserveReady=!error && renderReserveReady(process.env,data);
    } catch { return res.status(503).json({status:'unavailable'}); }
  }
  res.setHeader('Cache-Control','no-store');
  res.json({
    status: "online",
    commit: (process.env.RENDER_GIT_COMMIT ?? process.env.COMMIT_REF)?.slice(0, 7) ?? "local",
    ...(primaryEnv ? {environment:primaryEnv,releaseCommit:process.env.RENDER_GIT_COMMIT,
      contingency:{executor:'RENDER',readyForReturn:primaryReady}} : {}),
    ...(executorIdentity === 'RENDER_RESERVA' ? {
      environment: renderReserveEnvironment(process.env),
      contingency: { executor: executorIdentity, readyForFailover: reserveReady, writes: reserveReady,
        monitor:lastRenderReserveObservation(),
        backgroundJobs: process.env.BACKGROUND_JOBS_ENABLED==='true' && process.env.DURABLE_SCHEDULER_ENABLED==='true' },
    } : {}),
    ...(process.env.API_RUNTIME === "serverless" ? {
      contingency: { environment: "preview", readyForFailover: false, writes: false,
        activationPolicy: "confirmed_render_quota_only",
        authenticationValidation: process.env.NETLIFY_AUTH_VALIDATION_ENABLED === "true", backgroundJobs: false },
    } : {}),
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

export async function validarSchemaAntesDeIniciar() {
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
  await initializeNeonRecovery(process.env);
  const executarAgendadores = backgroundJobsEnabled();
  let primaryWorkStarted = false;

  function startPrimaryWork() {
    if (primaryWorkStarted || recoveryActive()) return;
    primaryWorkStarted = true;
    startNeonProductionSnapshots(process.env);
    if(primaryEnvironment(process.env)) {
      let returning=false;
      const checkReturn=async()=>{
        if(returning) return;
        returning=true;
        try { await observePrimaryReturn(process.env,supabase); }
        catch { console.error('Retorno automático ao principal exige conferência.'); }
        finally { returning=false; }
      };
      void checkReturn();
      setInterval(()=>void checkReturn(),60_000).unref();
    }
    if(executorIdentity==='RENDER_RESERVA') {
      let observing=false;
      const observe=async()=>{
        if(observing) return;
        observing=true;
        try { await observeRenderForContingency(process.env,supabase); }
        catch { console.error('Não foi possível confirmar o estado do Render principal.'); }
        finally { observing=false; }
      };
      void observe();
      setInterval(()=>void observe(),60_000).unref();
    }
    if (!executarAgendadores) {
      console.log("Instância HTTP reserva: agendadores desativados.");
      return;
    }
    if (process.env.DURABLE_SCHEDULER_ENABLED === "true") {
      const tick = () => {
        for (const name of Object.keys(scheduledJobs) as ScheduledJob[]) {
          void executeScheduledJob(name, executorIdentity).catch(() => console.error("Tarefa agendada exige conferência", { tarefa: name }));
        }
      };
      tick();
      setInterval(tick, 60_000);
      return;
    }
    const conferirCotas = () => void monitorServiceQuotas().catch(() => console.error("Falha ao verificar cotas de serviços."));
    conferirCotas();
    setInterval(conferirCotas, 60 * 60_000);
    let enviandoPushDuravel = false;
    const conferirPushDuravel = async () => {
      if (enviandoPushDuravel) return;
      enviandoPushDuravel = true;
      try {
        for (let i = 0; i < 10; i++) {
          if (!(await processarPushPendente()).processed) break;
        }
      } catch { console.error("Falha ao conferir fila persistente de push."); }
      finally { enviandoPushDuravel = false; }
    };
    void conferirPushDuravel();
    setInterval(() => void conferirPushDuravel(), 60_000);
    processarFilaDeNotificacoes().catch((erro) => console.error("Falha ao processar notificações:", erro.message));
    const avisarVencimentos = () => void avisarContratosProximosDoVencimento().catch(erro => console.error("Falha ao avisar vencimentos:", erro.message));
    avisarVencimentos();
    setInterval(avisarVencimentos, 60 * 60_000);
    const avisarFaturas = () => void avisarFaturasProximasDoVencimento().catch(erro => console.error("Falha ao avisar vencimento das faturas:", erro.message));
    avisarFaturas();
    const avisarAutoleituras = () => void enfileirarLembretesAutoleitura().catch(() => console.error("Falha ao enfileirar lembretes de autoleitura."));
    avisarAutoleituras();
    setInterval(avisarAutoleituras, 60 * 60_000);
    setInterval(avisarFaturas, 60 * 60_000);
    const conferirRateios=()=>void processarRateiosAutomaticos().catch(error=>console.error("Falha ao conferir rateios automáticos",{tipo:error?.code??error?.name??"Error"}));
    conferirRateios();
    setInterval(conferirRateios,60_000);
    processarConvitesAdesoes().catch(() => console.error("Falha ao processar convites de assinaturas."));
    processarContasDeEnergiaRecebidas().catch((erro) => console.error("Falha ao importar produção por e-mail:", erro.message));
    processarFilaDeRecebimentosFaturas().catch((erro) => console.error("Falha ao processar faturas recebidas por e-mail:", erro.message));
    setInterval(() => {
      processarFilaDeNotificacoes().catch((erro) => console.error("Falha ao processar notificações:", erro.message));
      processarConvitesAdesoes().catch(() => console.error("Falha ao processar convites de assinaturas."));
    }, 60_000);
    setInterval(() => {
      processarContasDeEnergiaRecebidas().catch((erro) => console.error("Falha ao importar produção por e-mail:", erro.message));
    }, 5 * 60_000);
    setInterval(() => {
      processarFilaDeRecebimentosFaturas().catch((erro) => console.error("Falha ao processar faturas recebidas por e-mail:", erro.message));
    }, 60_000);
  }

  const automaticRecovery = automaticRecoveryEnabled(process.env);
  const checkDatabase = automaticRecovery ? createNeonFailoverMonitor({
    async probePrimary() {
      const result = await sourceSupabase.from("usuarios").select("id").limit(1)
        .abortSignal(AbortSignal.timeout(5000));
      if (!result.error) return true;
      return result.status === 0 || [502, 503, 504].includes(result.status) ? false : null;
    },
    activate: () => initializeNeonRecovery({ ...process.env, NEON_RECOVERY_READ_ONLY: "true" }, true),
    async onTransition(provider) {
      if (provider === "SUPABASE") {
        await validarSchemaAntesDeIniciar();
        startPrimaryWork();
      }
      await publishRecoveryTransition(process.env, provider);
    },
  }) : null;
  try {
    await validarSchemaAntesDeIniciar();
  } catch (error) {
    if (!checkDatabase) throw error;
    await checkDatabase();
    await checkDatabase();
    if (!recoveryActive()) throw error;
  }
  if (checkDatabase) {
    setInterval(() => void checkDatabase().catch(() => {
      console.warn("Monitor do banco reserva: conferência não concluída.");
    }), 30_000).unref();
  }
  app.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
  if (process.env.NEON_API_ENABLED === "true") {
    void prepareRecoveryEvents(process.env).then(() => publishRecoveryTransition(process.env, recoveryActive() ? "NEON" : "SUPABASE"))
      .catch(() => console.warn("Histórico de recuperação aguarda sincronização."));
  }
  if (recoveryActive()) {
    console.log("Banco reserva em consulta: tarefas, ingressos e operações automáticas desativados.");
    return;
  }
  startPrimaryWork();
  });
}

// Functions import the Express app but must never open a port or run timers.
if (require.main === module && process.env.API_RUNTIME !== "serverless") {
  iniciarServidor().catch((erro: any) => {
    console.error("Servidor não iniciado:", erro?.message ?? erro);
    process.exit(1);
  });
}