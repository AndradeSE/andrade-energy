import { obterDashboardCliente } from "./dashboard.repository";

export async function dashboardCliente(
  clienteId: string,
  uc: string | undefined,
  empresaId: string
) {
  const dashboard =
    await obterDashboardCliente(clienteId, uc, empresaId);

  const faturas =
    dashboard.faturas ?? [];

  const ultima =
    [...faturas].sort((a, b) =>
      b.referencia.localeCompare(a.referencia)
    )[0];

  const faturasEmAberto = faturas.filter((fatura) =>
    ["EM ABERTO", "ABERTA", "VENCIDA"].includes(String(fatura.status ?? "").toUpperCase())
  );

  return {
    cliente: dashboard.nome,

    uc: uc ?? dashboard.uc,

    distribuidora: dashboard.distribuidora,

    creditos: dashboard.creditos,

    economiaMes: Number(
      ultima?.economia_real ?? 0
    ),

    economiaAcumulada:
      faturas.reduce(
        (t, f) =>
          t + Number(f.economia_real ?? 0),
        0
      ),

    faturasEmAberto: faturasEmAberto.length,

    valorEmAberto: faturasEmAberto.reduce(
      (total, fatura) => total + Number(fatura.valor_total_unificado ?? fatura.valor_total ?? 0),
      0
    ),

    historico:
      [...faturas]
        .sort((a, b) =>
          a.referencia.localeCompare(
            b.referencia
          )
        )
        .slice(-12)
        .map((f) => ({
          competencia: f.referencia,
          economia: Number(
            f.economia_real ?? 0
          ),
        })),

    ultimaFatura: {
      id: ultima?.id,

      competencia:
        ultima?.referencia,

      vencimento:
        ultima?.vencimento,

      valor:
        Number(
          ultima?.valor_total ?? 0
        ),

      energiaInjetada:
        Number(
          ultima?.energia_injetada ?? 0
        ),

      energiaCompensada:
        Number(
          ultima?.energia_compensada ?? 0
        ),
    },
  };
}
