import { useMutation } from "@tanstack/react-query";
import { login } from "../services/auth.service";
import { IS_GERADOR_APP } from "../config/appVariant";

export function useLogin() {
  return useMutation({
    mutationFn: ({
      email,
      senha,
    }: {
      email: string;
      senha: string;
    }) => login(email, senha, IS_GERADOR_APP ? "GERADOR" : "CONSUMIDOR"),
  });
}
