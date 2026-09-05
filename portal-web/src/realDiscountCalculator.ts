export type Repasse = "REPASSAR" | "ABSORVER" | string;
export type TarifaHistorica = { referencia?: string | null; tarifa_scee?: number; tarifa_gd2?: number };
export type ProjectionInput = { data?: Record<string, any> | null; discount: number; billingMode?: string | null; type: string; gd1: Repasse; gd2: Repasse; fioB: Repasse; projectedConsumption?: number; projectedInjectedEnergy?: number; sceeReference?: number; gd2Reference?: number };
export type ProjectionResult = { savings: number; discountBase: number; realDiscount: number; availabilityCost: number; wireBCost: number; absorbedAvailability: number; absorbedWireB: number; estimatedWireB: boolean; usesGd2: boolean };

const ESTIMATED_WIRE_B_PERCENT_WITHOUT_HISTORY = 0.13;

export function brazilianNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const text = String(value ?? "").trim(); if (!text) return 0;
  const numeric = text.replace(/[^\d,.-]/g, "");
  const normalized = numeric.includes(",") ? numeric.replace(/\./g, "").replace(",", ".") : numeric.replace(/\.(?=\d{3}(?:\D|$))/g, "");
  const parsed = Number(normalized); return Number.isFinite(parsed) ? parsed : 0;
}

export function numberFrom(data: Record<string, any> | null | undefined, ...keys: string[]) {
  let found = 0;
  for (const key of keys) { const raw = data?.[key]; if (raw === undefined || raw === null || String(raw).trim() === "") continue; const value = brazilianNumber(raw); found = value; if (value !== 0) return value; }
  return found;
}

export function hasGdReading(data: Record<string, any> | null | undefined) {
  return numberFrom(data, "energia_compensada", "energiaCompensada", "energia_compensada_gd1", "energiaCompensadaGD1", "energia_compensada_gd2", "energiaCompensadaGD2", "energia_injetada", "energiaInjetada") > 0;
}

export function projectedConsumptionFrom(data: Record<string, any> | null | undefined) {
  return Math.max(0, numberFrom(data, "consumo_kwh", "consumoKwh", "consumo_faturado", "consumoFaturado", "consumo"));
}

