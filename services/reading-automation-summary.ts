type ReadingUnit = { id?: string; usina_id?: string; numero?: string; apelido?: string; zona_localizacao?: string; tipo?: string; status?: string; autoleitura_rural_ativa?: boolean };
export function summarizeReadingAutomation(value: unknown, usinaId: string, geral: boolean | undefined) {
  const units: ReadingUnit[] = Array.isArray(value) ? value : [];
  const itens = units.filter(u => u.usina_id === usinaId && u.zona_localizacao === "RURAL" && u.tipo !== "GERADORA").map(u => {
    const habilitada = u.autoleitura_rural_ativa === true && u.status === "ATIVA";
    const ativa = habilitada && geral !== false;
    const motivo = u.autoleitura_rural_ativa !== true ? "Desativada nesta UC" : u.status !== "ATIVA" ? "UC não está ativa" : geral === false ? "Controle geral desativado" : geral === undefined ? "Habilitada; envio geral não confirmado" : "Envio automático habilitado";
    return { id: String(u.id), numero: String(u.numero ?? "Não informado"), apelido: String(u.apelido ?? ""), ativa, motivo };
  });
  return { itens, ativadas: itens.filter(u => u.ativa).length, desativadas: itens.filter(u => !u.ativa).length };
}
