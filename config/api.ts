import axios from "axios";
import { obterSessao } from "../storage/session";
import { avisarSessaoSubstituida } from "../services/session-events";

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

export const apiBaseURL = normalizarApiUrl(process.env.EXPO_PUBLIC_API_URL);

const api = axios.create({
  baseURL: apiBaseURL,
});

api.interceptors.request.use(async (config) => {
  const sessao = await obterSessao();
  if (sessao?.token) config.headers.Authorization = `Bearer ${sessao.token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const mensagem = String(error?.response?.data?.message ?? "");
    if (error?.response?.status === 401 && /sessão inválida|sessao invalida|expirada|desativada/i.test(mensagem)) {
      avisarSessaoSubstituida();
    }
    return Promise.reject(error);
  }
);

export default api;
