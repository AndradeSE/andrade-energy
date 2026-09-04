import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import ChoiceField from "../../components/cadastro/ChoiceField";
import FormField from "../../components/cadastro/FormField";
import RealDiscountInfo from "../../components/cadastro/RealDiscountInfo";
import UsinaSelector from "../../components/cadastro/UsinaSelector";
import { AppHeader, Button, Card, ElasticScrollView as ScrollView, Screen } from "../../components/ui";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { alocarUnidade, listarUsinas } from "../../services/usinas.service";
import { calcularMediaConsumoFatura, listarFaturas } from "../../services/faturas.service";
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

function producaoParaAlocacao(usina: any) {
  const producaoEmDozeMeses = numeroSeguro(usina?.producao_media_12_meses);
  return producaoEmDozeMeses > 0
    ? producaoEmDozeMeses
    : Math.max(0, numeroSeguro(usina?.geracao_media));
}

function percentualPelaMedia(usina: any, consumo: unknown, modalidade: Modalidade) {
  if (modalidade === "INJECAO") return "100";
  const producao = producaoParaAlocacao(usina);
  const media = numeroSeguro(consumo);
  return producao > 0 && media > 0
    ? String(Math.min(100, media * 1.15 / producao * 100).toFixed(2)).replace(".", ",")
    : "";
}

