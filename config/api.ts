import axios from "axios";

const api = axios.create({
  baseURL: "http://192.168.2.197:3333/api",
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