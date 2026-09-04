import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import ChoiceField from "../../components/cadastro/ChoiceField";
import FormField from "../../components/cadastro/FormField";
import RealDiscountInfo from "../../components/cadastro/RealDiscountInfo";
import UsinaSelector from "../../components/cadastro/UsinaSelector";
import { AppHeader, Button, Card, ElasticScrollView as ScrollView, Loading, Screen } from "../../components/ui";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { buscarCliente, buscarUnidade, listarFaturasAnexadasCliente } from "../../services/clientes.service";
import { buscarFaturasCliente } from "../../services/faturas.service";
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
    dadosFatura: dadosFaturaParam,
  } = useLocalSearchParams<{
    id?: string;
    numero: string;
    clienteId: string;
    consumoMedio?: string;
    usinaId?: string;
    modalidade?: Modalidade;
    desconto?: string;
    dadosFatura?: string;
  }>();
  const [usinas, setUsinas] = useState<any[]>([]); const [usinaId, setUsinaId] = useState("");
  const [modalidade, setModalidade] = useState<Modalidade>("COMPENSACAO"); const [percentual, setPercentual] = useState("");
  const [desconto, setDesconto] = useState("40"); const [consumoMedio, setConsumoMedio] = useState("0");
  const [cpfTitular, setCpfTitular] = useState("");
  const [formatoFatura, setFormatoFatura] = useState<FormatoFatura>("UNIFICADA");
  const [repasseDisponibilidadeGD1, setRepasseDisponibilidadeGD1] = useState<RepasseGD2>("REPASSAR");
  const [repasseDisponibilidadeGD2, setRepasseDisponibilidadeGD2] = useState<RepasseGD2>("REPASSAR");
  const [repasseFioBGD2, setRepasseFioBGD2] = useState<RepasseGD2>("REPASSAR");
  const [dadosFatura, setDadosFatura] = useState<Record<string, any> | null>(null);
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
        const [lista, unidade, faturas] = await Promise.all([
          listarUsinas(),
          consultaUnidade,
          numeroDaUc ? buscarFaturasCliente(numeroDaUc).catch(() => []) : Promise.resolve([]),
        ]);
        const uc = unidade;
        const idCliente = eUuid(clienteIdRecebido)
          ? clienteIdRecebido
          : eUuid(String(uc?.cliente_id ?? ""))
            ? String(uc.cliente_id)
            : "";
        // Os dados do cliente são apenas um fallback para cadastros antigos.
        // Uma falha nessa consulta não pode impedir a seleção das usinas nem
        // ser apresentada incorretamente como erro ao carregar o parque.
        const cliente = idCliente ? await buscarCliente(idCliente).catch(() => null) : null;
        const anexos = idCliente ? await listarFaturasAnexadasCliente(idCliente).catch(() => []) : [];
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
        setCpfTitular(formatarDocumentoParcialOuCompleto(String(uc?.cpf_titular ?? "")));
        setRepasseDisponibilidadeGD1((uc?.repassar_disponibilidade_gd1 ?? Number(uc?.percentual_repasse_disponibilidade ?? 100) > 0) ? "REPASSAR" : "ABSORVER");
        setRepasseDisponibilidadeGD2((uc?.repassar_disponibilidade_gd2 ?? Number(uc?.percentual_repasse_disponibilidade ?? 100) > 0) ? "REPASSAR" : "ABSORVER");
        setRepasseFioBGD2((uc?.repassar_diferenca_fio_b_gd2 ?? true) ? "REPASSAR" : "ABSORVER");
        const anexoDaUc = anexos.find((item) => String(item?.dadosFatura?.uc ?? item?.dadosFatura?.numero_instalacao ?? "").replace(/\D/g, "") === numeroDaUc);
        // A conta original preserva SCEE, tarifa GD II e disponibilidade.
        // Esses dados são indispensáveis para a projeção responder ao Fio B.
        const faturaBase = parseDadosFatura(dadosFaturaParam) ?? anexoDaUc?.dadosFatura ?? faturas[0] ?? null;
        setDadosFatura(faturaBase);
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
  }, [clienteIdRecebido, consumoMedioImportado, dadosFaturaParam, descontoImportado, modalidadeImportada, numeroDaUc, unidadeIdRecebida, usinaIdImportada]);

  async function salvar() {
    const rateio = valorNumerico(percentual); const descontoNumero = valorNumerico(desconto); const media = Math.max(0, valorNumerico(consumoMedio));
    if (!clienteIdResolvido) return Alert.alert("Vincule a UC a um cliente", "Esta UC ainda não tem um cliente vinculado. Volte ao cadastro da unidade, escolha o cliente e salve antes de fazer a alocação.");
    if (!usinaId) return Alert.alert("Escolha a usina", "Selecione a usina que fornecerá energia para esta UC.");
    if (!Number.isFinite(rateio) || rateio <= 0 || rateio > 100) return Alert.alert("Percentual inválido", "Informe um percentual entre 0,01% e 100%.");
    if (!Number.isFinite(descontoNumero) || descontoNumero < 0 || descontoNumero > 100) return Alert.alert("Desconto inválido", "Informe um desconto entre 0% e 100%.");
    try { setSalvando(true);
      await alocarUnidade(usinaId, { clienteId: clienteIdResolvido, numero: numeroDaUc, cpfTitular: cpfTitular.replace(/\D/g, "") || null, modalidade, percentual: rateio, desconto: descontoNumero, consumoMedio: media, percentualRepasseDisponibilidade: repasseDisponibilidadeGD2 === "REPASSAR" ? 100 : 0, repassarCustoDisponibilidadeGD1: repasseDisponibilidadeGD1 === "REPASSAR", repassarCustoDisponibilidadeGD2: repasseDisponibilidadeGD2 === "REPASSAR", repassarDiferencaFioBGD2: repasseFioBGD2 === "REPASSAR", tipoGd: tipoGdEfetivo, faturaSomenteAndrade: formatoFatura === "SOMENTE_ANDRADE", calcularAutomaticamente: false });
      // Esta tela pode ter sido aberta a partir de uma UC ou da criação por
      // fatura. O destino único evita ficar preso na tela anterior e exigir
      // um segundo toque para voltar à lista atualizada.
      router.replace("/unidades");
    } catch (erro: any) { Alert.alert("Não foi possível alocar", erro?.message ?? "Tente novamente."); } finally { setSalvando(false); }
  }

  if (loading) return <Loading />;

  const usinaSelecionada = usinas.find((usina) => usina.id === usinaId);
  const usinaGd2 = String(usinaSelecionada?.tipo_gd ?? "").toUpperCase() === "GD2";
  const tipoGdEfetivo = String(usinaSelecionada?.tipo_gd ?? "").toUpperCase();
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
          <View style={styles.sectionHeading}><Text style={styles.sectionEyebrow}>USINA GERADORA</Text></View>
          <FormField
            label="CPF/CNPJ do titular na conta de luz"
            value={cpfTitular}
            onChangeText={(valor) => setCpfTitular(formatarDocumentoParcialOuCompleto(valor))}
            keyboardType="numeric"
          />
          <UsinaSelector
            usinas={usinas}
            value={usinaId}
            onChange={(idDaUsina) => {
              const novaUsina = usinas.find((usina) => usina.id === idDaUsina);
              setUsinaId(idDaUsina);
              setPercentual(percentualPelaMedia(novaUsina, consumoMedio, modalidade));
            }}
            label="Escolha a usina"
            detail={textoProducao}
          />

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
              { label: "Fatura Unificada Andrade Energy", value: "UNIFICADA" },
              { label: "Somente Andrade Energy", value: "SOMENTE_ANDRADE" },
            ]}
          />
          <>
            <Text style={styles.hint}>{tipoGdEfetivo ? `Modalidade identificada: ${tipoGdEfetivo === "GD2" ? "GD II" : tipoGdEfetivo === "MISTA" ? "GD I + GD II" : "GD I"}${usinaGd2 ? ", definida automaticamente pela usina selecionada" : ""}.` : "Modalidade GD ainda não identificada. As configurações continuam disponíveis; a projeção ficará em 0% até chegar uma leitura GD."}</Text>
            {(!tipoGdEfetivo || tipoGdEfetivo === "GD1") ? <ChoiceField
              label="GD I: custo de disponibilidade recalculado"
              value={repasseDisponibilidadeGD1}
              onChange={(valor) => setRepasseDisponibilidadeGD1(valor as RepasseGD2)}
              options={[{ label: "Repassar ao cliente", value: "REPASSAR" }, { label: "Absorver pela Andrade", value: "ABSORVER" }]}
            /> : null}
            {!tipoGdEfetivo || tipoGdEfetivo === "GD2" ? <>
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
            <Text style={styles.hint}>{formatoFatura === "SOMENTE_ANDRADE"
              ? "Mesmo com documentos separados, a projeção considera também o valor pago diretamente à concessionária."
              : "Os demais encargos continuam na conta da concessionária."}
            </Text>
            <RealDiscountInfo
              descontoPercentual={desconto}
              tipoGd={tipoGdEfetivo}
              modalidadeFaturamento={modalidade}
              consumoProjetado={consumoMedio}
              energiaInjetadaProjetada={modalidade === "INJECAO"
                ? producaoParaAlocacao(usinaSelecionada) * valorNumerico(percentual) / 100
                : 0}
              faturaSomenteAndrade={formatoFatura === "SOMENTE_ANDRADE"}
              dadosFatura={dadosFatura}
              projetarConsumoIntegral
              tarifaSceeReferencia={valorNumerico(usinaSelecionada?.tarifa_scee_referencia)}
              tarifaGd2Referencia={valorNumerico(usinaSelecionada?.tarifa_gd2_referencia)}
              historicoTarifasGd2={Array.isArray(usinaSelecionada?.historico_tarifas_gd2) ? usinaSelecionada.historico_tarifas_gd2 : []}
              disponibilidadeGd1={repasseDisponibilidadeGD1}
              disponibilidadeGd2={repasseDisponibilidadeGD2}
              fioBGd2={repasseFioBGD2}
            />
          </>
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

function parseDadosFatura(valor?: string) {
  try { return valor ? JSON.parse(valor) : null; }
  catch { return null; }
}

function formatarDocumentoParcialOuCompleto(valor: string) {
  const numeros = valor.replace(/\D/g, "").slice(0, 14);
  if (numeros.length === 4) return `${numeros}.***.***-**`;
  if (numeros.length <= 11) return numeros.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  return numeros.replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d{1,2})$/, "$1-$2");
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
  hint: { marginTop: -Spacing.sm, marginBottom: Spacing.md, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 18 },
  warning: { marginTop: -Spacing.sm, marginBottom: Spacing.md, padding: Spacing.sm, borderRadius: Radius.md, color: "#92400E", fontSize: Typography.small, lineHeight: 18, backgroundColor: "#FEF3C7" },
});
