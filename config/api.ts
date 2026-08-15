import axios from "axios";
import Constants from "expo-constants";

const expoHost = Constants.expoConfig?.hostUri?.split(":")[0];
const apiBaseURL =
  process.env.EXPO_PUBLIC_API_URL ??
  (expoHost ? `http://${expoHost}:3333/api` : "http://192.168.0.141:3333/api");

const api = axios.create({
  baseURL: apiBaseURL,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
