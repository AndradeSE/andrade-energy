import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { analisarFatura, calcularMediaConsumoFatura } from "../../services/faturas.service";
import { useAuth } from "../../contexts/AuthContext";
import { IS_GERADOR_APP } from "../../config/appVariant";
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
  const { usuario, usinaSelecionada, suspenderBloqueioTemporariamente } = useAuth();
  const podeImportarCliente = tipo === "CLIENTE" && IS_GERADOR_APP && usuario?.perfil === "ADMIN";

  function abrirManual() {
    if (tipo === "CLIENTE") {
      router.push("/clientes/novo");
      return;
    }
    router.push({ pathname: rotas[tipo] as any, params: tipo === "UNIDADE" ? { cadastroRapido: "1" } : {} });
  }

  async function importar() {
    const retomarBloqueio = suspenderBloqueioTemporariamente();
    try {
      const arquivo = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (arquivo.canceled) return;

      setAnalisando(true);
      const item = arquivo.assets[0];
      const analise = await analisarFatura(item.uri, item.name);
      const dados = analise?.dados ?? {};
      const dadosCadastro = analise?.resultado?.dadosCadastro ?? analise?.dadosCadastro ?? {};
      const nomeExtraido = dados.cliente ?? dados.nome ?? dados.titular ?? dadosCadastro.nome ?? dadosCadastro.cliente ?? "";
      const ucExtraida = dados.uc ?? dados.numero_instalacao ?? dados.numeroInstalacao ?? dadosCadastro.uc ?? "";
      const enderecoExtraido = dados.endereco ?? dados.endereco_instalacao ?? dadosCadastro.endereco ?? "";
      const cpfExtraido = dados.cpf ?? dados.cpf_cnpj ?? dados.documento ?? dadosCadastro.cpf ?? dadosCadastro.cpf_cnpj ?? "";
      const cpfParcialExtraido = dados.cpfParcial ?? dados.cpf_parcial ?? dadosCadastro.cpfParcial ?? dadosCadastro.cpf_parcial ?? cpfExtraido;
      const distribuidoraExtraida = dados.distribuidora ?? dados.concessionaria ?? dadosCadastro.distribuidora ?? "CEMIG";
      const mediaConsumo = calcularMediaConsumoFatura(dados);
      const tipoGdInformado = String(dados.tipoGd ?? dados.tipo_gd ?? "").toUpperCase();
      const possuiGD1 = Number(dados.energiaCompensadaGD1 ?? dados.energia_compensada_gd1 ?? 0) > 0;
      const possuiGD2 = Number(dados.energiaCompensadaGD2 ?? dados.energia_compensada_gd2 ?? 0) > 0;
      const tipoGdDetectado = ["GD1", "GD2", "MISTA"].includes(tipoGdInformado)
        ? tipoGdInformado
        : possuiGD1 && possuiGD2 ? "MISTA" : possuiGD2 ? "GD2" : possuiGD1 ? "GD1" : "";
      // Em uma UC geradora, a energia compensada informa o benefício usado
      // pela própria unidade, mas não comprova que houve geração no período.
      // Sem produção/injeção identificada, a modalidade da usina deve ser
      // confirmada manualmente em vez de assumir GD I pela compensação.
      const tipoGd = tipo === "USINA" && analise.classificacao !== "POSSIVEL_GERADORA"
        ? ""
        : tipoGdDetectado;
      const leituraAtual = Number(dados.leituraAtual ?? dados.leitura_atual ?? 0);
      const leituraAnterior = Number(dados.leituraAnterior ?? dados.leitura_anterior ?? 0);
      const fatorMultiplicacao = Number(dados.fatorMultiplicacao ?? dados.fator_multiplicacao ?? 1);
      const producaoMensalLida = Number(dados.producaoMensal ?? dados.producao_mensal);
      const geracaoDoPeriodo = Number.isFinite(producaoMensalLida) && Array.isArray(dados.medicoes)
        ? Math.max(0, producaoMensalLida)
        : leituraAtual >= leituraAnterior && fatorMultiplicacao > 0
          ? (leituraAtual - leituraAnterior) * fatorMultiplicacao
          : 0;

      if (tipo === "USINA" && analise.classificacao !== "POSSIVEL_GERADORA") {
        Alert.alert(
          "Usina não identificada",
          "Esta conta não apresenta energia injetada. Você ainda pode completar o cadastro manualmente."
        );
      }

      router.push({
        pathname: (tipo === "CLIENTE" ? "/clientes/novo" : rotas[tipo]) as any,
        params: {
          origem: "fatura",
          classificacao: tipo === "UNIDADE" ? "" : String(analise?.classificacao ?? ""),
          cliente: tipo === "UNIDADE" ? "" : String(nomeExtraido),
          nome: tipo === "UNIDADE" ? "" : String(nomeExtraido),
          uc: String(ucExtraida),
          numeroInstalacao: String(ucExtraida),
          endereco: tipo === "UNIDADE" ? "" : String(enderecoExtraido),
          cpf: tipo === "CLIENTE"
            ? String(cpfExtraido)
            : tipo === "UNIDADE"
              ? String(cpfParcialExtraido).replace(/\D/g, "").slice(0, 4)
              : "",
          distribuidora: String(distribuidoraExtraida),
          arquivoUri: item.uri,
          arquivoNome: item.name,
          energiaCompensada: tipo === "UNIDADE" ? "0" : String(dados.energiaCompensada ?? 0),
          tipoGd,
          geracaoMedia: tipo === "USINA" && geracaoDoPeriodo > 0 ? String(geracaoDoPeriodo) : "",
          dadosFatura: tipo === "USINA" ? "" : JSON.stringify({
            valorTotal: dados.valorTotal,
            consumo: dados.consumo,
            energiaInjetada: dados.energiaInjetada,
            energiaCompensada: dados.energiaCompensada,
            energiaCompensadaGD1: dados.energiaCompensadaGD1,
            energiaCompensadaGD2: dados.energiaCompensadaGD2,
            tarifaCheia: dados.tarifaCheia,
            tarifaScee: dados.tarifaScee,
            tarifaGD2: dados.tarifaGD2 ?? dados.tarifaGD,
            custoDisponibilidade: dados.custoDisponibilidade,
            custoDisponibilidadeGD1: dados.custoDisponibilidadeGD1,
            custoDisponibilidadeGD2: dados.custoDisponibilidadeGD2,
            franquiaDisponibilidadeKwh: dados.franquiaDisponibilidadeKwh,
            tarifaDisponibilidadeSemImpostos: dados.tarifaDisponibilidadeSemImpostos,
            tipoLigacao: dados.tipoLigacao,
            valorIluminacaoPublica: dados.valorIluminacaoPublica,
            valorBandeira: dados.valorBandeira,
            encargosAdicionais: dados.encargosAdicionais,
            valorEnergiaConcessionaria: dados.valorEnergiaConcessionaria,
          }),
          cadastroRapido: tipo === "UNIDADE" ? "1" : "",
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
      retomarBloqueio();
    }
  }

  return (
    <View style={styles.row}>
      <Button
        icon={<Ionicons name="create-outline" size={20} color="#FFF" />}
        onPress={abrirManual}
        style={styles.button}
        title={tipo === "CLIENTE" ? "Adicionar cliente" : "Manual"}
      />
      {(tipo !== "CLIENTE" || podeImportarCliente) ? <Button
        disabled={analisando}
        icon={<Ionicons name="document-attach-outline" size={20} color="#FFF" />}
        onPress={importar}
        style={[styles.button, styles.importButton]}
        title={analisando ? "Lendo..." : tipo === "UNIDADE" ? "Importar fatura" : tipo === "CLIENTE" ? "Cliente via fatura" : "Via fatura"}
      /> : null}
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
