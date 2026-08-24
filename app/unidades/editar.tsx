import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import ChoiceField from "../../components/cadastro/ChoiceField";
import FormField from "../../components/cadastro/FormField";
import RealDiscountInfo from "../../components/cadastro/RealDiscountInfo";
import { AppHeader, Button, Card, ElasticScrollView as ScrollView, Loading, Screen } from "../../components/ui";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { buscarCliente, buscarUnidade } from "../../services/clientes.service";
import { alocarUnidade, listarUsinas } from "../../services/usinas.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";

type Modalidade = "INJECAO" | "COMPENSACAO";
type FormatoFatura = "UNIFICADA" | "SOMENTE_ANDRADE";
type RepasseGD2 = "REPASSAR" | "ABSORVER";

function textoDoParametro(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? String(valor[0] ?? "") : String(valor ?? "");
}

function eUuid(valor: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor);
}

function valorNumerico(valor: unknown) {
  const texto = String(valor ?? "").trim();
  if (!texto) return 0;
  const normalizado = texto.includes(",")
    ? texto.replace(/\./g, "").replace(",", ".")
    : texto;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}

function producaoParaAlocacao(usina: any) {
  const historico = valorNumerico(usina?.producao_media_12_meses);
  return historico > 0
    ? historico
    : Math.max(0, valorNumerico(usina?.geracao_media));
}

function textoProducao(usina: any) {
  const possuiHistorico = valorNumerico(usina?.producao_media_12_meses) > 0;
  const origem = possuiHistorico
    ? "Média de produção em 12 meses"
    : "Produção média cadastrada";
  return origem + ": " + producaoParaAlocacao(usina).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  }) + " kWh/mês";
}

function percentualPelaMedia(
  usina: any,
  consumo: string,
  modalidade: Modalidade
) {
  if (modalidade === "INJECAO") return "100";
  const producao = producaoParaAlocacao(usina);
  const media = valorNumerico(consumo);
  return producao > 0 && media > 0
    ? String(Math.min(100, media * 1.15 / producao * 100).toFixed(2)).replace(".", ",")
    : "";
}

