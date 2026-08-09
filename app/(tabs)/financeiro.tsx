import { useEffect, useState } from "react";
import {
  ImageBackground,
  ScrollView,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DashboardCard from "../../components/DashboardCard";
import DashboardSection from "../../components/DashboardSection";
import MetricRow from "../../components/MetricRow";
import ProgressCard from "../../components/ProgressCard";
import AndradeBarChart from "../../components/charts/AndradeBarChart";
import * as FinanceiroService from "../../services/financeiro.service";

export default function Financeiro() {

const [dados, setDados] = useState({
  receitaPrevista: 0,
  receitaRecebida: 0,
  valorEmAberto: 0,
  inadimplentes: 0,
  ticketMedio: 0,
  percentualRecebido: 0,
  totalFaturas: 0,
  historicoMensal: [] as {
    competencia: string;
    valor: number;
  }[],
});

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const financeiro =
      await FinanceiroService.carregarFinanceiro();

    setDados(financeiro);
  }

  return (
    <ImageBackground
source={require("../assets/images/background.png")}      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            padding: 20,
          }}
        >
        <View
  style={{
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  }}
>
  <DashboardCard
    icone="💰"
    titulo="Receita"
    valor={`R$ ${dados.receitaPrevista.toFixed(2).replace(".", ",")}`}
  />

  <DashboardCard
    icone="✅"
    titulo="Recebido"
    valor={`R$ ${dados.receitaRecebida.toFixed(2).replace(".", ",")}`}
  />

  <DashboardCard
    icone="⚠️"
    titulo="Em aberto"
    valor={`R$ ${dados.valorEmAberto.toFixed(2).replace(".", ",")}`}
  />

  <DashboardCard
    icone="📄"
    titulo="Faturas"
    valor={dados.totalFaturas}
  />

  <DashboardSection
  titulo="Evolução do faturamento"
  icone="📈"
>
  <AndradeBarChart
    title="Receita por competência"
    subtitle="Valores faturados por mês"
    data={dados.historicoMensal.map(item => ({
      label: item.competencia.split("/")[0],
      value: item.valor,
    }))}
  />
</DashboardSection>
</View>


<DashboardSection
  titulo="Indicadores Financeiros"
  icone="📊"
>
  <MetricRow
    titulo="Ticket médio"
    valor={`R$ ${dados.ticketMedio.toFixed(2).replace(".", ",")}`}
  />

  <MetricRow
    titulo="Recebimento"
    valor={`${dados.percentualRecebido.toFixed(1)}%`}
  />

  <MetricRow
    titulo="Inadimplentes"
    valor={dados.inadimplentes}
  />

  <MetricRow
    titulo="Valor em aberto"
    valor={`R$ ${dados.valorEmAberto.toFixed(2).replace(".", ",")}`}
  />
</DashboardSection>
<ProgressCard
  titulo="Percentual recebido"
  percentual={dados.percentualRecebido}
/>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}