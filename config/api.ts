import axios from "axios";
import { obterSessao } from "../storage/session";

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
    return Promise.reject(error);
  }
);

export default api;
