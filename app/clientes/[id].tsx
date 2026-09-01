import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { AppHeader, Badge, Button, Card, ElasticScrollView as ScrollView, EmptyState, Loading, Screen, Section } from "../../components/ui";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { useAuth } from "../../contexts/AuthContext";
import { buscarCliente, confirmarCadastroCliente, listarUnidadesCliente, obterSolicitacaoCadastroCliente, SolicitacaoCadastroCliente } from "../../services/clientes.service";
import { analisarFatura, buscarFaturasCliente, calcularMediaConsumoFatura } from "../../services/faturas.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";

const moeda = (v: unknown) => Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const documento = (valor: unknown) => { const numeros = String(valor ?? "").replace(/\D/g, ""); if (numeros.length === 11) return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4"); if (numeros.length === 14) return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5"); return String(valor ?? ""); };
const tipoGdDaFatura = (dados: any) => Number(dados?.energiaCompensadaGD1 ?? 0) > 0 && Number(dados?.energiaCompensadaGD2 ?? 0) > 0 ? "MISTA" : Number(dados?.energiaCompensadaGD2 ?? 0) > 0 ? "GD2" : Number(dados?.energiaCompensadaGD1 ?? 0) > 0 ? "GD1" : "";
const competenciaCurta = (valor: unknown) => {
  const texto = String(valor ?? "");
  const correspondencia = /^(\d{4})-(\d{2})/.exec(texto);
  return correspondencia ? `${correspondencia[2]}/${correspondencia[1].slice(2)}` : texto.slice(0, 7) || "—";
};
const statusDaSolicitacao = (status: unknown) => {
  const valor = String(status ?? "ATIVO").toUpperCase();
  if (valor === "AGUARDANDO_VERIFICACAO_EMAIL") return { label: "Aguardando e-mail", variant: "warning" as const };
  if (valor === "AGUARDANDO_CONFIRMACAO_GERADOR") return { label: "Pronto para confirmação", variant: "warning" as const };
  if (valor === "REJEITADO" || valor === "INATIVO") return { label: valor === "REJEITADO" ? "Recusado" : "Inativo", variant: "danger" as const };
  return { label: "Ativo", variant: "success" as const };
};

