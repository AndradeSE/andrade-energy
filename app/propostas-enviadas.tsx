import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { AppHeader, Button, Card, ElasticScrollView as ScrollView, Screen } from "../components/ui";
import { IS_GERADOR_APP } from "../config/appVariant";
import { useAuth } from "../contexts/AuthContext";
import { arquivoDaProposta, limparPropostasVencidas, listarPropostas, type PropostaEnviada } from "../services/propostas-enviadas";
import { Colors, Spacing, Typography } from "../theme";

export default function PropostasEnviadas() {
  const { usuario, usinaSelecionada } = useAuth();
  const usuarioId = String(usuario?.id ?? "");
  const usinaId = String(usinaSelecionada?.id ?? "");
  const escopo = usuarioId && usinaId ? JSON.stringify([usuarioId, usinaId]) : "";
  const [lista, setLista] = useState<{ escopo: string; propostas: PropostaEnviada[] }>();
  const [erro, setErro] = useState("");
  const [abrindo, setAbrindo] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!IS_GERADOR_APP || !usuarioId || !usinaId) return;
    let ativo = true;
    setLista(undefined);
    setErro("");
    void limparPropostasVencidas().catch(() => undefined);
    void listarPropostas(usuarioId, usinaId).then(propostas => {
      if (ativo) setLista({ escopo, propostas });
    }).catch(() => {
      if (ativo) setErro("Não foi possível carregar as propostas.");
    });
    return () => { ativo = false; };
  }, [escopo, usuarioId, usinaId]));

  async function confirmar(item: PropostaEnviada) {
    if (!usuarioId || !usinaId || abrindo || lista?.escopo !== escopo) return;
    setAbrindo(true);
    try {
      const arquivo = await arquivoDaProposta(usuarioId, usinaId, item);
      router.push({
        pathname: "/clientes/novo",
        params: {
          origem: "fatura",
          nome: item.nome,
          endereco: item.endereco,
          ...(arquivo ? { arquivoUri: arquivo.uri, arquivoNome: arquivo.name, arquivoMime: arquivo.mimeType } : {}),
        },
      });
    } catch {
      Alert.alert("Cadastro indisponível", "Não foi possível abrir os dados da proposta.");
    } finally {
      setAbrindo(false);
    }
  }

  if (!IS_GERADOR_APP) return null;
  const propostas = lista?.escopo === escopo ? lista?.propostas : undefined;
  return <Screen>
    <AppHeader variant="subpage" title="Propostas enviadas" subtitle="" contextTitle="" contextSubtitle="" icon="document-text-outline" />
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.detail}>Histórico deste aparelho e desta usina. As propostas ficam disponíveis por 30 dias.</Text>
      {!escopo ? <Text style={styles.detail}>Selecione uma usina para consultar as propostas.</Text> : erro ? <Text accessibilityRole="alert">{erro}</Text> : !propostas ? <Text>Consultando propostas…</Text> : propostas.length === 0 ? <Text>Nenhuma proposta registrada.</Text> : propostas.map(item => (
        <Card key={item.id}>
          <View style={styles.card}>
            <Text style={styles.title}>{item.nome || "Proposta de economia"}</Text>
            {item.uc ? <Text style={styles.detail}>UC {item.uc}</Text> : null}
            <Text style={styles.detail}>{new Date(item.enviadaEm).toLocaleDateString("pt-BR")} · {item.consumo} kWh · desconto oferecido de {item.desconto}%</Text>
            <Text style={styles.detail}>Economia mensal estimada: {item.economia.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</Text>
            <Button title="Confirmar" disabled={abrindo} onPress={() => void confirmar(item)} />
          </View>
        </Card>
      ))}
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.md },
  card: { gap: Spacing.sm },
  title: { fontSize: Typography.card, fontWeight: "800", color: Colors.text },
  detail: { color: Colors.subtitle },
});
