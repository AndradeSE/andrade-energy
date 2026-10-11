import { contratoLiberaUnidade } from "./acessoContrato.policy";

export function diasParaVencimento(contrato: any, hoje: string): number | null {
  if (!contratoLiberaUnidade(contrato, hoje) || !contrato.vigencia_fim
    || (contrato.configuracao_uc_snapshot?.plano_contrato ?? contrato.dados_documento?.plano_contrato) === "SEM_FIDELIDADE") return null;
  const fim = String(contrato.vigencia_fim).slice(0, 10);
  const dias = (Date.parse(`${fim}T12:00:00Z`) - Date.parse(`${hoje}T12:00:00Z`)) / 86400000;
  return Number.isInteger(dias) && dias >= 0 && dias <= 30 ? dias : null;
}
