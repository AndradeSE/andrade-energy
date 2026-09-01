import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";

import FormField from "../../components/cadastro/FormField";
import ChoiceField from "../../components/cadastro/ChoiceField";
import { AppHeader, Button, Card, ElasticScrollView as ScrollView, Screen } from "../../components/ui";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../supabase";
import { Colors, Spacing, Typography } from "../../theme";

export default function NovaUsina() {
  const { usuario, atualizarUsuario, selecionarUsina } = useAuth();
  const { origem, cliente, uc, endereco: enderecoImportado, tipoGd: tipoGdImportado, geracaoMedia: geracaoMediaImportada } = useLocalSearchParams<{ origem?: string; cliente?: string; uc?: string; endereco?: string; tipoGd?: string; geracaoMedia?: string }>();
  const [nome, setNome] = useState("");
  const [numeroInstalacao, setNumeroInstalacao] = useState("");
  const [potencia, setPotencia] = useState("");
  const [geracaoMedia, setGeracaoMedia] = useState(geracaoMediaImportada ?? "");
  const [titular, setTitular] = useState("");
  const [cpfTitular, setCpfTitular] = useState("");
  const [endereco, setEndereco] = useState("");
  const tipoGdLido = String(tipoGdImportado).toUpperCase();
  const [tipoGd, setTipoGd] = useState<"" | "GD1" | "GD2">(tipoGdLido === "GD2" ? "GD2" : tipoGdLido === "GD1" ? "GD1" : "");
  const [salvando, setSalvando] = useState(false);

  async function abrirNaLista(usina: {
    id: string;
    nome: string;
    numero_instalacao?: string | null;
    distribuidora?: string | null;
    endereco?: string | null;
    status?: string | null;
  }) {
    if (usuario?.perfil === "GESTOR" && !usuario.usina_id) {
      const { error: vinculoError } = await supabase
        .from("usuarios")
        .update({ usina_id: usina.id })
        .eq("id", usuario.id);

      if (vinculoError) {
        Alert.alert("Usina localizada", "Não foi possível vinculá-la à sua conta.");
        return false;
      }

      await atualizarUsuario({ usina_id: usina.id });
    }

    selecionarUsina(usina);
    router.replace("/(tabs)/usinas");
    return true;
  }

  useEffect(() => {
    if (origem !== "fatura") return;
    const nomeExtraido = (cliente ?? "").trim();
    const rotuloDaFatura = /d[eé]bito\s+autom[aá]tico|valor\s+a\s+pagar|vencimento/i.test(nomeExtraido);
    const titularExtraido = rotuloDaFatura || !nomeExtraido ? usuario?.nome?.trim() ?? "" : nomeExtraido;
    setNome(titularExtraido ? `Usina ${titularExtraido}` : "");
    setTitular(titularExtraido);
    setNumeroInstalacao((uc ?? "").replace(/\D/g, ""));
    setEndereco(enderecoImportado ?? "");
    setGeracaoMedia(geracaoMediaImportada ?? "");
    const tipoLido = String(tipoGdImportado).toUpperCase();
    setTipoGd(tipoLido === "GD2" ? "GD2" : tipoLido === "GD1" ? "GD1" : "");
  }, [cliente, enderecoImportado, geracaoMediaImportada, origem, tipoGdImportado, uc, usuario?.nome]);

  async function salvar() {
    if (!nome.trim() || !numeroInstalacao || !potencia) {
      Alert.alert("Dados incompletos", "Informe nome, instalação e potência da usina.");
      return;
    }
    if (!tipoGd) return Alert.alert("Modalidade GD necessária", "A fatura não identificou GD I ou GD II. Escolha a modalidade manualmente para continuar.");
    setSalvando(true);
    const { data: usina, error } = await supabase.from("usinas").insert({
      nome: nome.trim(), numero_instalacao: numeroInstalacao, potencia_kwp: Number(potencia.replace(",", ".")),
      geracao_media: Number(geracaoMedia.replace(",", ".")) || 0,
      titular_nome: titular.trim() || null, endereco: endereco.trim() || null,
      distribuidora: "CEMIG", modalidade: "INJECAO", tipo_gd: tipoGd, status: "ATIVA",
    }).select("id, nome, numero_instalacao, distribuidora, endereco, status").single();

    if (!error && usina) {
      const { error: unidadeError } = await supabase.from("unidades_consumidoras").upsert({
        usina_id: usina.id, numero: numeroInstalacao, tipo: "GERADORA", titular: titular.trim() || nome.trim(),
        cpf_titular: cpfTitular.replace(/\D/g, "") || null,
        distribuidora: "CEMIG", endereco: endereco.trim() || null, modalidade_faturamento: "INJECAO", status: "ATIVA",
      }, { onConflict: "numero" });
      if (unidadeError) {
        Alert.alert("Usina salva", "A usina foi criada, mas a unidade geradora precisa ser vinculada novamente.");
        await abrirNaLista(usina);
      } else {
        await abrirNaLista(usina);
      }
    } else if (error?.code === "23505" && error.message.includes("usinas_numero_instalacao_key")) {
      const { data: existente, error: buscaError } = await supabase
        .from("usinas")
        .select("id, nome, numero_instalacao, distribuidora, endereco, status")
        .eq("numero_instalacao", numeroInstalacao)
        .single();

      if (buscaError || !existente) {
        Alert.alert("Usina já cadastrada", "Esta instalação já existe, mas não foi possível carregá-la.");
      } else {
        Alert.alert("Usina já cadastrada", "A instalação já existe e foi localizada na sua lista.");
        await abrirNaLista(existente);
      }
    } else Alert.alert("Não foi possível salvar", error?.message ?? "Tente novamente.");
    setSalvando(false);
  }

  return (
    <Screen>{IS_GERADOR_APP ? <AppHeader variant="subpage" title="Nova usina" subtitle="Cadastro de geração" contextTitle="Nova usina" contextSubtitle={origem === "fatura" ? "Dados lidos da conta de energia" : "Cadastro manual"} icon="sunny-outline" /> : null}<ScrollView contentContainerStyle={styles.content} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>{origem === "fatura" ? "DADOS LIDOS DA FATURA" : "CADASTRO MANUAL"}</Text>
      <Text style={styles.title}>Nova usina</Text>
      <Text style={styles.subtitle}>Confira os dados antes de salvar. O nome sugerido pela fatura pode ser alterado livremente.</Text>
      <Card>
        <FormField label="Nome da usina (editável)" value={nome} onChangeText={setNome} placeholder="Ex.: Usina Solar Alfenas" />
        <FormField label="Número da instalação / UC" value={numeroInstalacao} onChangeText={(v) => setNumeroInstalacao(v.replace(/\D/g, ""))} keyboardType="numeric" />
        <FormField label="Potência (kWp)" value={potencia} onChangeText={setPotencia} keyboardType="decimal-pad" />
        <FormField label="Geração média mensal (kWh)" value={geracaoMedia} onChangeText={setGeracaoMedia} keyboardType="decimal-pad" placeholder="Base inicial da alocação automática" />
        {origem === "fatura" && tipoGd ? <Text style={styles.subtitle}>{`Modalidade identificada automaticamente no PDF: ${tipoGd === "GD2" ? "GD II" : "GD I"}.`}</Text> : <><Text style={styles.gdHint}>{origem === "fatura" ? "A modalidade não foi identificada nesta fatura. Escolha GD I ou GD II." : "Escolha a modalidade da usina."}</Text><ChoiceField label="Modalidade GD da usina" value={tipoGd} onChange={setTipoGd} options={[{ label: "GD I", value: "GD1" }, { label: "GD II", value: "GD2" }]} /></>}
        <FormField label="Titular" value={titular} onChangeText={setTitular} />
        <FormField label="CPF/CNPJ do titular da conta (para e-mail)" value={cpfTitular} onChangeText={(valor) => setCpfTitular(valor.replace(/\D/g, "").slice(0, 14))} keyboardType="numeric" />
        <FormField label="Endereço" value={endereco} onChangeText={setEndereco} />
        <Button disabled={salvando} title={salvando ? "Salvando..." : "Salvar usina"} onPress={salvar} />
      </Card>
    </ScrollView></Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  eyebrow: { color: Colors.primary, fontSize: Typography.small, fontWeight: "700", letterSpacing: 1.2 },
  title: { marginTop: Spacing.xs, color: Colors.text, fontSize: Typography.title, fontWeight: "700" },
  subtitle: { marginTop: Spacing.sm, marginBottom: Spacing.lg, color: Colors.subtitle, lineHeight: 21 },
  gdHint: { marginBottom: Spacing.sm, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 19 },
});
