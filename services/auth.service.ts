import api from "../config/api";
export async function login(
  email: string,
  senha: string
) {
  const { data } = await api.post(
    "/auth/login",
    {
      email,
      senha,
    }
  );

  return data;
}

export async function me() {
  const { data } = await api.get(
    "/auth/me"
  );

  return data;
}