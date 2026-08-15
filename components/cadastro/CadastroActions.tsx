import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { analisarFatura } from "../../services/faturas.service";
import { Colors, Spacing } from "../../theme";
import { Button } from "../ui";

type TipoCadastro = "CLIENTE" | "USINA" | "UNIDADE";

const rotas = {
  CLIENTE: "/clientes/novo",
  USINA: "/usinas/nova",
  UNIDADE: "/unidades/nova",
} as const;

export default function CadastroActions({ tipo }: { tipo: TipoCadastro }) {
  const [analisando, setAnalisando] = useState(false);

  function abrirManual() {
    router.push(rotas[tipo] as any);
  }

  async function importar() {
    const arquivo = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (arquivo.canceled) return;

    try {
      setAnalisando(true);
      const item = arquivo.assets[0];
      const analise = await analisarFatura(item.uri, item.name);
      const dados = analise?.dados ?? {};

      if (tipo === "USINA" && analise.classificacao !== "POSSIVEL_GERADORA") {
        Alert.alert(
          "Usina não identificada",
          "Esta conta não apresenta energia injetada. Você ainda pode completar o cadastro manualmente."
        );
      }

      router.push({
        pathname: rotas[tipo] as any,
        params: {
          origem: "fatura",
          classificacao: String(analise?.classificacao ?? ""),
          cliente: String(dados.cliente ?? ""),
          uc: String(dados.uc ?? ""),
          endereco: String(dados.endereco ?? ""),
          energiaCompensada: String(dados.energiaCompensada ?? 0),
        },
      });
    } catch (erro: any) {
      const detalhe = erro?.response?.data?.message ?? erro?.message;
      Alert.alert(
        "Não foi possível ler a fatura",
        detalhe || "Confirme se o arquivo é uma conta da concessionária em PDF e tente novamente."
      );
    } finally {
      setAnalisando(false);
    }
  }

  return (
    <View style={styles.row}>
      <Button
        icon={<Ionicons name="create-outline" size={20} color="#FFF" />}
        onPress={abrirManual}
        style={styles.button}
        title="Manual"
      />
      <Button
        disabled={analisando}
        icon={<Ionicons name="document-attach-outline" size={20} color="#FFF" />}
        onPress={importar}
        style={[styles.button, styles.importButton]}
        title={analisando ? "Lendo..." : "Importar fatura"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  button: { flex: 1 },
  importButton: { backgroundColor: Colors.secondary },
});