export function sortableMonth(value: unknown) {
  const named = /^(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\/(\d{2}|\d{4})$/.exec(String(value ?? "").trim().toUpperCase());
  if (named) return Number(named[2].length === 2 ? `20${named[2]}` : named[2]) * 100 + ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"].indexOf(named[1]) + 1;
  const text = String(value ?? "").trim(), iso = /^(\d{4})[-/](\d{1,2})/.exec(text); if (iso) return Number(iso[1]) * 100 + Number(iso[2]);
  const br = /^(\d{1,2})[-/](\d{4})/.exec(text); return br ? Number(br[2]) * 100 + Number(br[1]) : 0;
}

export function findMonthlyTariff(data: Record<string, any> | null | undefined, history: TarifaHistorica[]) {
  const valid = history.filter((item) => brazilianNumber(item.tarifa_scee) > 0 && brazilianNumber(item.tarifa_gd2) > 0).sort((a, b) => sortableMonth(b.referencia) - sortableMonth(a.referencia));
  if (!valid.length) return null; const month = sortableMonth(data?.referencia ?? data?.competencia); if (!month) return valid[0];
  return valid.find((item) => sortableMonth(item.referencia) === month) ?? valid.find((item) => sortableMonth(item.referencia) <= month) ?? valid[0];
}

export function calculateProjection({ data, discount, billingMode, type, gd1, gd2, fioB, projectedConsumption = 0, projectedInjectedEnergy = 0, sceeReference = 0, gd2Reference = 0 }: ProjectionInput): ProjectionResult | null {
  if (!data) return null;
  let fullTariff = numberFrom(data, "tarifa_cheia", "tarifaCheia");
  const utilityTotal = numberFrom(data, "valor_cemig", "valorCemig", "valor_concessionaria", "valorConcessionaria", "valor_total", "valorTotal");
  const utilityEnergyValue = numberFrom(data, "valor_energia_concessionaria", "valorEnergiaConcessionaria") || utilityTotal;
  const gd1Energy = numberFrom(data, "energia_compensada_gd1", "energiaCompensadaGD1"), gd2Energy = numberFrom(data, "energia_compensada_gd2", "energiaCompensadaGD2");
  const compensatedEnergy = numberFrom(data, "energia_compensada", "energiaCompensada") || gd1Energy + gd2Energy;
  const injectedEnergy = numberFrom(data, "energia_injetada", "energiaInjetada"), mode = String(billingMode ?? "COMPENSACAO").toUpperCase();
  const hasReading = compensatedEnergy > 0 || injectedEnergy > 0 || projectedInjectedEnergy > 0 || projectedConsumption > 0;
  const baseKwh = projectedConsumption > 0 ? projectedConsumption : mode === "INJECAO" ? injectedEnergy || projectedInjectedEnergy : compensatedEnergy;
  if (fullTariff <= 0) {
    const fullEnergyValue = numberFrom(data, "valor_energia_cheia", "valorEnergiaCheia"), publicLighting = numberFrom(data, "valor_iluminacao_publica", "valorIluminacaoPublica"), tariffFlag = numberFrom(data, "valor_bandeira", "valorBandeira"), extras = numberFrom(data, "encargos_adicionais", "encargosAdicionais");
    const projectedEnergyValue = fullEnergyValue > 0 ? fullEnergyValue : numberFrom(data, "valor_energia_concessionaria", "valorEnergiaConcessionaria") || Math.max(0, utilityTotal - publicLighting - tariffFlag - extras);
    fullTariff = baseKwh > 0 ? projectedEnergyValue / baseKwh : 0;
  }
  if (fullTariff <= 0 || utilityTotal <= 0 || baseKwh <= 0 || !hasReading) return null;
  const franchise = numberFrom(data, "franquia_disponibilidade_kwh", "franquiaDisponibilidadeKwh"), availabilityTariffWithoutTax = numberFrom(data, "tarifa_disponibilidade_sem_impostos", "tarifaDisponibilidadeSemImpostos");
  const availabilityGd1 = numberFrom(data, "custo_disponibilidade_gd1", "custoDisponibilidadeGD1") || franchise * availabilityTariffWithoutTax;
  const availabilityGd2 = numberFrom(data, "custo_disponibilidade_gd2", "custoDisponibilidadeGD2") || numberFrom(data, "custo_disponibilidade", "custoDisponibilidade") || numberFrom(data, "valor_absorvido_disponibilidade", "valorAbsorvidoDisponibilidade") + numberFrom(data, "custo_disponibilidade_repassado", "custoDisponibilidadeRepassado") || Math.max(0, franchise * (fullTariff - availabilityTariffWithoutTax));
  const savedWireB = numberFrom(data, "diferenca_fio_b", "diferencaFioB") || numberFrom(data, "valor_absorvido_fio_b", "valorAbsorvidoFioB") + numberFrom(data, "diferenca_fio_b_repassada", "diferencaFioBRepassada");
  const sceeTariff = numberFrom(data, "tarifa_scee", "tarifaScee") || sceeReference || fullTariff, gd2Tariff = numberFrom(data, "tarifa_gd", "tarifaGD2", "tarifaGD") || gd2Reference;
  const wireBEnergy = gd2Energy > 0 ? gd2Energy : projectedConsumption, usesGd2 = type === "GD2" || type === "MISTA" || gd2Energy > 0;
  const wireBCost = !usesGd2 ? 0 : savedWireB > 0 ? savedWireB : wireBEnergy > 0 && sceeTariff > gd2Tariff && gd2Tariff > 0 ? wireBEnergy * (sceeTariff - gd2Tariff) : usesGd2 && wireBEnergy > 0 && sceeTariff > 0 ? wireBEnergy * sceeTariff * ESTIMATED_WIRE_B_PERCENT_WITHOUT_HISTORY : 0;
  const usesGd1 = type === "GD1" || type === "MISTA" || (!usesGd2 && gd1Energy > 0), availabilityCost = usesGd2 ? availabilityGd2 : availabilityGd1;
  const absorbedAvailability = (usesGd2 ? gd2 === "ABSORVER" : usesGd1 && gd1 === "ABSORVER") ? availabilityCost : 0, absorbedWireB = usesGd2 && fioB === "ABSORVER" ? wireBCost : 0;
  const reference = Math.max(0, baseKwh * fullTariff); if (reference <= 0) return null;
  const andradeValue = Math.max(0, reference * (1 - discount / 100) - absorbedAvailability - absorbedWireB);
  const projectedUtilityEnergy = projectedConsumption > 0 ? availabilityCost + wireBCost : utilityEnergyValue;
  const contractedSaving = reference * discount / 100, savings = Math.min(contractedSaving, Math.max(0, reference - (projectedUtilityEnergy + andradeValue)));
  return { savings, discountBase: reference, realDiscount: Math.min(discount, savings / reference * 100), availabilityCost, wireBCost, absorbedAvailability, absorbedWireB, estimatedWireB: savedWireB <= 0 && gd2Tariff <= 0 && wireBCost > 0, usesGd2 };
}
