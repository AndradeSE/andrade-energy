import { contratoLiberaUnidade } from "./acessoContrato.policy";

export const DIAS_ANTECIPACAO_NOVOS_CONTRATOS = 3;
export function antecipacaoContratada(contratos: any[], hoje: string): number {
  const vigentes = contratos.filter(contrato => contratoLiberaUnidade(contrato, hoje));
  const regras = new Set(vigentes.map(contrato => Number(contrato.configuracao_uc_snapshot?.vencimento_dias_antes_concessionaria ?? contrato.dados_documento?.vencimento_dias_antes_concessionaria ?? 0)));
  if (regras.size > 1) throw new Error("Há contratos vigentes com regras de vencimento diferentes. Revise a UC antes de emitir.");
  const dias = [...regras][0] ?? 0;
  if (dias !== 0 && dias !== 3) throw new Error("Regra de vencimento contratual não reconhecida.");
  return dias;
}

export function vencimentoAndrade(dataConcessionaria: string, dias: number, hoje: string, rascunho = false) {
  const data = new Date(`${dataConcessionaria}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataConcessionaria) || !Number.isFinite(data.getTime()) || data.toISOString().slice(0, 10) !== dataConcessionaria) throw new Error("Vencimento da concessionária inválido.");
  if (dias !== 0 && dias !== 3) throw new Error("Antecipação de vencimento inválida.");
  data.setUTCDate(data.getUTCDate() - dias);
  const vencimento = data.toISOString().slice(0, 10);
  if (dias && !rascunho && vencimento < hoje) throw new Error("O vencimento Andrade, três dias antes da concessionária, já passou. Revise a data com o cliente antes de emitir a cobrança.");
  return vencimento;
}
