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

  const valorUsina = Number(ultima?.valor_usina ?? ultima?.valor_andrade ?? 0);
  const disponibilidade = Number(ultima?.custo_disponibilidade_repassado ?? 0);
  const fioB = Number(ultima?.diferenca_fio_b_repassada ?? 0);
  const valorCemig = Number(ultima?.valor_cemig_repassado ?? ultima?.valor_cemig ?? 0);
  const demaisConcessionaria = Math.max(0, valorCemig - disponibilidade - fioB);
  const economia = Number(ultima?.economia_real ?? 0);
  const composicaoTarifaria = ultima?.fatura_somente_andrade
    ? [
        { id: "energia-andrade", label: "Energia Andrade", valor: valorUsina, cor: "#087A55", detalhe: "Valor da energia solar faturada pela Andrade Energy." },
        { id: "economia", label: "Economia concedida", valor: economia, cor: "#F5B800", detalhe: "Parcela economizada em relação ao valor cheio da energia." },
      ]
    : [
        { id: "energia-andrade", label: "Energia Andrade", valor: valorUsina, cor: "#087A55", detalhe: "Energia solar faturada pela Andrade Energy." },
        { id: "concessionaria", label: "Concessionária", valor: demaisConcessionaria, cor: "#0C9ABE", detalhe: "Demais valores líquidos mantidos na conta da concessionária." },
        { id: "disponibilidade", label: "Disponibilidade", valor: disponibilidade, cor: "#F59E0B", detalhe: "Custo mínimo de disponibilidade repassado nesta competência." },
        { id: "fio-b", label: "Fio B", valor: fioB, cor: "#376BC7", detalhe: "Parcela do uso da rede repassada na GD II." },
      ];

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

      composicaoTarifaria: composicaoTarifaria.filter((item) => item.valor > 0),
    },
  };
}
