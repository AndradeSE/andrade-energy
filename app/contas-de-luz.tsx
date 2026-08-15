import { Ionicons } from "@expo/vector-icons";
import { File, Paths } from "expo-file-system";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import { Alert, FlatList, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { EmptyState, Loading, Screen } from "../components/ui";
import { useFaturas } from "../hooks/useFaturas";
import { Colors, Radius, Spacing, Typography } from "../theme";

export default function ContasDeLuz() {
  const { data, isLoading, error } = useFaturas();
  const [baixando, setBaixando] = useState<string>();
  const contas = data ?? [];

  async function abrirPdf(item: any) {
    if (!item.pdf_cemig_url) return Alert.alert("PDF em preparação", "A conta da concessionária ainda não está disponível.");
    const referencia = String(item.referencia ?? item.id).replace(/[^a-zA-Z0-9_-]/g, "-");
    const nome = `conta-de-luz-${referencia}.pdf`;
    try {
      setBaixando(item.id);
      if (Platform.OS !== "web") {
        const arquivo = await File.downloadFileAsync(item.pdf_cemig_url, new File(Paths.cache, nome), { idempotent: true });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(arquivo.uri, { dialogTitle: "Salvar conta de luz", mimeType: "application/pdf", UTI: "com.adobe.pdf" });
          return;
        }
      }
      if (!(await Linking.canOpenURL(item.pdf_cemig_url))) throw new Error("URL inválida");
      await Linking.openURL(item.pdf_cemig_url);
    } catch {
      Alert.alert("Não foi possível abrir o PDF", "Confira sua conexão e tente novamente.");
    } finally { setBaixando(undefined); }
  }

  if (isLoading) return <Loading />;
  return <Screen><FlatList
    contentContainerStyle={styles.content}
    data={contas}
    keyExtractor={(item) => item.id}
    ListHeaderComponent={<View><View style={styles.heading}><TouchableOpacity accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={23} color={Colors.text} /></TouchableOpacity><View><Text style={styles.title}>Conta de luz</Text><Text style={styles.subtitle}>Selecione o PDF da concessionária</Text></View></View></View>}
    ListEmptyComponent={<View style={styles.empty}><EmptyState icon={error ? "alert-circle-outline" : "document-outline"} title={error ? "Não foi possível carregar" : "Nenhuma conta de luz"} subtitle={error ? "Confira sua conexão e tente novamente." : "Os PDFs da concessionária aparecerão aqui quando forem disponibilizados."} /></View>}
    renderItem={({ item }) => {
      const disponivel = Boolean(item.pdf_cemig_url); const carregando = baixando === item.id;
      return <TouchableOpacity activeOpacity={0.84} disabled={carregando} onPress={() => abrirPdf(item)} style={[styles.pdfRow, !disponivel && styles.unavailable]}>
        <View style={styles.pdfIcon}><Ionicons name="document-text-outline" size={25} color={Colors.primary} /></View>
        <View style={styles.pdfInfo}><Text style={styles.pdfTitle}>{item.referencia || "Conta de luz"}</Text><Text style={styles.pdfSubtitle}>{disponivel ? "PDF da concessionária" : "PDF em preparação"}</Text></View>
        <Ionicons name={carregando ? "hourglass-outline" : disponivel ? "download-outline" : "time-outline"} size={22} color={disponivel ? Colors.primary : Colors.subtitle} />
      </TouchableOpacity>;
    }}
  /></Screen>;
}

const styles = StyleSheet.create({
  content:{flexGrow:1,padding:Spacing.lg,paddingBottom:Spacing.xxl*2},heading:{flexDirection:"row",alignItems:"center",marginBottom:Spacing.xl,paddingBottom:Spacing.md,borderBottomWidth:1,borderBottomColor:Colors.border},back:{width:38,height:38,alignItems:"center",justifyContent:"center",marginRight:Spacing.xs},title:{color:Colors.text,fontSize:Typography.card,fontWeight:"900"},subtitle:{marginTop:3,color:Colors.subtitle,fontSize:Typography.small},empty:{paddingTop:Spacing.xl},pdfRow:{minHeight:76,flexDirection:"row",alignItems:"center",marginBottom:Spacing.sm,paddingHorizontal:Spacing.md,borderRadius:Radius.lg,backgroundColor:"#DEE0E3"},unavailable:{opacity:.65},pdfIcon:{width:46,height:46,alignItems:"center",justifyContent:"center",borderRadius:Radius.md,backgroundColor:Colors.surface},pdfInfo:{flex:1,marginHorizontal:Spacing.sm},pdfTitle:{color:Colors.text,fontSize:Typography.caption,fontWeight:"900"},pdfSubtitle:{marginTop:4,color:Colors.subtitle,fontSize:Typography.small}
});
