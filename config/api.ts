import axios from "axios";
import { obterSessao } from "../storage/session";
import { avisarContaExcluida, avisarSessaoSubstituida } from "../services/session-events";
import { environmentApiUrl, isPreviewEnvironment } from "./environment";
import {createContingencyResolver,readContingencyControl} from "./contingency-policy";

const API_PRODUCAO = "https://andrade-energy-api-vda.onrender.com/api";

function normalizarApiUrl(valor?: string) {
  const informada = String(valor ?? "").trim();
  if (!informada) return API_PRODUCAO;

  // Builds antigos receberam do ambiente EAS o host desativado e sem `/api`.
  // Normalizamos ambos para que uma variável remota obsoleta não quebre login
  // nem as demais rotas do aplicativo já instalado.
  const hostAtual = informada
    .replace(/\/+$/, "")
    .replace(
      "https://andrade-energy-api.onrender.com",
      "https://andrade-energy-api-vda.onrender.com",
    );

  return /\/api$/i.test(hostAtual) ? hostAtual : `${hostAtual}/api`;
}

export const apiBaseURL = normalizarApiUrl(environmentApiUrl);
export const contingencyRoutingEnabled=process.env.EXPO_PUBLIC_CONTINGENCY_ENABLED==="1";
const contingencyEnvironment=isPreviewEnvironment?"preview":"production";
const resolveApiTarget=createContingencyResolver(contingencyEnvironment,()=>readContingencyControl(contingencyEnvironment));

const api = axios.create({
  baseURL: apiBaseURL,
  timeout: 20_000,
});

api.interceptors.request.use(async (config) => {
  if(contingencyRoutingEnabled) config.baseURL=await resolveApiTarget();
  const sessao = await obterSessao();
  if (sessao?.token) config.headers.Authorization = `Bearer ${sessao.token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const mensagem = String(error?.response?.data?.message ?? "");
    const codigo = String(error?.response?.data?.code ?? "");
    // The old owner explicitly rejected this request. Refresh routing for the
    // next user action; never replay an operation whose result may be uncertain.
    if (codigo === "EXECUTOR_INATIVO") resolveApiTarget.invalidate();
    if (error?.response?.status === 401 && codigo === "CONTA_EXCLUIDA") {
      avisarContaExcluida();
    } else if (error?.response?.status === 401 && /sessão inválida|sessao invalida|expirada|desativada/i.test(mensagem)) {
      avisarSessaoSubstituida();
    }
    return Promise.reject(error);
  }
);

export default api;
