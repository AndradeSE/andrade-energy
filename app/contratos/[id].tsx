import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";

import { AppHeader, Badge, Button, Card, ElasticScrollView as ScrollView, Loading, Screen, Section } from "../../components/ui";
import { concluirSolicitacaoCancelamento, obterSolicitacaoCancelamento } from "../../services/contratos.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";

export default function SolicitacaoCancelamentoContrato() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [dados, setDados] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [observacao, setObservacao] = useState("");

  const carregar = useCallback(async () => {
    try { setDados(await obterSolicitacaoCancelamento(id)); }
    catch (erro: any) { Alert.alert("Cancelamento", erro?.response?.data?.message ?? "Não foi possível carregar a solicitação."); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { void carregar(); }, [carregar]);

  function decidir(decisao: "CANCELAR" | "RECUSAR") {
    const cancelar = decisao === "CANCELAR";
    Alert.alert(cancelar ? "Cancelar contrato" : "Recusar solicitação", cancelar ? "O contrato será encerrado e poderá ser gerada uma fatura final de créditos. Deseja continuar?" : "O contrato permanecerá ativo. Deseja recusar esta solicitação?", [
      { text: "Voltar", style: "cancel" },
      { text: cancelar ? "Confirmar cancelamento" : "Recusar", style: cancelar ? "destructive" : "default", onPress: async () => {
        setProcessando(true);
        try {
          await concluirSolicitacaoCancelamento(id, decisao, observacao);
          Alert.alert("Solicitação concluída", cancelar ? "O contrato foi cancelado." : "A solicitação foi recusada e o contrato permanece ativo.", [{ text: "OK", onPress: () => router.replace("/contratos" as any) }]);
        } catch (erro: any) { Alert.alert("Não foi possível concluir", erro?.response?.data?.message ?? erro?.message); }
        finally { setProcessando(false); }
      } },
    ]);
  }

  if (loading) return <Loading />;
  const contrato = dados?.contrato ?? {};
  const solicitacao = dados?.solicitacao;
  const cliente = Array.isArray(contrato.clientes) ? contrato.clientes[0] : contrato.clientes;
  const unidade = Array.isArray(contrato.unidades_consumidoras) ? contrato.unidades_consumidoras[0] : contrato.unidades_consumidoras;
  const pendente = solicitacao?.status === "PENDENTE";

  return <Screen><AppHeader variant="subpage" title="Cancelamento de contrato" subtitle="Análise da solicitação" contextTitle={cliente?.nome ?? "Cliente"} contextSubtitle={unidade?.numero ? `UC ${unidade.numero}` : `Contrato ${contrato.numero ?? id}`} icon="document-text-outline" />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Section title="Solicitação"><Card>
        <View style={styles.row}><Text style={styles.label}>Situação</Text><Badge label={solicitacao?.status ?? "SEM SOLICITAÇÃO"} variant={pendente ? "warning" : "success"} /></View>
        <Info label="Cliente" value={cliente?.nome ?? "Não informado"} />
        <Info label="Contrato" value={String(contrato.numero ?? contrato.id ?? id)} />
        <Info label="Unidade" value={unidade?.numero ? `UC ${unidade.numero}` : "Não informada"} />
        <Info label="Solicitado em" value={solicitacao?.solicitado_em ? new Date(solicitacao.solicitado_em).toLocaleString("pt-BR") : "Não informado"} />
        {solicitacao?.analisado_em ? <Info label="Analisado em" value={new Date(solicitacao.analisado_em).toLocaleString("pt-BR")} /> : null}
        {solicitacao?.observacao ? <Info label="Observação da análise" value={solicitacao.observacao} /> : null}
      </Card></Section>
      {pendente ? <Section title="Decisão"><Card>
        <Text style={styles.help}>Registre uma observação para manter o histórico da análise. Ao confirmar o cancelamento, o contrato será encerrado antes que o cliente possa ser excluído.</Text>
        <TextInput multiline value={observacao} onChangeText={setObservacao} placeholder="Observação da análise (opcional)" style={styles.input} />
        <Button disabled={processando} title={processando ? "Processando..." : "Confirmar cancelamento"} onPress={() => decidir("CANCELAR")} style={styles.cancelButton} />
        <Button disabled={processando} title="Recusar solicitação" onPress={() => decidir("RECUSAR")} />
      </Card></Section> : <Card><Text style={styles.help}>Esta solicitação já foi analisada. Nenhuma ação adicional é necessária.</Text></Card>}
    </ScrollView>
  </Screen>;
}

function Info({ label, value }: { label: string; value: string }) { return <View style={styles.info}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>; }

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 2 }, row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.md }, info: { paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border }, label: { color: Colors.subtitle, fontSize: Typography.small, fontWeight: "700" }, value: { marginTop: 4, color: Colors.text, fontSize: Typography.body, fontWeight: "800" }, help: { color: Colors.subtitle, lineHeight: 21 }, input: { minHeight: 100, marginVertical: Spacing.md, padding: Spacing.md, textAlignVertical: "top", borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.background, color: Colors.text }, cancelButton: { marginBottom: Spacing.sm, backgroundColor: Colors.danger },
});
