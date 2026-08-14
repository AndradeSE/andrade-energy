import axios from "axios";
import Constants from "expo-constants";

const expoHost = Constants.expoConfig?.hostUri?.split(":")[0];
const apiBaseURL =
  process.env.EXPO_PUBLIC_API_URL ??
  (expoHost ? `http://${expoHost}:3333/api` : "http://192.168.0.141:3333/api");

const api = axios.create({
  baseURL: apiBaseURL,
});

api.interceptors.request.use((config) => {
  console.log("================================");
  console.log("REQUEST");
  console.log((config.method ?? "").toUpperCase());
  console.log((config.baseURL ?? "") + (config.url ?? ""));
  console.log("================================");
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log("================================");
    console.log("ERRO AXIOS");
    console.log("STATUS:", error.response?.status);
    console.log("URL:", error.config?.baseURL + error.config?.url);
    console.log("DADOS:", error.response?.data);
    console.log("================================");

    return Promise.reject(error);
  }
);

export default api;
