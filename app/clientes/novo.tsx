import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import FormField from "../../components/cadastro/FormField";
import ChoiceField from "../../components/cadastro/ChoiceField";
import RealDiscountInfo from "../../components/cadastro/RealDiscountInfo";
import { AppHeader, Button, Card, ElasticScrollView as ScrollView, Screen } from "../../components/ui";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../supabase";
import { alocarUnidade, listarUsinas } from "../../services/usinas.service";
import { Colors, Spacing, Typography } from "../../theme";

type Modalidade = "INJECAO" | "COMPENSACAO";
type FormatoFatura = "UNIFICADA" | "SOMENTE_ANDRADE";
type RepasseGD = "REPASSAR" | "ABSORVER";

export default function NovoCliente() {
  const { usinaSelecionada, usuario } = useAuth();
  const { origem, cliente, nome: nomeImportado, uc: ucImportada, numeroInstalacao, endereco: enderecoImportado, distribuidora: distribuidoraImportada, consumo, consumoMedio: consumoMedioImportado, usinaId: usinaIdNavegacao, usinaNome, tipoGd: tipoGdImportado, dadosFatura: dadosFaturaParam } = useLocalSearchParams<{ origem?: string; cliente?: string; nome?: string; uc?: string; numeroInstalacao?: string; endereco?: string; distribuidora?: string; consumo?: string; consumoMedio?: string; usinaId?: string; usinaNome?: string; tipoGd?: string; dadosFatura?: string }>();
  const dadosFatura = parseDadosFatura(dadosFaturaParam);
  const [nome, setNome] = useState("");
  const [uc, setUc] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [distribuidora, setDistribuidora] = useState("CEMIG");
  const [modalidade, setModalidade] = useState<Modalidade>("COMPENSACAO");
  const [desconto, setDesconto] = useState("40");
  const [formatoFatura, setFormatoFatura] = useState<FormatoFatura>("UNIFICADA");
  const [repasseDisponibilidadeGD1, setRepasseDisponibilidadeGD1] = useState<RepasseGD>("REPASSAR");
  const [repasseDisponibilidadeGD2, setRepasseDisponibilidadeGD2] = useState<RepasseGD>("REPASSAR");
  const [repasseFioBGD2, setRepasseFioBGD2] = useState<RepasseGD>("REPASSAR");
  const [consumoMedio, setConsumoMedio] = useState("");
  const [usinas, setUsinas] = useState<any[]>([]);
  const [usinaEscolhida, setUsinaEscolhida] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (origem !== "fatura") return;
    const nomeExtraido = (cliente ?? nomeImportado ?? "").trim();
    const invalido = /d[eé]bito\s+autom[aá]tico|valor\s+a\s+pagar|vencimento/i.test(nomeExtraido);
    setNome(invalido ? "" : nomeExtraido);
    setUc((ucImportada ?? numeroInstalacao ?? "").replace(/\D/g, ""));
    setEndereco(enderecoImportado ?? "");
    setDistribuidora(distribuidoraImportada ?? "CEMIG");
    const mediaExtraida = Number(consumoMedioImportado ?? consumo ?? 0);
    setConsumoMedio(mediaExtraida > 0 ? String(mediaExtraida) : "");
  }, [cliente, consumo, consumoMedioImportado, distribuidoraImportada, enderecoImportado, nomeImportado, numeroInstalacao, origem, ucImportada]);

  useEffect(() => {
    let ativa = true;
    listarUsinas().then((lista) => {
      if (ativa) setUsinas(lista ?? []);
    }).catch(() => {
      // A tela continua funcionando com a usina já selecionada no cabeçalho.
    });
    return () => { ativa = false; };
  }, []);

  const usinaIdFinal = usinaIdNavegacao || usinaEscolhida || usinaSelecionada?.id || usuario?.usina_id || "";
  const usinaNomeFinal = usinaNome || usinas.find((item) => item.id === usinaIdFinal)?.nome || (usinaIdFinal === usinaSelecionada?.id ? usinaSelecionada?.nome : "");

  async function salvar() {
    if (!nome.trim()) return Alert.alert("Nome obrigatório", "Informe o nome do consumidor.");
    const cpfLimpo = cpf.replace(/\D/g, "");
    const consumoMedioKwh = Math.max(0, Number(consumoMedio.replace(",", ".")) || 0);
    const descontoPercentual = Number(desconto.replace(",", "."));
    const usinaId = usinaIdFinal || null;
    if (cpfLimpo && ![11, 14].includes(cpfLimpo.length)) return Alert.alert("Documento inválido", "Informe um CPF ou CNPJ válido.");
    if (uc && !usinaId) return Alert.alert("Escolha uma usina", "Para cadastrar uma UC, escolha primeiro a usina que irá atendê-la.");
    if (!Number.isFinite(descontoPercentual) || descontoPercentual < 0 || descontoPercentual > 100) return Alert.alert("Desconto inválido", "Informe um percentual entre 0 e 100.");
    setSalvando(true);

    const dados = {
      nome: nome.trim(), cpf: cpfLimpo || null, email: email.trim().toLowerCase() || null,
      telefone: telefone.trim() || null, whatsapp: telefone.replace(/\D/g, "") || null,
      uc: uc || null, endereco: endereco.trim() || null, distribuidora,
      usina_id: usinaId, consumo_medio_kwh: consumoMedioKwh,
      modalidade_faturamento: modalidade, desconto_percentual: descontoPercentual, percentual_rateio: null, status: "ATIVO",
    };

    let clienteId: string | undefined;
    if (cpfLimpo) {
      const { data: existente } = await supabase.from("clientes").select("id").eq("cpf", cpfLimpo).limit(1).maybeSingle();
      if (existente) {
        const { data, error } = await supabase.from("clientes").update(dados).eq("id", existente.id).select("id").single();
        if (error) { setSalvando(false); return Alert.alert("Não foi possível salvar", error.message); }
        clienteId = data.id;
      }
    }

    if (!clienteId) {
      const { data, error } = await supabase.from("clientes").insert(dados).select("id").single();
      if (error) { setSalvando(false); return Alert.alert("Não foi possível salvar", error.message); }
      clienteId = data.id;
    }

    let revisarAlocacao = false;
    let unidadeAlocadaId = "";
    if (uc && usinaId) {
      try {
        const alocacao = await alocarUnidade(usinaId, {
          clienteId, numero: uc, modalidade, percentual: 100, desconto: descontoPercentual,
          consumoMedio: consumoMedioKwh,
          percentualRepasseDisponibilidade: repasseDisponibilidadeGD2 === "REPASSAR" ? 100 : 0,
          repassarCustoDisponibilidadeGD1: repasseDisponibilidadeGD1 === "REPASSAR",
          repassarCustoDisponibilidadeGD2: repasseDisponibilidadeGD2 === "REPASSAR",
          repassarDiferencaFioBGD2: repasseFioBGD2 === "REPASSAR",
          tipoGd: tipoGdImportado,
          faturaSomenteAndrade: formatoFatura === "SOMENTE_ANDRADE",
          calcularAutomaticamente: true,
        });
        unidadeAlocadaId = String(alocacao?.unidadeId ?? "");
        revisarAlocacao = origem === "fatura";
      } catch (erro: any) {
        setSalvando(false);
        return Alert.alert("Consumidor salvo", erro?.response?.data?.message ?? erro?.message ?? "Não foi possível alocar a UC na usina.");
      }
    }

    setSalvando(false);
    if (revisarAlocacao) {
      router.replace({
        pathname: "/unidades/editar",
        params: {
          id: unidadeAlocadaId,
          numero: uc,
          clienteId,
          consumoMedio: String(consumoMedioKwh),
          usinaId,
          modalidade,
          desconto: String(descontoPercentual),
          tipoGd: tipoGdImportado ?? "",
        },
      });
    } else {
      router.back();
    }
  }

  return <Screen>{IS_GERADOR_APP ? <AppHeader variant="subpage" title="Novo consumidor" subtitle="Cadastro da carteira" contextTitle="Novo consumidor" contextSubtitle={origem === "fatura" ? "Dados lidos da conta de energia" : "Cadastro manual"} icon="person-add-outline" /> : null}<ScrollView contentContainerStyle={styles.content} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
    <Text style={styles.eyebrow}>{origem === "fatura" ? "DADOS LIDOS DA FATURA" : "CADASTRO MANUAL"}</Text>
    <Text style={styles.title}>Novo consumidor</Text>
    <Text style={styles.subtitle}>{origem === "fatura" ? "Confira os dados extraídos antes de salvar." : "Somente o nome é obrigatório. Os demais dados podem ser preenchidos depois."}</Text>
    {usinaNomeFinal ? <View style={styles.plantContext}><Text style={styles.plantLabel}>SERÁ ALOCADO NA USINA</Text><Text style={styles.plantName}>{usinaNomeFinal}</Text></View> : null}
    <Card>
      <FormField label="Nome (obrigatório)" value={nome} onChangeText={setNome} />
      <FormField label="CPF / CNPJ (opcional)" value={cpf} onChangeText={(valor) => setCpf(valor.replace(/\D/g, ""))} keyboardType="numeric" />
      <FormField label="E-mail (opcional)" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <FormField label="Telefone / WhatsApp (opcional)" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" />
      <FormField label="Unidade consumidora (opcional)" value={uc} onChangeText={(valor) => setUc(valor.replace(/\D/g, ""))} keyboardType="numeric" />
      {uc ? <View style={styles.usinaField}><Text style={styles.usinaLabel}>Usina que atenderá esta UC</Text><View style={styles.usinaOptions}>{usinas.map((item) => <Pressable key={item.id} onPress={() => setUsinaEscolhida(item.id)} style={[styles.usinaOption, usinaIdFinal === item.id && styles.usinaOptionSelected]}><Text style={[styles.usinaOptionText, usinaIdFinal === item.id && styles.usinaOptionTextSelected]}>{item.nome}</Text>{usinaIdFinal === item.id ? <Text style={styles.usinaCheck}>✓</Text> : null}</Pressable>)}</View>{!usinas.length && !usinaIdFinal ? <Text style={styles.usinaHint}>Cadastre ou selecione uma usina antes de salvar esta UC.</Text> : null}</View> : null}
      <ChoiceField label="Modalidade de faturamento" value={modalidade} onChange={setModalidade} options={[{ label: "Por injeção", value: "INJECAO" }, { label: "Por compensação", value: "COMPENSACAO" }]} />
      <FormField label="Consumo médio mensal (kWh)" value={consumoMedio} onChangeText={(valor) => setConsumoMedio(valor.replace(/[^\d,.]/g, ""))} keyboardType="decimal-pad" />
      {uc ? <>
        <FormField label="Desconto contratado (%)" value={desconto} onChangeText={setDesconto} keyboardType="decimal-pad" />
        <ChoiceField label="Formato da cobrança" value={formatoFatura} onChange={(valor) => setFormatoFatura(valor as FormatoFatura)} options={[{ label: "Fatura unificada (CEMIG + Andrade)", value: "UNIFICADA" }, { label: "Somente Andrade Energy", value: "SOMENTE_ANDRADE" }]} />
        {formatoFatura === "UNIFICADA" ? <>
          {!tipoGdImportado || tipoGdImportado === "GD1" || tipoGdImportado === "MISTA" ? <ChoiceField label="GD I: custo de disponibilidade" value={repasseDisponibilidadeGD1} onChange={(valor) => setRepasseDisponibilidadeGD1(valor as RepasseGD)} options={[{ label: "Repassar ao cliente", value: "REPASSAR" }, { label: "Absorver pela Andrade", value: "ABSORVER" }]} /> : null}
          {!tipoGdImportado || tipoGdImportado === "GD2" || tipoGdImportado === "MISTA" ? <>
            <ChoiceField label="GD II: custo de disponibilidade" value={repasseDisponibilidadeGD2} onChange={(valor) => setRepasseDisponibilidadeGD2(valor as RepasseGD)} options={[{ label: "Repassar ao cliente", value: "REPASSAR" }, { label: "Absorver pela Andrade", value: "ABSORVER" }]} />
            <ChoiceField label="GD II: diferença do Fio B" value={repasseFioBGD2} onChange={(valor) => setRepasseFioBGD2(valor as RepasseGD)} options={[{ label: "Repassar ao cliente", value: "REPASSAR" }, { label: "Absorver pela Andrade", value: "ABSORVER" }]} />
          </> : null}
          <RealDiscountInfo descontoPercentual={desconto} tipoGd={tipoGdImportado} modalidadeFaturamento={modalidade} dadosFatura={dadosFatura} disponibilidadeGd1={repasseDisponibilidadeGD1} disponibilidadeGd2={repasseDisponibilidadeGD2} fioBGd2={repasseFioBGD2} />
        </> : null}
      </> : null}
      <FormField label="Concessionária" value={distribuidora} onChangeText={setDistribuidora} />
      <FormField label="Endereço (opcional)" value={endereco} onChangeText={setEndereco} />
      <Button disabled={salvando} title={salvando ? "Salvando..." : "Salvar consumidor"} onPress={salvar} />
    </Card>
  </ScrollView></Screen>;
}