export default function ClienteDetalhe() {
  const { id, area } = useLocalSearchParams<{ id: string; area?: "unidades" | "faturas" | "validacao" }>(); const [cliente, setCliente] = useState<any>(); const [faturas, setFaturas] = useState<any[]>([]); const [unidades, setUnidades] = useState<any[]>([]); const [buscaUnidades, setBuscaUnidades] = useState(""); const [mostrarInfo, setMostrarInfo] = useState(false); const [loading, setLoading] = useState(true); const [atualizando, setAtualizando] = useState(false); const [importandoUc, setImportandoUc] = useState(false); const [solicitacaoCadastro, setSolicitacaoCadastro] = useState<SolicitacaoCadastroCliente | null>(null); const [confirmandoCadastro, setConfirmandoCadastro] = useState(false);
  const { suspenderBloqueioTemporariamente } = useAuth();
  const carregar = useCallback(async () => { try { const [c, u, solicitacao] = await Promise.all([buscarCliente(id), listarUnidadesCliente(id), IS_GERADOR_APP ? obterSolicitacaoCadastroCliente(id).catch((erro: any) => { if (erro?.response?.status === 404) return null; throw erro; }) : Promise.resolve(null)]); const unidadesCliente = u ?? []; setCliente(c); setUnidades(unidadesCliente); setSolicitacaoCadastro(solicitacao); const numeros = Array.from(new Set([c.uc, ...unidadesCliente.map((item: any) => item.numero)].filter(Boolean))); const listas = await Promise.all(numeros.map((numero) => buscarFaturasCliente(String(numero)))); const unicas = Array.from(new Map(listas.flat().map((fatura: any) => [fatura.id, fatura])).values()); setFaturas(unicas); } catch (erro: any) { Alert.alert("Não foi possível atualizar", erro?.response?.data?.message ?? "Confira sua conexão e tente novamente."); } finally { setLoading(false); } }, [id]);
  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));
  async function atualizarPagina() { setAtualizando(true); try { await carregar(); } finally { setAtualizando(false); } }
  if (loading) return <Loading />;
  if (!cliente) return <Screen><View style={styles.state}><EmptyState icon="person-outline" title="Cliente não encontrado" subtitle="Não foi possível carregar este cadastro." /></View></Screen>;
  const economia = faturas.reduce((t, f) => t + Number(f.economia_real ?? f.economia ?? 0), 0);
  const termoUnidade = buscaUnidades.trim().toLocaleLowerCase("pt-BR");
  const unidadesFiltradas = unidades.filter((unidade) => `${unidade.numero} ${unidade.titular} ${unidade.endereco} ${unidade.distribuidora}`.toLocaleLowerCase("pt-BR").includes(termoUnidade));
  const statusCadastro = statusDaSolicitacao(solicitacaoCadastro?.status ?? cliente.cadastro_status ?? cliente.status);
  const cadastroPendente = ["AGUARDANDO_VERIFICACAO_EMAIL", "AGUARDANDO_CONFIRMACAO_GERADOR"].includes(String(solicitacaoCadastro?.status ?? cliente.cadastro_status ?? "").toUpperCase());
  const consumoHistorico = faturas
    .map((fatura) => ({ referencia: competenciaCurta(fatura.referencia), consumo: Math.max(0, Number(fatura.consumo_kwh ?? fatura.consumo ?? 0)) }))
    .filter((item) => item.consumo > 0)
    .slice(0, 6)
    .reverse();
  const maiorConsumo = Math.max(1, ...consumoHistorico.map((item) => item.consumo));
  const mostrarVisaoGeral = !area;

  function whatsapp() { const numero = String(cliente.whatsapp ?? cliente.telefone ?? "").replace(/\D/g, ""); if (!numero) return Alert.alert("WhatsApp não informado", "Adicione um telefone no cadastro do cliente."); Linking.openURL(`https://wa.me/${numero.startsWith("55") ? numero : `55${numero}`}?text=${encodeURIComponent(`Olá ${cliente.nome}, estou entrando em contato sobre sua energia.`)}`); }

  async function adicionarUnidadeViaFatura() {
    const retomarBloqueio = suspenderBloqueioTemporariamente();
    let faturaLida = false;
    try {
      const arquivo = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true, multiple: false });
      if (arquivo.canceled) return;

      setImportandoUc(true);
      const pdf = arquivo.assets[0];
      const analise = await analisarFatura(pdf.uri, pdf.name);
      const dados = analise?.dados ?? {};
      faturaLida = true;
      const numero = String(dados.uc ?? dados.numero_instalacao ?? dados.numeroInstalacao ?? "").replace(/\D/g, "");
      if (!numero) throw new Error("Não foi possível identificar o número da unidade consumidora.");
      const consumoMedio = calcularMediaConsumoFatura(dados);
      const tipoGd = tipoGdDaFatura(dados);
      const dadosFatura = JSON.stringify({
        valorTotal: dados.valorTotal, consumo: dados.consumo,
        energiaInjetada: dados.energiaInjetada, energiaCompensada: dados.energiaCompensada,
        energiaCompensadaGD1: dados.energiaCompensadaGD1, energiaCompensadaGD2: dados.energiaCompensadaGD2,
        tarifaCheia: dados.tarifaCheia, tarifaScee: dados.tarifaScee,
        tarifaGD2: dados.tarifaGD2 ?? dados.tarifaGD,
        custoDisponibilidade: dados.custoDisponibilidade,
        valorEnergiaConcessionaria: dados.valorEnergiaConcessionaria,
      });
      router.push({
        pathname: "/unidades/nova",
        params: {
          origem: "fatura",
          numero,
          clienteId: id,
          cliente: String(dados.cliente ?? cliente.nome ?? ""),
          uc: numero,
          cpf: String(dados.cpfParcial ?? dados.cpf_parcial ?? dados.cpf ?? "").replace(/\D/g, "").slice(0, 4),
          endereco: String(dados.endereco ?? ""),
          energiaCompensada: String(dados.energiaCompensada ?? 0),
          consumoMedio: consumoMedio > 0 ? String(consumoMedio) : "",
          tipoGd,
          dadosFatura,
        },
      });
    } catch (erro: any) {
      Alert.alert(
        faturaLida ? "Não foi possível cadastrar a UC" : "Não foi possível ler a fatura",
        erro?.response?.data?.message ?? erro?.message ?? (faturaLida ? "Confira a usina e tente novamente." : "Confirme se o arquivo é uma conta de energia em PDF."),
      );
    } finally {
      setImportandoUc(false);
      retomarBloqueio();
    }
  }

  function escolherOrigemDaFatura() {
    Alert.alert(
      "Adicionar UC via PDF",
      "Escolha uma conta já vinculada ao CPF do cliente ou selecione um novo PDF neste aparelho.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Contas do perfil",
          onPress: () => router.push({
            pathname: "/clientes/faturas-anexadas" as never,
            params: { clienteId: id, cliente: cliente.nome, selecionarUc: "1" },
          }),
        },
        { text: "PDF deste aparelho", onPress: () => void adicionarUnidadeViaFatura() },
      ],
    );
  }

  function confirmarSolicitacao() {
    const mensagem = solicitacaoCadastro?.faturaUrl
      ? `Confirmar os dados de ${cliente.nome} e liberar o acesso ao aplicativo? A conta e a UC extraída da fatura passarão para o status ativo.`
      : `Confirmar o cadastro de ${cliente.nome} e liberar o acesso ao aplicativo? A unidade consumidora poderá ser adicionada depois.`;
    Alert.alert("Confirmar cadastro", mensagem, [
      { text: "Cancelar", style: "cancel" },
      { text: "Confirmar e ativar", onPress: async () => {
        try {
          setConfirmandoCadastro(true);
          await confirmarCadastroCliente(id);
          Alert.alert("Cadastro confirmado", "O consumidor já pode entrar no aplicativo.");
          await carregar();
        } catch (erro: any) {
          Alert.alert("Não foi possível confirmar", erro?.response?.data?.message ?? "Confira os dados e tente novamente.");
        } finally {
          setConfirmandoCadastro(false);
        }
      } },
    ]);
  }

  return <Screen>{IS_GERADOR_APP ? <AppHeader variant="subpage" title={area === "unidades" ? "Unidades consumidoras" : "Clientes"} subtitle={area === "unidades" ? "Lista de UCs" : "Gestão da carteira"} contextTitle={area === "unidades" ? `${unidades.length} UC${unidades.length === 1 ? "" : "s"}` : cliente.nome ?? "Cliente"} contextSubtitle={area === "unidades" ? "Toque em uma unidade para abrir" : `${unidades.length} unidade${unidades.length === 1 ? "" : "s"} consumidora${unidades.length === 1 ? "" : "s"}`} icon={area === "unidades" ? "flash-outline" : "people-outline"} /> : null}<ScrollView refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizarPagina} tintColor={Colors.primary} colors={[Colors.primary]} />} contentContainerStyle={styles.content}>{area !== "unidades" ? <View style={styles.customerHeader}><View style={styles.heading}><View style={styles.avatar}><Text style={styles.avatarText}>{cliente.nome?.charAt(0)?.toUpperCase()}</Text></View><View style={styles.headingText}><Text style={styles.eyebrow}>CLIENTE</Text><Text style={styles.title}>{cliente.nome}</Text><Text style={styles.subtitle}>{cliente.cpf ? documento(cliente.cpf) : "CPF/CNPJ não informado"}</Text></View><Badge label={statusCadastro.label} variant={statusCadastro.variant} /></View>
    {mostrarInfo ? <View style={styles.headerInfo}><Info icon="flash-outline" label="Unidade principal" value={cliente.uc ? `UC ${cliente.uc}` : "Não informada"} /><Info icon="layers-outline" label="Unidades" value={String(unidades.length)} /><Info icon="call-outline" label="Telefone" value={cliente.telefone || "Não informado"} /><Info icon="business-outline" label="Concessionária" value={cliente.distribuidora || "Não informada"} /><Info wide icon="mail-outline" label="E-mail" value={cliente.email || "Não informado"} /><Info wide icon="location-outline" label="Endereço" value={cliente.endereco || "Não informado"} /></View> : null}<TouchableOpacity accessibilityLabel={mostrarInfo ? "Recolher informações do cliente" : "Ver todas as informações do cliente"} onPress={() => setMostrarInfo((valor) => !valor)} style={styles.expandButton}><Text style={styles.expandLabel}>{mostrarInfo ? "Ocultar informações" : "Ver informações"}</Text><Ionicons name={mostrarInfo ? "chevron-up" : "chevron-down"} size={17} color={Colors.primary} /></TouchableOpacity></View> : null}
    {area !== "unidades" && !cadastroPendente ? <View style={styles.actions}><Button title="Editar" icon={<Ionicons name="create-outline" size={19} color={Colors.surface} />} style={styles.action} onPress={() => router.push({ pathname: "/clientes/editar", params: { id } })} /><Button title="WhatsApp" icon={<Ionicons name="logo-whatsapp" size={19} color={Colors.surface} />} style={[styles.action, styles.whatsapp]} onPress={whatsapp} /></View> : null}
    {area ? <TouchableOpacity onPress={() => router.replace({ pathname: "/clientes/[id]", params: { id } })} style={styles.backToOverview}><Ionicons name="chevron-back" size={18} color={Colors.primary} /><Text style={styles.backToOverviewText}>Voltar ao resumo do cliente</Text></TouchableOpacity> : null}
    {mostrarVisaoGeral ? <>
      <Section title="Acesso rápido"><View style={styles.quickGrid}>
        <QuickAccess icon="flash-outline" label="Unidades" detail={`${unidades.length} cadastrada${unidades.length === 1 ? "" : "s"}`} onPress={() => router.push({ pathname: "/clientes/[id]", params: { id, area: "unidades" } })} />
        <QuickAccess icon="document-text-outline" label="Faturas" detail={`${faturas.length} processada${faturas.length === 1 ? "" : "s"}`} onPress={() => router.push({ pathname: "/clientes/[id]", params: { id, area: "faturas" } })} />
        {IS_GERADOR_APP ? <QuickAccess icon="folder-open-outline" label="Contas anexadas" detail="Visualizar e adicionar UCs" onPress={() => router.push({ pathname: "/clientes/faturas-anexadas" as never, params: { clienteId: id, cliente: cliente.nome, selecionarUc: "1" } })} /> : null}
        {IS_GERADOR_APP && solicitacaoCadastro ? <QuickAccess icon="checkmark-circle-outline" label="Validação" detail={statusCadastro.label} onPress={() => router.push({ pathname: "/clientes/[id]", params: { id, area: "validacao" } })} /> : null}
      </View></Section>
      <Section title="Economia total"><Card><Text style={styles.summaryLabel}>Economia de todas as unidades</Text><Text style={styles.summaryValue}>{moeda(economia)}</Text><Text style={styles.summaryDetail}>{faturas.length} fatura{faturas.length === 1 ? "" : "s"} processada{faturas.length === 1 ? "" : "s"} em {unidades.length} unidade{unidades.length === 1 ? "" : "s"}</Text></Card></Section>
      <Section title="Histórico de consumo"><Card>{consumoHistorico.length ? <View style={styles.consumptionChart}>{consumoHistorico.map((item, indice) => <View key={`${item.referencia}-${indice}`} style={styles.consumptionColumn}><Text style={styles.consumptionValue}>{Math.round(item.consumo)}</Text><View style={styles.consumptionTrack}><View style={[styles.consumptionBar, { height: `${Math.max(12, item.consumo / maiorConsumo * 100)}%` }]} /></View><Text style={styles.consumptionLabel}>{item.referencia}</Text></View>)}</View> : <Text style={styles.summaryDetail}>O gráfico aparecerá após a primeira fatura processada.</Text>}</Card></Section>
    </> : null}
    {area === "validacao" && IS_GERADOR_APP && solicitacaoCadastro ? <Section title="Validação do cadastro"><Card style={styles.reviewCard}><View style={styles.reviewHeader}><View><Text style={styles.reviewTitle}>{solicitacaoCadastro.faturaUrl ? "Fatura CEMIG enviada" : "Cadastro sem fatura"}</Text><Text style={styles.reviewSubtitle}>{solicitacaoCadastro.status === "AGUARDANDO_VERIFICACAO_EMAIL" ? "Aguardando o consumidor confirmar o e-mail." : solicitacaoCadastro.faturaUrl ? "Confira os dados extraídos antes de liberar o acesso." : "O consumidor concluiu o cadastro sem conta de energia. Ative manualmente quando estiver tudo certo."}</Text></View><Badge label={statusDaSolicitacao(solicitacaoCadastro.status).label} variant={statusDaSolicitacao(solicitacaoCadastro.status).variant} /></View><View style={styles.reviewData}><Info icon="person-outline" label="Titular" value={solicitacaoCadastro.dadosFatura.titular || cliente.nome || "Não identificado"} /><Info icon="flash-outline" label="UC" value={solicitacaoCadastro.dadosFatura.uc ? `UC ${solicitacaoCadastro.dadosFatura.uc}` : "Será adicionada depois"} /><Info wide icon="location-outline" label="Endereço da fatura" value={solicitacaoCadastro.dadosFatura.endereco || "Será informado depois"} /></View>{solicitacaoCadastro.faturaUrl ? <TouchableOpacity onPress={() => Linking.openURL(solicitacaoCadastro.faturaUrl!)} style={styles.invoiceProof}><Ionicons name="document-text-outline" size={19} color={Colors.primary} /><Text style={styles.invoiceProofText}>Abrir fatura enviada</Text><Ionicons name="open-outline" size={17} color={Colors.primary} /></TouchableOpacity> : null}{solicitacaoCadastro.status === "AGUARDANDO_CONFIRMACAO_GERADOR" ? <TouchableOpacity disabled={confirmandoCadastro} onPress={confirmarSolicitacao} style={[styles.approveButton, confirmandoCadastro && styles.disabled]}>{confirmandoCadastro ? <ActivityIndicator color={Colors.surface} /> : <><Ionicons name="checkmark-circle-outline" size={20} color={Colors.surface} /><Text style={styles.approveText}>Confirmar cadastro e ativar</Text></>}</TouchableOpacity> : null}</Card></Section> : null}
    {area === "unidades" ? <Section title="Unidades consumidoras"><View>{!cadastroPendente ? <><View style={styles.unitActions}><View style={styles.search}><Ionicons name="search-outline" size={20} color={Colors.subtitle} /><TextInput value={buscaUnidades} onChangeText={setBuscaUnidades} placeholder="Buscar por UC, titular ou endereço" placeholderTextColor={Colors.subtitle} style={styles.searchInput} /></View><TouchableOpacity accessibilityLabel="Adicionar unidade manualmente" onPress={() => router.push({ pathname: "/unidades/nova", params: { clienteId: id } })} style={styles.addUnit}><Ionicons name="add" size={22} color={Colors.surface} /></TouchableOpacity><TouchableOpacity accessibilityLabel="Adicionar unidade via fatura" disabled={importandoUc} onPress={escolherOrigemDaFatura} style={[styles.addUnit, styles.addUnitInvoice]}>{importandoUc ? <ActivityIndicator color={Colors.surface} /> : <Ionicons name="document-attach-outline" size={21} color={Colors.surface} />}</TouchableOpacity></View><Text style={styles.unitActionHint}>No botão de PDF, escolha uma conta vinculada ao perfil ou um arquivo deste aparelho.</Text></> : <Text style={styles.unitActionHint}>A UC será ativada junto com a confirmação do cadastro.</Text>}{unidadesFiltradas.length ? unidadesFiltradas.map((unidade) => { const inativa = unidade.status === "INATIVA"; return <TouchableOpacity key={unidade.id} activeOpacity={0.78} accessibilityLabel={`Abrir documentos da UC ${unidade.numero}`} onPress={() => router.push({ pathname: "/unidades/[id]", params: { id: unidade.id, numero: unidade.numero, clienteId: unidade.cliente_id ?? id, cliente: cliente.nome, usinaId: unidade.usina_id ?? "", usinaNome: unidade.usinas?.nome ?? "", titular: unidade.titular ?? "", distribuidora: unidade.distribuidora ?? "" } })}><Card style={styles.unitCard}><View style={styles.unitRow}><View style={styles.unitIcon}><Ionicons name="flash-outline" size={19} color={Colors.primary} /></View><View style={styles.unitInfo}><Text style={styles.unitLabel}>UNIDADE CONSUMIDORA</Text><Text style={styles.unitNumber}>{unidade.numero}</Text><View style={styles.unitMeta}><View style={[styles.statusDot, inativa && styles.statusDotInactive]} /><Text style={[styles.statusText, inativa && styles.statusTextInactive]}>{unidade.status ?? "ATIVA"}</Text><Text style={styles.unitSeparator}>•</Text><Text numberOfLines={1} style={styles.unitDetail}>{unidade.titular || unidade.endereco || unidade.distribuidora || "Concessionária"}</Text></View></View><Ionicons name="chevron-forward" size={18} color={Colors.subtitle} /></View></Card></TouchableOpacity>; }) : <EmptyState icon="flash-outline" title={buscaUnidades ? "Nenhuma unidade encontrada" : "Nenhuma unidade vinculada"} subtitle={buscaUnidades ? "Altere os termos da busca." : cadastroPendente ? "A unidade será criada a partir da fatura quando o cadastro for confirmado." : "Adicione a primeira unidade consumidora deste cliente."} />}</View></Section> : null}
    {area === "faturas" ? <Section title="Histórico de faturas">{faturas.length ? faturas.map((f) => <Pressable key={f.id} onPress={() => f.id && router.push(`/faturas/${f.id}`)}><Card><View style={styles.invoice}><View style={styles.invoiceIcon}><Ionicons name="receipt-outline" size={21} color={Colors.primary} /></View><View style={styles.invoiceInfo}><Text style={styles.invoiceTitle}>{f.referencia}</Text><Text style={styles.invoiceDetail}>Economia {moeda(f.economia_real ?? f.economia)}</Text></View><Text style={styles.invoiceValue}>{moeda(f.valor_total_unificado ?? f.valor_total)}</Text><Ionicons name="chevron-forward" size={18} color={Colors.subtitle} /></View></Card></Pressable>) : <EmptyState icon="receipt-outline" title="Nenhuma fatura processada" subtitle="As faturas deste cliente aparecerão aqui." />}</Section> : null}
  </ScrollView></Screen>;
}

