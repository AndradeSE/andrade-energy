import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ScrollView, Text } from "react-native";
import { AppHeader, Button, Card, Screen } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import { listarMinhasAutoleituras } from "../services/clientes.service";
import { Spacing } from "../theme";

type Leitura = Awaited<ReturnType<typeof listarMinhasAutoleituras>>[number];

const estados: Record<Leitura["estado"], string> = {
  RECEBIDA: "Recebida pela Andrade Energy",
  EM_ENVIO: "Envio à Cemig em andamento",
  ENVIADA: "Enviada à Cemig",
  RECUSADA: "Recusada pela Cemig",
  EM_REVISAO: "Aguardando conferência",
};

export default function HistoricoAutoleituras() {
  const { unidadeSelecionada } = useAuth();
  const id = unidadeSelecionada?.id;
  const [resultado, setResultado] = useState<{ id: string; leituras?: Leitura[] }>();
  const [revisao, setRevisao] = useState(0);

  useFocusEffect(useCallback(() => {
    if (!id) return;
    let ativa = true;
    setResultado(undefined);
    void listarMinhasAutoleituras(id).then(
      leituras => { if (ativa) setResultado({ id, leituras }); },
      () => { if (ativa) setResultado({ id }); },
    );
    return () => { ativa = false; };
  }, [id, revisao]));

  const atual = resultado?.id === id ? resultado : undefined;
  return (
    <Screen>
      <AppHeader variant="subpage" contextTitle="Unidade consumidora" contextSubtitle="Leituras do medidor" title="Histórico de leituras" subtitle={unidadeSelecionada?.numero ? `UC ${unidadeSelecionada.numero}` : "Unidade consumidora"} />
      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}>
        {!id ? <Text>Selecione uma unidade consumidora.</Text>
          : !atual ? <Text>Consultando leituras…</Text>
          : !atual.leituras ? <>
            <Text>Não foi possível consultar o histórico.</Text>
            <Button title="Tentar novamente" onPress={() => setRevisao(valor => valor + 1)} />
          </>
          : !atual.leituras.length ? <Text>Nenhuma leitura registrada para esta UC.</Text>
          : atual.leituras.map(leitura => (
            <Card key={leitura.id}>
              <Text>{leitura.leitura_kwh} kWh · {leitura.data_programada.split("-").reverse().join("/")}</Text>
              <Text>{estados[leitura.estado]}</Text>
              {leitura.protocolo_cemig ? <Text selectable>Protocolo Cemig {leitura.protocolo_cemig}</Text> : null}
            </Card>
          ))}
      </ScrollView>
    </Screen>
  );
}