function parseDadosFatura(valor?: string) {
  try { return valor ? JSON.parse(valor) : null; }
  catch { return null; }
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl }, eyebrow: { color: Colors.primary, fontSize: Typography.small, fontWeight: "800", letterSpacing: 1.2 }, title: { marginTop: Spacing.xs, color: Colors.text, fontSize: Typography.title, fontWeight: "800" }, subtitle: { marginTop: Spacing.sm, marginBottom: Spacing.lg, color: Colors.subtitle, lineHeight: 21 }, plantContext: { marginBottom: Spacing.md, padding: Spacing.sm, borderLeftWidth: 3, borderLeftColor: Colors.primary }, plantLabel: { color: Colors.subtitle, fontSize: 10, fontWeight: "800", letterSpacing: 0.8 }, plantName: { marginTop: 3, color: Colors.text, fontWeight: "800" }, usinaField: { marginTop: -Spacing.sm, marginBottom: Spacing.md }, usinaLabel: { marginBottom: Spacing.xs, color: Colors.text, fontSize: Typography.caption, fontWeight: "700" }, usinaOptions: { gap: Spacing.xs }, usinaOption: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, backgroundColor: Colors.surface }, usinaOptionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight }, usinaOptionText: { flex: 1, color: Colors.text, fontSize: Typography.small, fontWeight: "600" }, usinaOptionTextSelected: { color: Colors.primaryDark, fontWeight: "800" }, usinaCheck: { marginLeft: Spacing.sm, color: Colors.primaryDark, fontWeight: "900" }, usinaHint: { marginTop: Spacing.xs, color: Colors.subtitle, fontSize: Typography.small },
});
