import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { analisarFatura } from "../../services/faturas.service";
import { useAuth } from "../../contexts/AuthContext";
import { Colors, Spacing } from "../../theme";
import { Button } from "../ui";

type TipoCadastro = "CLIENTE" | "USINA" | "UNIDADE";

function consumoMensalValido(item: any) {
  const consumoExtraido = Number(item?.consumo ?? 0);
  const dias = Number(item?.dias ?? 0);
  const mediaDiaria = Number(item?.mediaDiaria ?? 0);
  const consumoPelaMedia = mediaDiaria > 0 && dias > 0 ? Math.round(mediaDiaria * dias) : 0;

  if (!Number.isFinite(consumoExtraido) || consumoExtraido < 0) return 0;
  return consumoPelaMedia > 0 && consumoExtraido > consumoPelaMedia * 2
    ? consumoPelaMedia
    : consumoExtraido;
}

const rotas = {
  CLIENTE: "/clientes/novo",
  USINA: "/usinas/nova",
  UNIDADE: "/unidades/nova",
} as const;

export default function CadastroActions({ tipo }: { tipo: TipoCadastro }) {
  const [analisando, setAnalisando] = useState(false);
  const { usinaSelecionada } = useAuth();

  function abrirManual() {
    router.push({ pathname: rotas[tipo] as any, params: tipo === "CLIENTE" && usinaSelecionada?.id ? { usinaId: usinaSelecionada.id, usinaNome: usinaSelecionada.nome } : {} });
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
      const dadosCadastro = analise?.resultado?.dadosCadastro ?? analise?.dadosCadastro ?? {};
      const nomeExtraido = dados.cliente ?? dados.nome ?? dados.titular ?? dadosCadastro.nome ?? dadosCadastro.cliente ?? "";
      const ucExtraida = dados.uc ?? dados.numero_instalacao ?? dados.numeroInstalacao ?? dadosCadastro.uc ?? "";
      const enderecoExtraido = dados.endereco ?? dados.endereco_instalacao ?? dadosCadastro.endereco ?? "";
      const distribuidoraExtraida = dados.distribuidora ?? dados.concessionaria ?? dadosCadastro.distribuidora ?? "CEMIG";
      const historico = Array.isArray(dados.historico) ? dados.historico.slice(0, 12) : [];
      const consumosValidos = historico.map(consumoMensalValido).filter((valor: number) => valor > 0);
      const mediaConsumo = consumosValidos.length
        ? consumosValidos.reduce((soma: number, consumo: number) => soma + consumo, 0) / consumosValidos.length
        : Number(dados.consumo ?? 0);

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
          classificacao: tipo === "UNIDADE" ? "" : String(analise?.classificacao ?? ""),
          cliente: tipo === "UNIDADE" ? "" : String(nomeExtraido),
          nome: tipo === "UNIDADE" ? "" : String(nomeExtraido),
          uc: String(ucExtraida),
          numeroInstalacao: String(ucExtraida),
          endereco: tipo === "UNIDADE" ? "" : String(enderecoExtraido),
          distribuidora: String(distribuidoraExtraida),
          arquivoUri: item.uri,
          arquivoNome: item.name,
          energiaCompensada: tipo === "UNIDADE" ? "0" : String(dados.energiaCompensada ?? 0),
          consumo: String(dados.consumo ?? 0),
          consumoMedio: String(Math.round(mediaConsumo)),
          usinaId: tipo === "CLIENTE" ? String(usinaSelecionada?.id ?? "") : "",
          usinaNome: tipo === "CLIENTE" ? String(usinaSelecionada?.nome ?? "") : "",
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
        title={analisando ? "Lendo..." : tipo === "UNIDADE" ? "Importar fatura" : "Via fatura"}
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
