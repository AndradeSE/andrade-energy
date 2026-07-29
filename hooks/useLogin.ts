import { useMutation } from "@tanstack/react-query";
import { login } from "../services/auth.service";

export function useLogin() {
  return useMutation({
    mutationFn: ({
      email,
      senha,
    }: {
      email: string;
      senha: string;
    }) => login(email, senha),
  });
}