import { supabase } from '../supabase';

export async function carregarDashboard() {

  const [
    clientes,
    usinas,
    cobrancas,
    faturas,
  ] = await Promise.all([

    supabase
      .from('clientes')
      .select('*', { count: 'exact' }),

    supabase
      .from('usinas')
      .select('*', { count: 'exact' }),

    supabase
      .from('cobrancas')
      .select('*'),

    supabase
      .from('faturas')
      .select('*'),

  ]);

  const clientesLista = clientes.data || [];

const usinasLista = usinas.data || [];

const faturasLista = faturas.data || [];

  const receitaPrevista =
    (cobrancas.data || [])
      .reduce(
        (acc, item) =>
          acc +
          Number(item.valor_cobrado || 0),
        0
      );

  const receitaRecebida =
    (cobrancas.data || [])
      .filter(
        c => c.status === 'PAGO'
      )
      .reduce(
        (acc, item) =>
          acc +
          Number(item.valor_cobrado || 0),
        0
      );

  const economiaGerada =
    (faturas.data || [])
      .reduce(
        (acc, item) =>
          acc +
          Number(item.economia || 0),
        0
      );

  const cobrancasPendentes =
    (cobrancas.data || [])
      .filter(
        c => c.status === 'PENDENTE'
      ).length;

      const clientesSemUsina =
  clientesLista.filter(
    c => !c.usina_id
  ).length;

const totalFaturas =
  faturasLista.length;

const energiaDisponivel =
  usinasLista.reduce((total, usina) => {

    const clientesUsina =
      clientesLista.filter(
        c => c.usina_id === usina.id
      );

    const consumo =
      clientesUsina.reduce(
        (soma, cliente) => {

          const consumoCliente =
            faturasLista
              .filter(
                f =>
                  String(f.numero_instalacao).replace(/\D/g,'') ===
                  String(cliente.uc).replace(/\D/g,'')
              )
              .reduce(
                (t,f)=>
                  t + Number(f.consumo_kwh || 0),
                0
              );

          return soma + consumoCliente;

        },
        0
      );

    return (
      total +
      (
        Number(usina.geracao_media || 0) -
        consumo
      )
    );

  },0);

  const ocupacaoMedia =
  usinasLista.length
    ? usinasLista.reduce((acc, usina)=>{

        const clientesUsina =
          clientesLista.filter(
            c => c.usina_id === usina.id
          );

        const consumo =
          clientesUsina.reduce(
            (soma, cliente)=>{

              const consumoCliente =
                faturasLista
                  .filter(
                    f =>
                      String(f.numero_instalacao).replace(/\D/g,'') ===
                      String(cliente.uc).replace(/\D/g,'')
                  )
                  .reduce(
                    (t,f)=>
                      t + Number(f.consumo_kwh || 0),
                    0
                  );

              return soma + consumoCliente;

            },0);

        if(!usina.geracao_media)
          return acc;

        return (
          acc +
          (
            consumo /
            usina.geracao_media
          ) * 100
        );

      },0) / usinasLista.length
    : 0;

  return {

  clientes:
    clientes.count || 0,

  usinas:
    usinas.count || 0,

  receitaPrevista,

  receitaRecebida,

  economiaGerada,

  cobrancasPendentes,

  clientesSemUsina,

  energiaDisponivel,

  ocupacaoMedia,

  totalFaturas,

};

}
export async function receitaMensal() {

  const { data } = await supabase
    .from('cobrancas')
    .select('referencia, valor_cobrado');

  const meses: Record<string, number> = {};

  (data || []).forEach((item) => {

    if (!item.referencia) return;

    meses[item.referencia] =
      (meses[item.referencia] || 0) +
      Number(item.valor_cobrado || 0);

  });

  const labels = Object.keys(meses);

  const valores = labels.map(
    mes => meses[mes]
  );
  

  return {
    labels,
    valores,
  };

}
