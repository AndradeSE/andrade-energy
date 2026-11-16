import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AppHeader, Button, Card, Loading, Screen } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import { listarMinhasAutoleituras } from "../services/clientes.service";
import { formatarDataBrasileira } from "../services/faturas.service";
import { Colors, Spacing } from "../theme";

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
  const params = useLocalSearchParams<{ id?: string; numero?: string }>();
  const id = typeof params.id === "string" && params.id ? params.id : unidadeSelecionada?.id;
  const numero = id === unidadeSelecionada?.id ? unidadeSelecionada?.numero : params.numero;
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
  const vazio = !id || !atual?.leituras?.length;
  if (id && !atual) return <Screen><Loading /></Screen>;
  return (
    <Screen>
      <AppHeader variant="subpage" contextTitle="Unidade consumidora" contextSubtitle="Leituras do medidor" title="Histórico de leituras" subtitle={numero ? `UC ${numero}` : "Unidade consumidora"} />
      <ScrollView contentContainerStyle={styles.content}>
        {vazio ? (
          <Card>
            <View style={styles.empty}>
              <Ionicons name="time-outline" size={32} color={Colors.primary} />
              <Text style={styles.title}>{!id ? "Selecione uma unidade" : atual?.leituras ? "Nenhuma leitura registrada" : "Histórico indisponível"}</Text>
              <Text style={styles.caption}>{!id ? "Escolha uma UC para consultar suas leituras." : atual?.leituras ? "As leituras enviadas por esta UC e seus protocolos aparecerão aqui." : "Não foi possível consultar as leituras desta UC."}</Text>
              {id && !atual?.leituras ? <Button title="Tentar novamente" onPress={() => setRevisao(valor => valor + 1)} /> : null}
            </View>
          </Card>
        ) : atual?.leituras?.map(leitura => (
            <Card key={leitura.id}>
              <View style={styles.record}>
                <Text style={styles.title}>{leitura.leitura_kwh.toLocaleString("pt-BR")} kWh</Text>
                <Text style={styles.caption}>Data programada · {formatarDataBrasileira(leitura.data_programada)}</Text>
                <Text style={styles.state}>{estados[leitura.estado] ?? leitura.estado}</Text>
                {leitura.protocolo_cemig ? <View style={styles.protocol}>
                  <Text style={styles.caption}>Protocolo Cemig</Text>
                  <Text selectable style={styles.state}>{leitura.protocolo_cemig}</Text>
                </View> : null}
              </View>
            </Card>
          ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.md },
  empty: { alignItems: "center", paddingVertical: Spacing.md, gap: Spacing.sm },
  record: { gap: Spacing.sm },
  title: { color: Colors.primaryDark, fontSize: 18, fontWeight: "800" },
  caption: { color: Colors.subtitle, fontSize: 13 },
  state: { color: Colors.primaryDark, fontSize: 14, fontWeight: "700" },
  protocol: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.primaryLight, paddingTop: Spacing.sm, gap: 4 },
});
