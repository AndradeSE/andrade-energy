import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import ChoiceField from "../../components/cadastro/ChoiceField";
import FormField from "../../components/cadastro/FormField";
import { AppHeader, Button, Card, ElasticScrollView as ScrollView, Screen } from "../../components/ui";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { alocarUnidade } from "../../services/usinas.service";
import { supabase } from "../../supabase";
import { Colors, Radius, Spacing, Typography } from "../../theme";

type Tipo = "CONSUMIDORA" | "BENEFICIARIA" | "GERADORA";
type Modalidade = "INJECAO" | "COMPENSACAO";
type FormatoFatura = "UNIFICADA" | "SOMENTE_ANDRADE";
type RepasseGD2 = "REPASSAR" | "ABSORVER";

function numeroSeguro(valor: unknown) {
  const texto = String(valor ?? "").trim();
  const normalizado = texto.includes(",") ? texto.replace(/\./g, "").replace(",", ".") : texto;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}

export default function NovaUnidade() {
  const { origem, classificacao, cliente, clienteId: clienteIdVinculado, uc, cpf: cpfImportado, energiaCompensada, endereco: enderecoImportado, cadastroRapido, consumoMedio: consumoMedioImportado } = useLocalSearchParams<{ origem?: string; classificacao?: string; cliente?: string; clienteId?: string; uc?: string; cpf?: string; energiaCompensada?: string; endereco?: string; cadastroRapido?: string; consumoMedio?: string }>();
  const [numero, setNumero] = useState(""); const [titular, setTitular] = useState("");
  const [cpfTitular, setCpfTitular] = useState("");
  const [tipo, setTipo] = useState<Tipo>("BENEFICIARIA"); const [modalidade, setModalidade] = useState<Modalidade>("COMPENSACAO");
  const [desconto, setDesconto] = useState("40"); const [endereco, setEndereco] = useState("");
  const [formatoFatura, setFormatoFatura] = useState<FormatoFatura>("UNIFICADA");
  const [repasseDisponibilidadeGD1, setRepasseDisponibilidadeGD1] = useState<RepasseGD2>("REPASSAR");
  const [repasseDisponibilidadeGD2, setRepasseDisponibilidadeGD2] = useState<RepasseGD2>("REPASSAR");
  const [repasseFioBGD2, setRepasseFioBGD2] = useState<RepasseGD2>("REPASSAR");
  const [clientes, setClientes] = useState<any[]>([]); const [usinas, setUsinas] = useState<any[]>([]);
  const [clienteId, setClienteId] = useState(""); const [usinaId, setUsinaId] = useState(""); const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("clientes").select("id,nome,cpf,endereco,distribuidora,usina_id,modalidade_faturamento,desconto_percentual,consumo_medio_kwh").order("nome"),
      supabase.from("usinas").select("id,nome").order("nome"),
    ]).then(([c, u]) => { setClientes(c.data ?? []); setUsinas(u.data ?? []); });
    if (clienteIdVinculado) setClienteId(clienteIdVinculado);
    if (origem !== "fatura") return;
    const nomeExtraido = (cliente ?? "").trim();
    const rotuloDaFatura = /d[eé]bito\s+autom[aá]tico|valor\s+a\s+pagar|vencimento/i.test(nomeExtraido);
    const titularExtraido = rotuloDaFatura ? "" : nomeExtraido;
    setNumero((uc ?? "").replace(/\D/g, ""));
    if (cpfImportado) setCpfTitular(formatarDocumento(cpfImportado));
    if (titularExtraido) setTitular(titularExtraido);
    if (enderecoImportado) setEndereco(enderecoImportado);
    if (classificacao === "POSSIVEL_GERADORA") { setTipo("GERADORA"); setModalidade("INJECAO"); }
    else if (!Number(energiaCompensada)) setTipo("CONSUMIDORA");
  }, [classificacao, cliente, clienteIdVinculado, cpfImportado, enderecoImportado, energiaCompensada, origem, uc]);

  useEffect(() => {
    const clienteSelecionado = clientes.find((item) => item.id === clienteId);
    if (!clienteSelecionado) return;
    setTipo("BENEFICIARIA");
    if (clienteSelecionado.cpf && !cpfTitular) setCpfTitular(formatarDocumento(clienteSelecionado.cpf));
  }, [clienteId, clientes, cpfTitular]);

  async function salvar() {
    const percentual = Number(desconto.replace(",", "."));
    const documentoTitular = cpfTitular.replace(/\D/g, "");
    const cadastroManualDoGerador = IS_GERADOR_APP && origem !== "fatura";
    const clienteSelecionado = clientes.find((item) => item.id === clienteId);
    const usinaFinal = usinaId || clienteSelecionado?.usina_id || null;
    const modalidadeFinal = clienteSelecionado?.modalidade_faturamento ?? modalidade;
    const descontoFinal = clienteSelecionado?.desconto_percentual ?? percentual;
    const mediaImportada = numeroSeguro(consumoMedioImportado);
    const consumoMedioFinal = Math.max(0, mediaImportada > 0 ? mediaImportada : numeroSeguro(clienteSelecionado?.consumo_medio_kwh));

    if (!numero) return Alert.alert("Dados incompletos", "Informe o número da unidade consumidora.");
    if (tipo === "BENEFICIARIA" && !clienteId) return Alert.alert("Escolha o cliente", "Vincule a UC a um cliente antes de salvar.");
    if (tipo === "BENEFICIARIA" && !usinaFinal) return Alert.alert("Escolha a usina", "Uma UC beneficiária precisa ser vinculada a uma usina antes de salvar.");
    if (tipo !== "BENEFICIARIA" && !usinaFinal) return Alert.alert("Dados incompletos", "Vincule esta unidade a uma usina.");
    if (cadastroManualDoGerador && ![11, 14].includes(documentoTitular.length)) {
      return Alert.alert("CPF obrigatório", "Informe o CPF do titular da conta de luz antes de salvar a unidade.");
    }
    if (!Number.isFinite(percentual) || percentual < 0 || percentual > 100) return Alert.alert("Desconto inválido", "Informe um percentual entre 0 e 100.");
    setSalvando(true);
    try {
      let unidadeAlocadaId = "";
      if (tipo === "BENEFICIARIA") {
        const alocacao = await alocarUnidade(String(usinaFinal), {
          clienteId,
          numero,
          modalidade: modalidadeFinal,
          percentual: 100,
          desconto: numeroSeguro(descontoFinal),
          consumoMedio: consumoMedioFinal,
          percentualRepasseDisponibilidade: repasseDisponibilidadeGD2 === "REPASSAR" ? 100 : 0,
          repassarCustoDisponibilidadeGD1: repasseDisponibilidadeGD1 === "REPASSAR",
          repassarCustoDisponibilidadeGD2: repasseDisponibilidadeGD2 === "REPASSAR",
          repassarDiferencaFioBGD2: repasseFioBGD2 === "REPASSAR",
          faturaSomenteAndrade: formatoFatura === "SOMENTE_ANDRADE",
          calcularAutomaticamente: true,
        });
        unidadeAlocadaId = String(alocacao?.unidadeId ?? "");
      } else {
        const { error } = await supabase.from("unidades_consumidoras").upsert({
          numero, titular: titular.trim() || clienteSelecionado?.nome || null, tipo, cliente_id: clienteId || null, usina_id: usinaFinal,
          distribuidora: clienteSelecionado?.distribuidora || "CEMIG", endereco: endereco.trim() || clienteSelecionado?.endereco || null, modalidade_faturamento: modalidadeFinal,
          desconto_percentual: descontoFinal, cpf_titular: documentoTitular || clienteSelecionado?.cpf || null, status: "ATIVA",
          percentual_repasse_disponibilidade: repasseDisponibilidadeGD2 === "REPASSAR" ? 100 : 0,
          repassar_disponibilidade_gd1: repasseDisponibilidadeGD1 === "REPASSAR",
          repassar_disponibilidade_gd2: repasseDisponibilidadeGD2 === "REPASSAR",
          repassar_diferenca_fio_b_gd2: repasseFioBGD2 === "REPASSAR",
          fatura_somente_andrade: formatoFatura === "SOMENTE_ANDRADE",
        }, { onConflict: "numero" });
        if (error) throw error;
      }

      if (origem === "fatura" && clienteId) {
        router.replace({
          pathname: "/unidades/editar",
          params: {
            id: unidadeAlocadaId,
            numero,
            clienteId,
            consumoMedio: consumoMedioFinal > 0 ? String(consumoMedioFinal) : "",
            usinaId: usinaFinal ?? "",
            modalidade: modalidadeFinal,
            desconto: String(descontoFinal),
          },
        });
      } else {
        router.back();
      }
    } catch (erro: any) {
      Alert.alert("Não foi possível salvar", erro?.response?.data?.message ?? erro?.message ?? "Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return <Screen>{IS_GERADOR_APP ? <AppHeader variant="subpage" title="Nova unidade" subtitle="Cadastro da carteira" contextTitle="Nova unidade" contextSubtitle={origem === "fatura" ? "Dados lidos da conta de energia" : "Cadastro manual"} icon="flash-outline" /> : null}<ScrollView contentContainerStyle={styles.content} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
    <Text style={styles.eyebrow}>{origem === "fatura" ? "DADOS LIDOS DA FATURA" : "CADASTRO MANUAL"}</Text><Text style={styles.title}>Nova unidade</Text>
    <Text style={styles.subtitle}>{clienteIdVinculado ? "Confirme o número. Os demais dados serão herdados do cliente." : cadastroRapido === "1" ? "Confirme o número e escolha o cliente. Os demais dados serão herdados automaticamente." : "Confira a leitura e escolha a quem esta unidade pertence."}</Text>
    <Card><FormField label="Número da UC / instalação" value={numero} onChangeText={(v) => setNumero(v.replace(/\D/g, ""))} keyboardType="numeric" />
      <FormField label={IS_GERADOR_APP && origem !== "fatura" ? "CPF/CNPJ do titular na conta de luz *" : "CPF/CNPJ do titular na conta de luz"} value={cpfTitular} onChangeText={(valor) => setCpfTitular(formatarDocumento(valor))} keyboardType="numeric" />
      {!clienteIdVinculado && cadastroRapido !== "1" ? <><FormField label="Titular" value={titular} onChangeText={setTitular} />
        <Text style={styles.beneficiariaHint}>Esta UC será cadastrada como beneficiária: ela receberá a energia alocada pela usina.</Text>
        <ChoiceField label="Faturamento" value={modalidade} onChange={setModalidade} options={[{ label: "Injeção", value: "INJECAO" }, { label: "Compensação", value: "COMPENSACAO" }]} />
        <Text style={styles.label}>Usina</Text><View style={styles.options}>{usinas.map((u) => <Pressable key={u.id} onPress={() => setUsinaId(usinaId === u.id ? "" : u.id)} style={[styles.link, usinaId === u.id && styles.linkSelected]}><Text>{u.nome}</Text></Pressable>)}</View>
        <FormField label="Desconto contratado (%)" value={desconto} onChangeText={setDesconto} keyboardType="decimal-pad" /><FormField label="Endereço" value={endereco} onChangeText={setEndereco} /></> : null}
      {clienteIdVinculado && !clientes.find((item) => item.id === clienteId)?.usina_id ? <><Text style={styles.label}>Usina geradora</Text><View style={styles.options}>{usinas.map((u) => <Pressable key={u.id} onPress={() => setUsinaId(usinaId === u.id ? "" : u.id)} style={[styles.link, usinaId === u.id && styles.linkSelected]}><Text>{u.nome}</Text></Pressable>)}</View></> : null}
      {!clienteIdVinculado ? <><Text style={styles.label}>Cliente</Text><View style={styles.options}>{clientes.map((c) => <Pressable key={c.id} onPress={() => setClienteId(clienteId === c.id ? "" : c.id)} style={[styles.link, clienteId === c.id && styles.linkSelected]}><Text>{c.nome}</Text></Pressable>)}</View></> : null}
      <ChoiceField label="Formato da cobrança" value={formatoFatura} onChange={(valor) => setFormatoFatura(valor as FormatoFatura)} options={[{ label: "Fatura unificada (CEMIG + Andrade)", value: "UNIFICADA" }, { label: "Somente Andrade Energy", value: "SOMENTE_ANDRADE" }]} />
      <ChoiceField label="GD I: custo de disponibilidade recalculado" value={repasseDisponibilidadeGD1} onChange={(valor) => setRepasseDisponibilidadeGD1(valor as RepasseGD2)} options={[{ label: "Repassar ao cliente", value: "REPASSAR" }, { label: "Absorver pela Andrade", value: "ABSORVER" }]} />
      <ChoiceField label="GD II: custo de disponibilidade recalculado" value={repasseDisponibilidadeGD2} onChange={(valor) => setRepasseDisponibilidadeGD2(valor as RepasseGD2)} options={[{ label: "Repassar ao cliente", value: "REPASSAR" }, { label: "Absorver pela Andrade", value: "ABSORVER" }]} />
      <ChoiceField label="GD II: diferença do Fio B" value={repasseFioBGD2} onChange={(valor) => setRepasseFioBGD2(valor as RepasseGD2)} options={[{ label: "Repassar ao cliente", value: "REPASSAR" }, { label: "Absorver pela Andrade", value: "ABSORVER" }]} />
      <Text style={styles.beneficiariaHint}>A disponibilidade é aplicada conforme a modalidade GD identificada na conta; a diferença do Fio B vale somente para GD II. Os demais encargos continuam na fatura da concessionária.</Text>
      <Button disabled={salvando} title={salvando ? "Salvando..." : "Salvar unidade"} onPress={salvar} />
    </Card>
  </ScrollView></Screen>;
}

function formatarDocumento(valor: string) {
  const numeros = valor.replace(/\D/g, "").slice(0, 14);
  if (numeros.length <= 11) return numeros.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  return numeros.replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl }, eyebrow: { color: Colors.primary, fontSize: Typography.small, fontWeight: "700", letterSpacing: 1.2 },
  title: { marginTop: Spacing.xs, color: Colors.text, fontSize: Typography.title, fontWeight: "700" }, subtitle: { marginTop: Spacing.sm, marginBottom: Spacing.lg, color: Colors.subtitle, lineHeight: 21 },
  label: { marginBottom: Spacing.xs, color: Colors.text, fontSize: Typography.caption, fontWeight: "700" }, beneficiariaHint: { marginTop: -Spacing.sm, marginBottom: Spacing.md, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 18 }, options: { gap: Spacing.xs, marginBottom: Spacing.md },
  link: { padding: Spacing.sm, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.surface }, linkSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
});
