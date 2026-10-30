type Medicao = { tipo?: string; energiaKwh?: number };

export function producaoMedidaDaFatura(dados: {
  medicoes?: Medicao[];
  producaoMensal?: number;
  producao_mensal?: number;
  energiaInjetada?: number;
}) {
  const injecoes = Array.isArray(dados.medicoes)
    ? dados.medicoes.filter((medicao) => medicao.tipo === "INJECAO")
    : [];
  if (injecoes.length) {
    return injecoes.reduce((total, medicao) => total + Math.max(0, Number(medicao.energiaKwh ?? 0)), 0);
  }
  const producaoMensal = Number(dados.producaoMensal ?? dados.producao_mensal ?? 0);
  if (Number.isFinite(producaoMensal) && producaoMensal > 0) return producaoMensal;
  const energiaInjetada = Number(dados.energiaInjetada ?? 0);
  return Number.isFinite(energiaInjetada) ? Math.max(0, energiaInjetada) : 0;
}
