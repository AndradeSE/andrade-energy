import { useEffect, useState } from 'react';
import {
  ImageBackground,
  RefreshControl,
  ScrollView,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AlertCard from '../../components/AlertCard';
import RevenueChart from "../../components/dashboard/RevenueChart";
import DashboardCard from '../../components/DashboardCard';
import DashboardSection from '../../components/DashboardSection';
import DashboardSkeleton from "../../components/DashboardSkeleton";
import MetricRow from '../../components/MetricRow';
import PageHeader from '../../components/PageHeader';
import * as DashboardService from '../../services/dashboard.service';

export default function Dashboard() {
 
  const [refreshing, setRefreshing] = useState(false);

  const [loading, setLoading] =
    useState(true);

  const [dashboard, setDashboard] =
  useState({

    clientes: 0,

    usinas: 0,

    receitaPrevista: 0,

    receitaRecebida: 0,

    economiaGerada: 0,

    cobrancasPendentes: 0,

    clientesSemUsina: 0,

    energiaDisponivel: 0,

    ocupacaoMedia: 0,

    totalFaturas: 0,

    inadimplencia:0,

  });

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {

    try {

      setLoading(true);


      
      const dados =
        await DashboardService.carregarDashboard();

        console.log(dados);

      setDashboard(dados);

     

    } catch (error) {

      console.error(error);

    } finally {

      setLoading(false);

    }

  }

  const onRefresh = async () => {
  setRefreshing(true);

  try {
    await carregar();
  } finally {
    setRefreshing(false);
  }
};

if (loading) {
  return (
    <ImageBackground
      source={require("../../assets/images/background.png")}
      resizeMode="cover"
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <DashboardSkeleton />
      </SafeAreaView>
    </ImageBackground>
  );
}

  return (

    <ImageBackground
  source={require('../../assets/images/background.png')}
  resizeMode="cover"
  style={{
    flex: 1,
  }}
>

      <SafeAreaView
        style={{ flex: 1 }}
      >

        <ScrollView
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={["#16A34A"]}
      tintColor="#16A34A"
    />
  }
>

        <PageHeader
  titulo="Bom dia! 👋"
  subtitulo={`${dashboard.clientes} clientes ativos • ${dashboard.usinas} usinas • R$ ${dashboard.receitaPrevista
    .toFixed(2)
    .replace(".", ",")} previstos para este mês`}
/>

        
         <View
  style={{
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  }}
>

 <DashboardCard
  icone="💰"
  titulo="Receita Prevista"
  valor={`R$ ${dashboard.receitaPrevista.toFixed(2).replace(".", ",")}`}
/>

<DashboardCard
  icone="⚡"
  titulo="Economia"
  valor={`R$ ${dashboard.economiaGerada.toFixed(2).replace(".", ",")}`}
/>

<DashboardCard
  icone="👥"
  titulo="Clientes"
  valor={dashboard.clientes}
/>

 <DashboardCard
  icone="🏭"
  titulo="Ocupação"
  valor={`${dashboard.ocupacaoMedia.toFixed(1)}%`}
/>

 
</View>

<DashboardSection
  titulo="Saúde da Operação"
  icone="⚡"
>

  <MetricRow
    titulo="Energia disponível"
    valor={`${dashboard.energiaDisponivel.toFixed(0)} kWh`}
  />

  <MetricRow
  titulo="Utilização da energia"
  valor={`${dashboard.ocupacaoMedia.toFixed(1)}%`}
/>

  <MetricRow
    titulo="Ocupação média"
    valor={`${(dashboard.ocupacaoMedia ?? 0).toFixed(1)}%`}
  />

  <MetricRow
    titulo="Clientes sem usina"
    valor={dashboard.clientesSemUsina}
  />

  <MetricRow
    titulo="Faturas processadas"
    valor={dashboard.totalFaturas}
  />
  </DashboardSection>

<DashboardSection
  titulo="O que precisa da sua atenção"
  icone="🎯"
>

<AlertCard
  tipo="danger"
  titulo={`${dashboard.cobrancasPendentes} cobranças vencidas`}
/>

<AlertCard
  tipo="warning"
  titulo={`${dashboard.clientesSemUsina} clientes aguardando alocação`}
/>

<AlertCard
  tipo="success"
  titulo={`${dashboard.energiaDisponivel.toFixed(0)} kWh disponíveis para venda`}
/>
</DashboardSection>

  <DashboardSection
  titulo="Financeiro"
  icone="💰"
>

  <DashboardSection
  titulo="Faturamento"
  icone="📈"
>
  <RevenueChart
    previsto={dashboard.receitaPrevista}
    recebido={dashboard.receitaRecebida}
  />
</DashboardSection>

  <MetricRow
    titulo="Receita prevista"
    valor={`R$ ${Number(dashboard.receitaPrevista).toFixed(2).replace('.', ',')}`}
  />

  <MetricRow
    titulo="Receita recebida"
    valor={`R$ ${Number(dashboard.receitaRecebida).toFixed(2).replace('.', ',')}`}
  />

  <MetricRow
  titulo="Valor em aberto"
  valor={`R$ ${(dashboard.receitaPrevista - dashboard.receitaRecebida)
    .toFixed(2)
    .replace(".", ",")}`}
/>

  <MetricRow
    titulo="Cobranças pendentes"
    valor={dashboard.cobrancasPendentes}
  />

  <MetricRow
    titulo="Inadimplência"
    valor={`${Number(dashboard.inadimplencia).toFixed(1)}%`}
  />

</DashboardSection>


        </ScrollView>

      </SafeAreaView>

    </ImageBackground>
    

  );

}
