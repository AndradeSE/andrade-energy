import { API } from "../config/api";

export async function login(email: string, senha: string) {
  const response = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      senha,
    }),
  });

  if (!response.ok) {
    const erro = await response.json();
    throw new Error(erro.message);
  }

  return response.json();
}