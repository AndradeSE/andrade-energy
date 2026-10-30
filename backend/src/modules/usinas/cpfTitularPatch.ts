export function cpfTitularPatch(input: Record<string, unknown> | null | undefined): { cpf_titular?: string | null } {
  if (!input || (!Object.hasOwn(input, "cpf_titular") && !Object.hasOwn(input, "cpfTitular"))) return {};
  const value = Object.hasOwn(input, "cpf_titular") ? input.cpf_titular : input.cpfTitular;
  return { cpf_titular: String(value ?? "").replace(/\D/g, "") || null };
}