export default function EditarAlocacaoUnidade() {
  const {
    id: unidadeIdImportada,
    numero,
    clienteId,
    consumoMedio: consumoMedioImportado,
    usinaId: usinaIdImportada,
    modalidade: modalidadeImportada,
    desconto: descontoImportado,
    tipoGd: tipoGdImportado,
  } = useLocalSearchParams<{
    id?: string;
    numero: string;
    clienteId: string;
    consumoMedio?: string;
    usinaId?: string;
    modalidade?: Modalidade;
    desconto?: string;
    tipoGd?: string;
  }>();
  const [usinas, setUsinas] = useState<any[]>([]); const [usinaId, setUsinaId] = useState("");
  const [modalidade, setModalidade] = useState<Modalidade>("COMPENSACAO"); const [percentual, setPercentual] = useState("");
  const [desconto, setDesconto] = useState("40"); const [consumoMedio, setConsumoMedio] = useState("0");
  const [formatoFatura, setFormatoFatura] = useState<FormatoFatura>("UNIFICADA");
  const [repasseDisponibilidadeGD1, setRepasseDisponibilidadeGD1] = useState<RepasseGD2>("REPASSAR");
  const [repasseDisponibilidadeGD2, setRepasseDisponibilidadeGD2] = useState<RepasseGD2>("REPASSAR");
  const [repasseFioBGD2, setRepasseFioBGD2] = useState<RepasseGD2>("REPASSAR");
  const [tipoGd, setTipoGd] = useState("");
  const [clienteIdResolvido, setClienteIdResolvido] = useState("");
  const [loading, setLoading] = useState(true); const [salvando, setSalvando] = useState(false);

  const numeroDaUc = textoDoParametro(numero).replace(/\D/g, "");
  const clienteIdRecebido = textoDoParametro(clienteId);
  const unidadeIdRecebida = textoDoParametro(unidadeIdImportada);

  useEffect(() => {
    let ativa = true;

    async function carregar() {
      try {
        // A UC é carregada pelo backend, que usa a chave de serviço e os
        // vínculos reais. Assim a tela não depende de policy RLS do cliente.
        const consultaUnidade = eUuid(unidadeIdRecebida)
          ? buscarUnidade(unidadeIdRecebida).catch(() => null)
          : Promise.resolve(null);
        const [lista, unidade] = await Promise.all([listarUsinas(), consultaUnidade]);
        const uc = unidade;
        const idCliente = eUuid(clienteIdRecebido)
          ? clienteIdRecebido
          : eUuid(String(uc?.cliente_id ?? ""))
            ? String(uc.cliente_id)
            : "";
        const cliente = idCliente ? await buscarCliente(idCliente) : null;
        if (!ativa) return;

        const c = cliente;
        const usinaPreferida = usinaIdImportada || uc?.usina_id || c?.usina_id || "";
        const porChave = new Map<string, any>();

        for (const usina of lista ?? []) {
          const chave = String(usina.numero_instalacao ?? usina.nome)
            .replace(/\W/g, "")
            .toLowerCase();
          if (!porChave.has(chave) || usina.id === usinaPreferida) {
            porChave.set(chave, usina);
          }
        }

        const listaUsinas = [...porChave.values()];
        const modalidadeFinal = String(
          modalidadeImportada ||
          uc?.modalidade_faturamento ||
          c?.modalidade_faturamento ||
          "COMPENSACAO"
        ).toUpperCase() as Modalidade;
        const mediaImportada = valorNumerico(consumoMedioImportado);
        const mediaFinal = mediaImportada > 0
          ? mediaImportada
          : valorNumerico(uc?.consumo_medio_kwh ?? c?.consumo_medio_kwh);
        const usinaSelecionada = listaUsinas.find((item) => item.id === usinaPreferida);
        const percentualSalvo = uc?.percentual_rateio ?? c?.percentual_rateio;
        const veioDaFatura = mediaImportada > 0 || Boolean(usinaIdImportada) || Boolean(modalidadeImportada);

        setUsinas(listaUsinas);
        setClienteIdResolvido(idCliente);
        setUsinaId(usinaPreferida);
        setModalidade(modalidadeFinal);
        setDesconto(String(descontoImportado ?? uc?.desconto_percentual ?? c?.desconto_percentual ?? 40));
        setFormatoFatura(uc?.fatura_somente_andrade ? "SOMENTE_ANDRADE" : "UNIFICADA");
        setRepasseDisponibilidadeGD1((uc?.repassar_disponibilidade_gd1 ?? Number(uc?.percentual_repasse_disponibilidade ?? 100) > 0) ? "REPASSAR" : "ABSORVER");
        setRepasseDisponibilidadeGD2((uc?.repassar_disponibilidade_gd2 ?? Number(uc?.percentual_repasse_disponibilidade ?? 100) > 0) ? "REPASSAR" : "ABSORVER");
        setRepasseFioBGD2((uc?.repassar_diferenca_fio_b_gd2 ?? true) ? "REPASSAR" : "ABSORVER");
        setTipoGd(String(tipoGdImportado || uc?.tipo_gd || "").toUpperCase());
        setConsumoMedio(mediaFinal > 0 ? String(Math.round(mediaFinal)) : "");
        setPercentual(
          veioDaFatura
            ? percentualPelaMedia(usinaSelecionada, String(mediaFinal), modalidadeFinal)
            : modalidadeFinal === "INJECAO" && (percentualSalvo === null || percentualSalvo === undefined)
              ? "100"
            : percentualSalvo === null || percentualSalvo === undefined
              ? ""
              : String(percentualSalvo)
        );
      } catch (erro: any) {
        if (!ativa) return;
        Alert.alert("Não foi possível carregar as usinas", erro?.message ?? "Tente novamente.");
      } finally {
        if (ativa) setLoading(false);
      }
    }

    void carregar();
    return () => { ativa = false; };
  }, [clienteIdRecebido, consumoMedioImportado, descontoImportado, modalidadeImportada, numeroDaUc, tipoGdImportado, unidadeIdRecebida, usinaIdImportada]);

  async function salvar() {
    const rateio = valorNumerico(percentual); const descontoNumero = valorNumerico(desconto); const media = Math.max(0, valorNumerico(consumoMedio));
    if (!clienteIdResolvido) return Alert.alert("Vincule a UC a um cliente", "Esta UC ainda não tem um cliente vinculado. Volte ao cadastro da unidade, escolha o cliente e salve antes de fazer a alocação.");
    if (!usinaId) return Alert.alert("Escolha a usina", "Selecione a usina que fornecerá energia para esta UC.");
    if (!Number.isFinite(rateio) || rateio <= 0 || rateio > 100) return Alert.alert("Percentual inválido", "Informe um percentual entre 0,01% e 100%.");
    if (!Number.isFinite(descontoNumero) || descontoNumero < 0 || descontoNumero > 100) return Alert.alert("Desconto inválido", "Informe um desconto entre 0% e 100%.");
    try { setSalvando(true);
      await alocarUnidade(usinaId, { clienteId: clienteIdResolvido, numero: numeroDaUc, modalidade, percentual: rateio, desconto: descontoNumero, consumoMedio: media, percentualRepasseDisponibilidade: repasseDisponibilidadeGD2 === "REPASSAR" ? 100 : 0, repassarCustoDisponibilidadeGD1: repasseDisponibilidadeGD1 === "REPASSAR", repassarCustoDisponibilidadeGD2: repasseDisponibilidadeGD2 === "REPASSAR", repassarDiferencaFioBGD2: repasseFioBGD2 === "REPASSAR", tipoGd, faturaSomenteAndrade: formatoFatura === "SOMENTE_ANDRADE", calcularAutomaticamente: false });
      Alert.alert("Alocação salva", "A UC foi vinculada à usina com sucesso.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (erro: any) { Alert.alert("Não foi possível alocar", erro?.message ?? "Tente novamente."); } finally { setSalvando(false); }
  }

  if (loading) return <Loading />;

  const usinaSelecionada = usinas.find((usina) => usina.id === usinaId);
  const semProducaoParaSugestao =
    modalidade === "COMPENSACAO" &&
    valorNumerico(consumoMedio) > 0 &&
    producaoParaAlocacao(usinaSelecionada) <= 0;

  return (
    <Screen>
      {IS_GERADOR_APP ? (
        <AppHeader
          variant="subpage"
          title="Editar unidade"
          subtitle="Alocação e faturamento"
          contextTitle={"UC " + numeroDaUc}
          contextSubtitle="Alocação e faturamento"
          icon="flash-outline"
        />
      ) : null}
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>UNIDADE CONSUMIDORA</Text>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Configurar unidade</Text>
          <View style={styles.unitChip}>
            <Text numberOfLines={1} style={styles.unitChipText}>UC {numeroDaUc}</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          Defina a usina, a média de consumo e o rateio desta UC.
        </Text>
        <Card>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionEyebrow}>USINA GERADORA</Text>
            <Text style={styles.label}>Escolha a usina</Text>
          </View>
          <View style={styles.options}>
            {usinas.map((usina) => (
              <Pressable
                key={usina.id}
                onPress={() => {
                  setUsinaId(usina.id);
                  setPercentual(percentualPelaMedia(usina, consumoMedio, modalidade));
                }}
                style={[styles.option, usinaId === usina.id && styles.selected]}
              >
                <View style={styles.optionCopy}>
                  <Text style={styles.optionName}>{usina.nome}</Text>
                  <Text style={styles.optionDetail}>{textoProducao(usina)}</Text>
                </View>
                {usinaId === usina.id ? (
                  <View style={styles.selectionChip}>
                    <Text style={styles.selectionChipText}>✓ Selecionada</Text>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>

          <ChoiceField
            label="Modalidade"
            value={modalidade}
            onChange={(novaModalidade) => {
              setModalidade(novaModalidade);
              setPercentual(
                percentualPelaMedia(usinaSelecionada, consumoMedio, novaModalidade)
              );
            }}
            options={[
              { label: "Por injeção", value: "INJECAO" },
              { label: "Por compensação", value: "COMPENSACAO" },
            ]}
          />
          <FormField
            label="Média de consumo em 12 meses (kWh)"
            value={consumoMedio}
            onChangeText={(valor) => {
              const limpa = valor.replace(/[^\d,.]/g, "");
              setConsumoMedio(limpa);
              setPercentual(percentualPelaMedia(usinaSelecionada, limpa, modalidade));
            }}
            keyboardType="decimal-pad"
          />
          <FormField
            label="Percentual alocado (%)"
            value={percentual}
            onChangeText={(valor) => setPercentual(valor.replace(/[^\d,.]/g, ""))}
            keyboardType="decimal-pad"
          />
          <Text style={styles.hint}>
            {modalidade === "INJECAO"
              ? "Para injeção, a alocação inicial é 100%. Você pode editar antes de salvar."
              : "Para compensação, a sugestão é calculada pela média de consumo desta UC dividida pela produção média disponível da usina. Você pode editar."}
          </Text>
          {!clienteIdResolvido ? (
            <Text style={styles.warning}>
              Esta UC ainda não está vinculada a um cliente. Escolha o cliente no cadastro da unidade antes de salvar a alocação.
            </Text>
          ) : null}
          {semProducaoParaSugestao ? (
            <Text style={styles.warning}>
              Ainda não há produção média cadastrada para esta usina. Informe a geração média da usina ou ajuste o percentual manualmente.
            </Text>
          ) : null}
          <FormField
            label="Desconto contratado (%)"
            value={desconto}
            onChangeText={(valor) => setDesconto(valor.replace(/[^\d,.]/g, ""))}
            keyboardType="decimal-pad"
          />
          <ChoiceField
            label="Formato da cobrança"
            value={formatoFatura}
            onChange={(valor) => setFormatoFatura(valor as FormatoFatura)}
            options={[
              { label: "Fatura unificada (CEMIG + Andrade)", value: "UNIFICADA" },
              { label: "Somente Andrade Energy", value: "SOMENTE_ANDRADE" },
            ]}
          />
          {formatoFatura === "UNIFICADA" ? <>
            {!tipoGd || tipoGd === "GD1" || tipoGd === "MISTA" ? <ChoiceField
              label="GD I: custo de disponibilidade recalculado"
              value={repasseDisponibilidadeGD1}
              onChange={(valor) => setRepasseDisponibilidadeGD1(valor as RepasseGD2)}
              options={[{ label: "Repassar ao cliente", value: "REPASSAR" }, { label: "Absorver pela Andrade", value: "ABSORVER" }]}
            /> : null}
            {!tipoGd || tipoGd === "GD2" || tipoGd === "MISTA" ? <>
            <ChoiceField
              label="GD II: custo de disponibilidade recalculado"
              value={repasseDisponibilidadeGD2}
              onChange={(valor) => setRepasseDisponibilidadeGD2(valor as RepasseGD2)}
              options={[{ label: "Repassar ao cliente", value: "REPASSAR" }, { label: "Absorver pela Andrade", value: "ABSORVER" }]}
            />
            <ChoiceField
              label="GD II: diferença do Fio B"
              value={repasseFioBGD2}
              onChange={(valor) => setRepasseFioBGD2(valor as RepasseGD2)}
              options={[{ label: "Repassar ao cliente", value: "REPASSAR" }, { label: "Absorver pela Andrade", value: "ABSORVER" }]}
            />
            </> : null}
            <Text style={styles.hint}>
              A disponibilidade é aplicada conforme a modalidade GD identificada na conta; a diferença do Fio B vale somente para GD II. Os demais encargos continuam na conta da concessionária.
            </Text>
            <RealDiscountInfo
              descontoPercentual={desconto}
              tipoGd={tipoGd}
              disponibilidadeGd1={repasseDisponibilidadeGD1}
              disponibilidadeGd2={repasseDisponibilidadeGD2}
              fioBGd2={repasseFioBGD2}
            />
          </> : null}
          <Button
            disabled={salvando || !clienteIdResolvido}
            title={salvando ? "Salvando..." : clienteIdResolvido ? "Salvar alocação da UC" : "Vincule um cliente para alocar"}
            onPress={salvar}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  eyebrow: { color: Colors.primary, fontSize: Typography.small, fontWeight: "800", letterSpacing: 1.1 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.sm, marginTop: Spacing.xs },
  title: { flex: 1, color: Colors.text, fontSize: Typography.title, fontWeight: "900" },
  unitChip: { maxWidth: "46%", paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: Radius.round, backgroundColor: Colors.primaryLight },
  unitChipText: { color: Colors.primaryDark, fontSize: Typography.caption, fontWeight: "800" },
  subtitle: { marginTop: Spacing.xs, marginBottom: Spacing.lg, color: Colors.subtitle },
  sectionHeading: { marginBottom: Spacing.sm },
  sectionEyebrow: { marginBottom: 3, color: Colors.subtitle, fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  label: { marginBottom: Spacing.xs, color: Colors.text, fontWeight: "700" },
  options: { gap: Spacing.xs, marginBottom: Spacing.lg },
  option: { minHeight: 62, flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: Spacing.sm, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.surface },
  selected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  optionCopy: { flex: 1, minWidth: 0 },
  optionName: { color: Colors.text, fontWeight: "800" },
  optionDetail: { marginTop: 3, color: Colors.subtitle, fontSize: Typography.small },
  selectionChip: { flexShrink: 0, marginLeft: Spacing.sm, paddingHorizontal: Spacing.sm, paddingVertical: 5, borderRadius: Radius.round, backgroundColor: Colors.primary },
  selectionChipText: { color: Colors.surface, fontSize: 10, fontWeight: "900" },
  hint: { marginTop: -Spacing.sm, marginBottom: Spacing.md, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 18 },
  warning: { marginTop: -Spacing.sm, marginBottom: Spacing.md, padding: Spacing.sm, borderRadius: Radius.md, color: "#92400E", fontSize: Typography.small, lineHeight: 18, backgroundColor: "#FEF3C7" },
});