export default function NovaUnidade() {
  const { origem, classificacao, cliente, clienteId: clienteIdVinculado, uc, cpf: cpfImportado, energiaCompensada, endereco: enderecoImportado, cadastroRapido, consumoMedio: consumoMedioImportado, dadosFatura: dadosFaturaParam } = useLocalSearchParams<{ origem?: string; classificacao?: string; cliente?: string; clienteId?: string; uc?: string; cpf?: string; energiaCompensada?: string; endereco?: string; cadastroRapido?: string; consumoMedio?: string; dadosFatura?: string }>();
  const [dadosFatura, setDadosFatura] = useState<Record<string, any> | null>(() => parseDadosFatura(dadosFaturaParam));
  const [numero, setNumero] = useState(""); const [titular, setTitular] = useState("");
  const [cpfTitular, setCpfTitular] = useState("");
  const [tipo, setTipo] = useState<Tipo>("BENEFICIARIA"); const [modalidade, setModalidade] = useState<Modalidade>("COMPENSACAO");
  const [desconto, setDesconto] = useState("40"); const [endereco, setEndereco] = useState("");
  const [consumoMedio, setConsumoMedio] = useState(consumoMedioImportado ?? "");
  const [formatoFatura, setFormatoFatura] = useState<FormatoFatura>("UNIFICADA");
  const [repasseDisponibilidadeGD1, setRepasseDisponibilidadeGD1] = useState<RepasseGD2>("REPASSAR");
  const [repasseDisponibilidadeGD2, setRepasseDisponibilidadeGD2] = useState<RepasseGD2>("REPASSAR");
  const [repasseFioBGD2, setRepasseFioBGD2] = useState<RepasseGD2>("REPASSAR");
  const [clientes, setClientes] = useState<any[]>([]); const [usinas, setUsinas] = useState<any[]>([]);
  const [clienteId, setClienteId] = useState(""); const [usinaId, setUsinaId] = useState(""); const [percentualAlocado, setPercentualAlocado] = useState(""); const [salvando, setSalvando] = useState(false);
  const usinaSelecionada = usinas.find((item) => item.id === usinaId);
  const usinaGd2 = String(usinaSelecionada?.tipo_gd ?? "").toUpperCase() === "GD2";
  const tipoGdEfetivo = String(usinaSelecionada?.tipo_gd ?? "").toUpperCase();

  useEffect(() => {
    Promise.all([
      supabase.from("clientes").select("id,nome,cpf,endereco,distribuidora,usina_id,modalidade_faturamento,desconto_percentual,consumo_medio_kwh").order("nome"),
      listarUsinas(),
    ]).then(([c, u]) => {
      if (c.error) throw c.error;
      setClientes(c.data ?? []);
      setUsinas(Array.isArray(u) ? u : []);
    }).catch((erro: any) => {
      Alert.alert("Não foi possível carregar os dados", erro?.response?.data?.message ?? erro?.message ?? "Tente novamente.");
    });
    if (clienteIdVinculado) setClienteId(clienteIdVinculado);
    if (origem !== "fatura") return;
    const nomeExtraido = (cliente ?? "").trim();
    const rotuloDaFatura = /d[eé]bito\s+autom[aá]tico|valor\s+a\s+pagar|vencimento/i.test(nomeExtraido);
    const titularExtraido = rotuloDaFatura ? "" : nomeExtraido;
    setNumero((uc ?? "").replace(/\D/g, ""));
    if (cpfImportado) setCpfTitular(formatarDocumentoDaFatura(cpfImportado));
    if (titularExtraido) setTitular(titularExtraido);
    if (enderecoImportado) setEndereco(enderecoImportado);
    if (classificacao === "POSSIVEL_GERADORA") { setTipo("GERADORA"); setModalidade("INJECAO"); }
    // Uma conta trazida a partir do perfil de um cliente sempre precisa ser
    // configurada como UC beneficiária antes do primeiro salvamento, mesmo
    // quando a fatura ainda não possui linhas GD. Assim o gestor vê usina,
    // modalidade, alocação e desconto já nesta primeira tela.
    else if (clienteIdVinculado || cadastroRapido === "1") setTipo("BENEFICIARIA");
    else if (!Number(energiaCompensada)) setTipo("CONSUMIDORA");
  }, [cadastroRapido, classificacao, cliente, clienteIdVinculado, cpfImportado, enderecoImportado, energiaCompensada, origem, uc]);

  useEffect(() => {
    const mediaExtraida = calcularMediaConsumoFatura(dadosFatura);
    if (mediaExtraida > 0 && !numeroSeguro(consumoMedio)) setConsumoMedio(String(mediaExtraida));
  }, [consumoMedio, dadosFatura]);

  useEffect(() => {
    const clienteSelecionado = clientes.find((item) => item.id === clienteId);
    if (!clienteSelecionado) return;
    setTipo("BENEFICIARIA");
    if (!usinaId && clienteSelecionado.usina_id) setUsinaId(String(clienteSelecionado.usina_id));
    if (origem !== "fatura" && clienteSelecionado.cpf && !cpfTitular) setCpfTitular(formatarDocumento(clienteSelecionado.cpf));
    if (!numeroSeguro(consumoMedio) && numeroSeguro(clienteSelecionado.consumo_medio_kwh)) {
      setConsumoMedio(String(clienteSelecionado.consumo_medio_kwh));
    }
  }, [clienteId, clientes, consumoMedio, cpfTitular, origem, usinaId]);

  useEffect(() => {
    const usinaSelecionada = usinas.find((item) => item.id === usinaId);
    const sugestao = percentualPelaMedia(usinaSelecionada, consumoMedio, modalidade);
    setPercentualAlocado(sugestao);
  }, [consumoMedio, modalidade, usinaId, usinas]);

  useEffect(() => {
    let ativa = true;
    const numeroLimpo = numero.replace(/\D/g, "");
    const dadosImportados = parseDadosFatura(dadosFaturaParam);
    // A conta escolhida no perfil é a fonte desta inclusão. Não permita que
    // uma competência antiga já processada sobrescreva os dados recém-lidos.
    if (origem === "fatura" && dadosImportados && Object.keys(dadosImportados).length) {
      setDadosFatura(dadosImportados);
      return () => { ativa = false; };
    }
    if (!numeroLimpo && !clienteId) {
      if (!dadosFaturaParam) setDadosFatura(null);
      return () => { ativa = false; };
    }

    async function carregarBaseReal() {
      try {
        const faturasDaUc = numeroLimpo ? await listarFaturas(undefined, numeroLimpo) : [];
        const faturasDoCliente = !faturasDaUc.length && clienteId
          ? await listarFaturas(clienteId)
          : [];
        // Quando o usuário escolheu uma conta anexada, ela é a fonte desta
        // tela. Uma fatura já processada da UC/cliente não pode substituir o
        // PDF explicitamente selecionado.
        if (ativa) setDadosFatura(parseDadosFatura(dadosFaturaParam) ?? faturasDaUc[0] ?? faturasDoCliente[0] ?? null);
      } catch {
        if (ativa && !dadosFaturaParam) setDadosFatura(null);
      }
    }

    void carregarBaseReal();
    return () => { ativa = false; };
  }, [clienteId, dadosFaturaParam, numero, origem]);

  async function salvar() {
    const descontoNumero = numeroSeguro(desconto);
    const percentualRateio = numeroSeguro(percentualAlocado);
    const documentoTitular = cpfTitular.replace(/\D/g, "");
    const cadastroManualDoGerador = IS_GERADOR_APP && origem !== "fatura";
    const clienteSelecionado = clientes.find((item) => item.id === clienteId);
    const usinaFinal = usinaId || clienteSelecionado?.usina_id || null;
    // Modalidade e desconto pertencem à UC/contrato. Dados antigos no cliente
    // são apenas um fallback visual, nunca devem sobrescrever o que foi
    // configurado nesta fatura antes do primeiro salvamento.
    const modalidadeFinal = modalidade;
    const descontoFinal = descontoNumero;
    const mediaInformada = numeroSeguro(consumoMedio);
    const consumoMedioFinal = Math.max(0, mediaInformada > 0 ? mediaInformada : numeroSeguro(clienteSelecionado?.consumo_medio_kwh));

    if (!numero) return Alert.alert("Dados incompletos", "Informe o número da unidade consumidora.");
    if (tipo !== "GERADORA" && !clienteId) return Alert.alert("Escolha o cliente", "É necessário cadastrar e selecionar um cliente antes de adicionar a UC.");
    if (tipo === "BENEFICIARIA" && !usinaFinal) return Alert.alert("Escolha a usina", "Uma UC beneficiária precisa ser vinculada a uma usina antes de salvar.");
    if (tipo !== "BENEFICIARIA" && !usinaFinal) return Alert.alert("Dados incompletos", "Vincule esta unidade a uma usina.");
    if (cadastroManualDoGerador && ![11, 14].includes(documentoTitular.length)) {
      return Alert.alert("CPF obrigatório", "Informe o CPF do titular da conta de luz antes de salvar a unidade.");
    }
    if (!Number.isFinite(descontoNumero) || descontoNumero < 0 || descontoNumero > 100) return Alert.alert("Desconto inválido", "Informe um percentual entre 0 e 100.");
    if (tipo === "BENEFICIARIA" && (!Number.isFinite(percentualRateio) || percentualRateio <= 0 || percentualRateio > 100)) {
      return Alert.alert("Alocação inválida", "Informe um percentual entre 0,01% e 100% para esta UC.");
    }
    setSalvando(true);
    try {
      if (tipo === "BENEFICIARIA") {
        await alocarUnidade(String(usinaFinal), {
          clienteId,
          numero,
          modalidade: modalidadeFinal,
          percentual: modalidadeFinal === "INJECAO" ? 100 : percentualRateio,
          desconto: descontoFinal,
          consumoMedio: consumoMedioFinal,
          endereco: endereco.trim() || clienteSelecionado?.endereco || null,
          cpfTitular: documentoTitular || null,
          percentualRepasseDisponibilidade: repasseDisponibilidadeGD2 === "REPASSAR" ? 100 : 0,
          repassarCustoDisponibilidadeGD1: repasseDisponibilidadeGD1 === "REPASSAR",
          repassarCustoDisponibilidadeGD2: repasseDisponibilidadeGD2 === "REPASSAR",
          repassarDiferencaFioBGD2: repasseFioBGD2 === "REPASSAR",
          tipoGd: tipoGdEfetivo,
          faturaSomenteAndrade: formatoFatura === "SOMENTE_ANDRADE",
          calcularAutomaticamente: true,
        });
      } else {
        const { error } = await supabase.from("unidades_consumidoras").upsert({
          numero, titular: titular.trim() || clienteSelecionado?.nome || null, tipo, cliente_id: clienteId || null, usina_id: usinaFinal,
          distribuidora: clienteSelecionado?.distribuidora || "CEMIG", endereco: endereco.trim() || clienteSelecionado?.endereco || null, modalidade_faturamento: modalidadeFinal,
          desconto_percentual: descontoFinal, cpf_titular: documentoTitular || clienteSelecionado?.cpf || null, status: "ATIVA",
          percentual_repasse_disponibilidade: repasseDisponibilidadeGD2 === "REPASSAR" ? 100 : 0,
          repassar_disponibilidade_gd1: repasseDisponibilidadeGD1 === "REPASSAR",
          repassar_disponibilidade_gd2: repasseDisponibilidadeGD2 === "REPASSAR",
          repassar_diferenca_fio_b_gd2: repasseFioBGD2 === "REPASSAR",
          tipo_gd: ["GD1", "GD2", "MISTA"].includes(tipoGdEfetivo) ? tipoGdEfetivo : null,
          fatura_somente_andrade: formatoFatura === "SOMENTE_ANDRADE",
        }, { onConflict: "numero" });
        if (error) throw error;
      }

      if (origem === "fatura" && clienteId) {
        router.replace({
          pathname: "/clientes/[id]",
          params: { id: clienteId },
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
      {!clienteIdVinculado && cadastroRapido !== "1" ? <><FormField label="Titular" value={titular} onChangeText={setTitular} /><FormField label="Endereço" value={endereco} onChangeText={setEndereco} /></> : null}
      {tipo !== "GERADORA" ? <>
        <Text style={styles.configurationTitle}>CONFIGURAÇÃO DA UC</Text>
        <Text style={styles.beneficiariaHint}>Defina as condições desta unidade antes de salvar. Elas não são copiadas do cadastro do cliente.</Text>
        <ChoiceField label="Faturamento" value={modalidade} onChange={(valor) => setModalidade(valor as Modalidade)} options={[{ label: "Injeção", value: "INJECAO" }, { label: "Compensação", value: "COMPENSACAO" }]} />
        <UsinaSelector usinas={usinas} value={usinaId} onChange={(valor) => { setUsinaId(valor); const selecionada = usinas.find((item) => item.id === valor); setPercentualAlocado(percentualPelaMedia(selecionada, consumoMedio, modalidade)); }} label="Usina geradora" />
        <FormField label="Consumo médio mensal (kWh)" value={consumoMedio} onChangeText={(valor) => { const limpo = valor.replace(/[^\d,.]/g, ""); setConsumoMedio(limpo); setPercentualAlocado(percentualPelaMedia(usinas.find((item) => item.id === usinaId), limpo, modalidade)); }} keyboardType="decimal-pad" />
        <FormField label="Percentual alocado (%)" value={percentualAlocado} onChangeText={(valor) => setPercentualAlocado(valor.replace(/[^\d,.]/g, ""))} keyboardType="decimal-pad" />
        <Text style={styles.beneficiariaHint}>{modalidade === "INJECAO" ? "Para injeção, a alocação inicial é 100%. Você pode editar antes de salvar." : "A sugestão considera 115% do consumo médio sobre a produção média disponível da usina. Você pode editar."}</Text>
        <FormField label="Desconto contratado (%)" value={desconto} onChangeText={(valor) => setDesconto(valor.replace(/[^\d,.]/g, ""))} keyboardType="decimal-pad" />
      </> : <UsinaSelector usinas={usinas} value={usinaId} onChange={setUsinaId} label="Usina geradora" />}
      {!clienteIdVinculado ? <><Text style={styles.label}>Vincular ao cliente *</Text>{clientes.length ? <View style={styles.options}>{clientes.map((c) => <Pressable key={c.id} onPress={() => setClienteId(clienteId === c.id ? "" : c.id)} style={[styles.link, clienteId === c.id && styles.linkSelected]}><Text>{c.nome}</Text></Pressable>)}</View> : <Text style={styles.clientRequired}>Cadastre um cliente antes de adicionar uma unidade consumidora.</Text>}</> : null}
      <ChoiceField label="Formato da cobrança" value={formatoFatura} onChange={(valor) => setFormatoFatura(valor as FormatoFatura)} options={[{ label: "Fatura Unificada Andrade Energy", value: "UNIFICADA" }, { label: "Somente Andrade Energy", value: "SOMENTE_ANDRADE" }]} />
      <>
        <Text style={styles.beneficiariaHint}>{tipoGdEfetivo ? `Modalidade identificada: ${tipoGdEfetivo === "GD2" ? "GD II" : tipoGdEfetivo === "MISTA" ? "GD I + GD II" : "GD I"}${usinaGd2 ? ", definida automaticamente pela usina selecionada" : ""}.` : "Modalidade GD ainda não identificada. As configurações podem ser preparadas; a projeção ficará em 0% até chegar uma leitura GD."}</Text>
        {!tipoGdEfetivo || tipoGdEfetivo === "GD1" || tipoGdEfetivo === "MISTA" ? <ChoiceField label="GD I: custo de disponibilidade recalculado" value={repasseDisponibilidadeGD1} onChange={(valor) => setRepasseDisponibilidadeGD1(valor as RepasseGD2)} options={[{ label: "Repassar ao cliente", value: "REPASSAR" }, { label: "Absorver pela Andrade", value: "ABSORVER" }]} /> : null}
        {!tipoGdEfetivo || tipoGdEfetivo === "GD2" || tipoGdEfetivo === "MISTA" ? <>
          <ChoiceField label="GD II: custo de disponibilidade recalculado" value={repasseDisponibilidadeGD2} onChange={(valor) => setRepasseDisponibilidadeGD2(valor as RepasseGD2)} options={[{ label: "Repassar ao cliente", value: "REPASSAR" }, { label: "Absorver pela Andrade", value: "ABSORVER" }]} />
          <ChoiceField label="GD II: diferença do Fio B" value={repasseFioBGD2} onChange={(valor) => setRepasseFioBGD2(valor as RepasseGD2)} options={[{ label: "Repassar ao cliente", value: "REPASSAR" }, { label: "Absorver pela Andrade", value: "ABSORVER" }]} />
        </> : null}
        <Text style={styles.beneficiariaHint}>{formatoFatura === "SOMENTE_ANDRADE" ? "Mesmo com documentos separados, a projeção considera também o valor que continuará sendo pago à concessionária." : "Os demais encargos continuam na fatura da concessionária."}</Text>
        <RealDiscountInfo
          descontoPercentual={desconto}
          tipoGd={tipoGdEfetivo}
          modalidadeFaturamento={modalidade}
          consumoProjetado={consumoMedio}
          energiaInjetadaProjetada={modalidade === "INJECAO"
            ? producaoParaAlocacao(usinaSelecionada) * numeroSeguro(percentualAlocado) / 100
            : 0}
          faturaSomenteAndrade={formatoFatura === "SOMENTE_ANDRADE"}
          dadosFatura={dadosFatura}
          projetarConsumoIntegral={origem === "fatura"}
          tarifaSceeReferencia={numeroSeguro(usinaSelecionada?.tarifa_scee_referencia)}
          tarifaGd2Referencia={numeroSeguro(usinaSelecionada?.tarifa_gd2_referencia)}
          historicoTarifasGd2={Array.isArray(usinaSelecionada?.historico_tarifas_gd2) ? usinaSelecionada.historico_tarifas_gd2 : []}
          disponibilidadeGd1={repasseDisponibilidadeGD1}
          disponibilidadeGd2={repasseDisponibilidadeGD2}
          fioBGd2={repasseFioBGD2}
        />
      </>
      <Button disabled={salvando || (tipo !== "GERADORA" && !clienteId)} title={salvando ? "Salvando..." : "Salvar unidade"} onPress={salvar} />
    </Card>
  </ScrollView></Screen>;
}

function parseDadosFatura(valor?: string) {
  try {
    if (!valor) return null;
    const lido = JSON.parse(valor);
    return lido?.dadosFatura ?? lido?.dados_fatura ?? lido?.dadosExtraidos ?? lido?.dados_extraidos ?? lido?.dados ?? lido;
  }
  catch { return null; }
}

function formatarDocumento(valor: string) {
  const numeros = valor.replace(/\D/g, "").slice(0, 14);
  if (numeros.length <= 11) return numeros.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  return numeros.replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function formatarDocumentoDaFatura(valor: string) {
  const primeirosQuatro = valor.replace(/\D/g, "").slice(0, 4);
  return primeirosQuatro ? `${primeirosQuatro}.***.***-**` : "";
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl }, eyebrow: { color: Colors.primary, fontSize: Typography.small, fontWeight: "700", letterSpacing: 1.2 },
  title: { marginTop: Spacing.xs, color: Colors.text, fontSize: Typography.title, fontWeight: "700" }, subtitle: { marginTop: Spacing.sm, marginBottom: Spacing.lg, color: Colors.subtitle, lineHeight: 21 },
  label: { marginBottom: Spacing.xs, color: Colors.text, fontSize: Typography.caption, fontWeight: "700" }, configurationTitle: { marginTop: Spacing.sm, marginBottom: Spacing.xs, color: Colors.primary, fontSize: Typography.small, fontWeight: "900", letterSpacing: 1 }, beneficiariaHint: { marginTop: -Spacing.sm, marginBottom: Spacing.md, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 18 }, options: { gap: Spacing.xs, marginBottom: Spacing.md },
  clientRequired: { marginBottom: Spacing.md, padding: Spacing.md, borderRadius: Radius.md, color: "#92400E", backgroundColor: "#FEF3C7", fontSize: Typography.small, lineHeight: 18 },
  link: { padding: Spacing.sm, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.surface }, linkSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
});
