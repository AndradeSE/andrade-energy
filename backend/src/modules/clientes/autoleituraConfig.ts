export function configuracaoAutoleitura(input: { zona_localizacao?: unknown; autoleitura_rural_ativa?: unknown }): { zona_localizacao?: "RURAL" | "URBANA"; autoleitura_rural_ativa?: boolean } {
  const { zona_localizacao: zona, autoleitura_rural_ativa: ativa } = input;
  if (zona === undefined && ativa === undefined) return {};
  if ((zona !== "RURAL" && zona !== "URBANA") || typeof ativa !== "boolean" || (ativa && zona !== "RURAL")) {
    throw new Error("Informe a zona da UC. A autoleitura só pode ser habilitada na zona rural.");
  }
  return { zona_localizacao: zona, autoleitura_rural_ativa: ativa };
}