function Info({ icon, label, value, wide = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; wide?: boolean }) { return <View style={[styles.info, wide && styles.infoWide]}><View style={styles.infoIcon}><Ionicons name={icon} size={16} color={Colors.primary} /></View><View style={styles.infoText}><Text style={styles.infoLabel}>{label}</Text><Text numberOfLines={1} style={styles.infoValue}>{value}</Text></View></View>; }
function QuickAccess({ icon, label, detail, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; detail: string; onPress: () => void }) { return <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={styles.quickAccess}><View style={styles.quickIcon}><Ionicons name={icon} size={21} color={Colors.primary} /></View><Text numberOfLines={1} style={styles.quickLabel}>{label}</Text><Text numberOfLines={1} style={styles.quickDetail}>{detail}</Text></TouchableOpacity>; }
const styles = StyleSheet.create({ content: { padding: Spacing.lg, paddingBottom: Spacing.xxl }, state: { flex: 1, justifyContent: "center", padding: Spacing.lg }, customerHeader: { marginBottom: Spacing.sm, padding: Spacing.sm, borderWidth: 1, borderColor: "#C9DED1", borderRadius: Radius.lg, backgroundColor: "#EAF4ED" }, heading: { flexDirection: "row", alignItems: "center" }, avatar: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: Radius.round, backgroundColor: Colors.primaryLight }, avatarText: { color: Colors.primaryDark, fontSize: Typography.section, fontWeight: "800" }, headingText: { flex: 1, marginHorizontal: Spacing.sm }, eyebrow: { color: Colors.primary, fontSize: 10, fontWeight: "800", letterSpacing: 1 }, title: { marginTop: 2, color: Colors.text, fontSize: Typography.body, fontWeight: "800" }, subtitle: { marginTop: 2, color: Colors.subtitle, fontSize: Typography.small }, headerInfo: { flexDirection: "row", flexWrap: "wrap", marginTop: Spacing.xs, paddingTop: 4, borderTopWidth: 1, borderTopColor: "rgba(57,128,74,0.16)" }, info: { width: "50%", minHeight: 38, flexDirection: "row", alignItems: "center", paddingRight: Spacing.xs }, infoWide: { width: "100%" }, infoIcon: { width: 25, alignItems: "center" }, infoText: { flex: 1, marginLeft: 3 }, infoLabel: { color: Colors.subtitle, fontSize: 10 }, infoValue: { marginTop: 1, color: Colors.text, fontSize: Typography.small, fontWeight: "600" }, expandButton: { minHeight: 27, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, marginTop: 2 }, expandLabel: { color: Colors.primary, fontSize: 10, fontWeight: "700" }, actions: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.lg }, action: { flex: 1 }, whatsapp: { backgroundColor: Colors.success }, backToOverview: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 4, marginBottom: Spacing.md, paddingHorizontal: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.primaryLight }, backToOverviewText: { color: Colors.primaryDark, fontSize: Typography.small, fontWeight: "800" }, quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm }, quickAccess: { width: "48%", minHeight: 112, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, backgroundColor: Colors.surface }, quickIcon: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Colors.primaryLight }, quickLabel: { marginTop: Spacing.sm, color: Colors.text, fontSize: Typography.small, fontWeight: "900" }, quickDetail: { marginTop: 3, color: Colors.subtitle, fontSize: 10 }, reviewCard: { padding: Spacing.md }, reviewHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: Spacing.sm }, reviewTitle: { color: Colors.text, fontSize: Typography.body, fontWeight: "900" }, reviewSubtitle: { maxWidth: 210, marginTop: 4, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 18 }, reviewData: { marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border }, invoiceProof: { minHeight: 46, flexDirection: "row", alignItems: "center", gap: Spacing.xs, marginTop: Spacing.sm, paddingHorizontal: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.primaryLight }, invoiceProofText: { flex: 1, color: Colors.primary, fontSize: Typography.small, fontWeight: "800" }, approveButton: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, marginTop: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.primary }, approveText: { color: Colors.surface, fontSize: Typography.small, fontWeight: "900" }, disabled: { opacity: 0.7 }, unitActions: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.xs }, search: { minHeight: 52, flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, backgroundColor: Colors.surface }, searchInput: { flex: 1, marginLeft: Spacing.xs, color: Colors.text }, addUnit: { width: 52, height: 52, alignItems: "center", justifyContent: "center", borderRadius: Radius.lg, backgroundColor: Colors.primary }, addUnitInvoice: { backgroundColor: Colors.secondary }, unitActionHint: { marginBottom: Spacing.md, color: Colors.subtitle, fontSize: 11 }, unitCard: { marginBottom: Spacing.sm, padding: Spacing.md, borderWidth: 1, borderColor: "rgba(100,116,139,0.14)", borderRadius: Radius.lg, backgroundColor: "rgba(255,255,255,0.58)", shadowOpacity: 0, elevation: 0 }, unitRow: { minHeight: 58, flexDirection: "row", alignItems: "center" }, unitIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: Radius.round, backgroundColor: "rgba(57,128,74,0.10)" }, unitInfo: { flex: 1, minWidth: 0, marginLeft: Spacing.md, marginRight: Spacing.sm }, unitLabel: { color: Colors.subtitle, fontSize: 9, fontWeight: "700", letterSpacing: 0.7 }, unitNumber: { marginTop: 2, color: Colors.text, fontSize: Typography.body, fontWeight: "800" }, unitMeta: { minWidth: 0, flexDirection: "row", alignItems: "center", marginTop: 7 }, statusDot: { width: 6, height: 6, marginRight: 5, borderRadius: 3, backgroundColor: Colors.success }, statusDotInactive: { backgroundColor: Colors.danger }, statusText: { color: Colors.success, fontSize: 10, fontWeight: "800" }, statusTextInactive: { color: Colors.danger }, unitSeparator: { marginHorizontal: 7, color: Colors.border, fontSize: 10 }, unitDetail: { flex: 1, color: Colors.subtitle, fontSize: Typography.small }, summaryLabel: { color: Colors.subtitle }, summaryValue: { marginTop: Spacing.xs, color: Colors.primaryDark, fontSize: 30, fontWeight: "800" }, summaryDetail: { marginTop: Spacing.xs, color: Colors.subtitle }, consumptionChart: { height: 148, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 6, paddingTop: Spacing.sm }, consumptionColumn: { flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end" }, consumptionValue: { marginBottom: 4, color: Colors.primaryDark, fontSize: 9, fontWeight: "800" }, consumptionTrack: { width: "70%", height: 88, justifyContent: "flex-end", overflow: "hidden", borderRadius: Radius.sm, backgroundColor: Colors.primaryLight }, consumptionBar: { width: "100%", minHeight: 8, borderRadius: Radius.sm, backgroundColor: Colors.primary }, consumptionLabel: { marginTop: 5, color: Colors.subtitle, fontSize: 9 }, invoice: { flexDirection: "row", alignItems: "center" }, invoiceIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Colors.primaryLight }, invoiceInfo: { flex: 1, marginHorizontal: Spacing.sm }, invoiceTitle: { color: Colors.text, fontWeight: "700" }, invoiceDetail: { marginTop: 4, color: Colors.subtitle, fontSize: Typography.small }, invoiceValue: { marginRight: Spacing.sm, color: Colors.text, fontWeight: "700" } });
