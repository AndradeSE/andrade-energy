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
  const valorCemig = Math.max(0, Number(ultima?.valor_cemig_repassado ?? ultima?.valor_cemig ?? 0));
  const energiaCompensada = Math.max(0, Number(ultima?.energia_compensada ?? 0));
  const disponibilidadeRepassada = Math.max(0, Number(ultima?.custo_disponibilidade_repassado ?? 0));
  const disponibilidade = disponibilidadeRepassada || (energiaCompensada <= 0
    ? Math.max(0, Number(ultima?.custo_disponibilidade ?? 0))
    : 0);
  const fioB = Number(ultima?.diferenca_fio_b_repassada ?? 0);
  const disponibilidadeAbsorvida = Math.max(0, Number(ultima?.valor_absorvido_disponibilidade ?? 0));
  const fioBAbsorvido = Math.max(0, Number(ultima?.valor_absorvido_fio_b ?? 0));
  const iluminacao = Number(ultima?.valor_iluminacao_publica ?? 0);
  const bandeira = Number(ultima?.valor_bandeira ?? 0);
  const demaisEncargos = disponibilidade + fioB + iluminacao + bandeira;
  const impostosLidos = Math.max(0, Number(ultima?.valor_impostos ?? 0));
  // Uma leitura fiscal incompleta não pode transformar a conta inteira em
  // imposto. Quando o número lido é incompatível com o total da CEMIG,
  // mantemos essa parcela como energia/encargos identificáveis.
  const impostos = impostosLidos > valorCemig * 0.55
    ? 0
    : Math.min(impostosLidos, Math.max(0, valorCemig - demaisEncargos));
  const energiaEEncargosConcessionaria = Math.max(0, valorCemig - demaisEncargos - impostos);
  const economia = Number(ultima?.economia_real ?? 0);
  const composicaoTarifaria = ultima?.fatura_somente_andrade
    ? [
        { id: "energia-andrade", label: "Cobrado pela Andrade", valor: Number(ultima?.valor_total ?? valorUsina), cor: "#087A55", detalhe: "Valor efetivamente cobrado pela Andrade Energy nesta competência." },
        { id: "disponibilidade-absorvida", label: "Disponibilidade absorvida", valor: disponibilidadeAbsorvida, cor: "#F59E0B", detalhe: "Valor assumido pela Andrade e descontado da cobrança do cliente." },
        { id: "fio-b-absorvido", label: "Fio B absorvido", valor: fioBAbsorvido, cor: "#376BC7", detalhe: "Parcela do Fio B assumida pela Andrade e descontada da cobrança." },
      ]
    : [
        { id: "energia-andrade", label: "Energia da usina", valor: valorUsina, cor: "#087A55", detalhe: `${Number(ultima?.energia_compensada ?? 0).toLocaleString("pt-BR")} kWh considerados nesta competência.` },
        { id: "concessionaria", label: "Energia e encargos da concessionária", valor: energiaEEncargosConcessionaria, cor: "#0EA5B7", detalhe: "Parcela da conta original que não corresponde a disponibilidade, iluminação, bandeira ou tributos destacados." },
        { id: "disponibilidade", label: "Disponibilidade", valor: disponibilidade, cor: "#F59E0B", detalhe: "Custo mínimo de disponibilidade repassado nesta competência." },
        { id: "fio-b", label: "Fio B", valor: fioB, cor: "#376BC7", detalhe: "Parcela do uso da rede repassada na GD II." },
        { id: "iluminacao", label: "Iluminação pública", valor: iluminacao, cor: "#8B5CF6", detalhe: "Contribuição municipal destacada pela concessionária." },
        { id: "bandeira", label: "Bandeira tarifária", valor: bandeira, cor: "#E65A17", detalhe: "Adicional de bandeira identificado na conta da concessionária." },
        { id: "impostos", label: "Impostos", valor: impostos, cor: "#D94B22", detalhe: "Soma de ICMS, PASEP e COFINS destacados na conta." },
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
