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

import * as FinanceiroService from "../../services/financeiro.service";

export default function Financeiro() {

  const [dados, setDados] = useState({
    receitaPrevista: 0,
    receitaRecebida: 0,
    valorEmAberto: 0,
    inadimplentes: 0,
    totalFaturas: 0,
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
      source={require("../../assets/images/background.png")}
      style={{ flex: 1 }}
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
  titulo="Previsto"
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

</View>

<DashboardSection
  titulo="Resumo Financeiro"
  icone="📊"
>

<MetricRow
  titulo="Receita prevista"
  valor={`R$ ${dados.receitaPrevista.toFixed(2).replace(".", ",")}`}
/>

<MetricRow
  titulo="Receita recebida"
  valor={`R$ ${dados.receitaRecebida.toFixed(2).replace(".", ",")}`}
/>

<MetricRow
  titulo="Valor em aberto"
  valor={`R$ ${dados.valorEmAberto.toFixed(2).replace(".", ",")}`}
/>

<MetricRow
  titulo="Inadimplentes"
  valor={dados.inadimplentes}
/>

<MetricRow
  titulo="Total de faturas"
  valor={dados.totalFaturas}
/>

</DashboardSection>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}