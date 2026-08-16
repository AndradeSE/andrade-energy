import axios from "axios";
import Constants from "expo-constants";
import { obterSessao } from "../storage/session";

const expoHost = Constants.expoConfig?.hostUri?.split(":")[0];
const apiBaseURL =
  process.env.EXPO_PUBLIC_API_URL ??
  (__DEV__ && expoHost ? `http://${expoHost}:3333/api` : "https://andrade-energy-api-vda.onrender.com/api");

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
