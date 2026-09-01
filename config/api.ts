import axios from "axios";
import { obterSessao } from "../storage/session";
import { avisarSessaoSubstituida } from "../services/session-events";

const apiBaseURL =
  process.env.EXPO_PUBLIC_API_URL ??
  "https://andrade-energy-api-vda.onrender.com/api";

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
