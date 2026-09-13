import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import CommercialTabs from "../../components/commercial/CommercialTabs";
import { AppHeader, ElasticScrollView as ScrollView, Screen } from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import {
  alterarStatusAssinatura,
  arquivarAssinatura,
  contratarPlano,
  gerarCobrancaAssinatura,
  obterPainelComercial,
  obterFinanceiroAssinaturas,
  PainelComercial,
  configurarFinanceiroAssinaturas,
  salvarPlanoComercial,
  transferirFinanceiroAssinaturas,
} from "../../services/comercial.service";
import { Colors, Radius, Shadows, Spacing, Typography } from "../../theme";

const money = (value: unknown) =>
  Number(value ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
const date = (value: unknown) =>
  value
    ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString(
        "pt-BR",
      )
    : "—";

export default function GestaoGeradores() {
  const params = useLocalSearchParams<{ aba?: string }>();
  const { user } = useAuth();
  const [data, setData] = useState<PainelComercial | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuAberto, setMenuAberto] = useState(false);
  const [planoEditando, setPlanoEditando] = useState<any>(null);
  const [carteira, setCarteira] = useState<any>(null);
  const [pixTipo, setPixTipo] = useState("CPF");
  const [pixChave, setPixChave] = useState("");
  const [senhaFinanceira, setSenhaFinanceira] = useState("");
  const [saque, setSaque] = useState("");
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false);
  const [aba, setAba] = useState<
    | "RESUMO"
    | "GERADORES"
    | "ASSINATURAS"
    | "PAGAMENTOS"
    | "PLANOS"
  >(
    [
      "RESUMO",
      "GERADORES",
      "ASSINATURAS",
      "PAGAMENTOS",
      "PLANOS",
    ].includes(String(params.aba))
      ? (params.aba as any)
      : "RESUMO",
  );
  const load = useCallback(async () => {
    try {
      const [painel, carteiraAtual] = await Promise.all([
        obterPainelComercial(),
        obterFinanceiroAssinaturas().catch(() => null),
      ]);
      setData(painel);
      setCarteira(carteiraAtual);
    } catch (error: any) {
      Alert.alert(
        "Gestão comercial",
        error?.response?.data?.message ?? "Não foi possível carregar os dados.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (["GERADORES", "ASSINATURAS", "PAGAMENTOS", "PLANOS"].includes(String(params.aba))) {
      setAba(params.aba as "GERADORES" | "ASSINATURAS" | "PAGAMENTOS" | "PLANOS");
    }
  }, [params.aba]);
  if (user?.perfil !== "ADMIN")
    return (
      <Screen>
        <View style={styles.blocked}>
          <Ionicons
            name="lock-closed-outline"
            size={38}
            color={Colors.danger}
          />
          <Text style={styles.title}>Acesso restrito</Text>
          <Text style={styles.subtitle}>
            Somente a administração gerencia planos e assinaturas.
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.link}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  return (
    <Screen>
      <AppHeader
        collapsePlantContextOnMount
        environmentName="Gestão comercial"
        icon="briefcase-outline"
        showPlantContext={false}
        title="Gestão comercial"
        subtitle="Administração"
        contextTitle={aba === "ASSINATURAS" ? "Assinaturas" : aba === "GERADORES" ? "Geradores" : aba === "PAGAMENTOS" ? "Financeiro" : aba === "PLANOS" ? "Planos" : "Gestão de geradores"}
        contextSubtitle="Cadastros, planos e situação comercial"
      />
      <Modal
        animationType="fade"
        transparent
        visible={menuAberto}
        onRequestClose={() => setMenuAberto(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setMenuAberto(false)}>
          <Pressable
            style={styles.drawer}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Gestão de geradores</Text>
              <TouchableOpacity onPress={() => setMenuAberto(false)}>
                <Ionicons name="close" size={26} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <DrawerLink
              icon="home-outline"
              label="Painel comercial"
              onPress={() => {
                setMenuAberto(false);
                router.replace("/admin/comercial" as any);
              }}
            />
            <DrawerLink
              icon="grid-outline"
              label="Visão geral"
              onPress={() => {
                setMenuAberto(false);
                setAba("RESUMO");
              }}
            />
            <DrawerLink
              icon="business-outline"
              label="Geradores"
              onPress={() => {
                setMenuAberto(false);
                setAba("GERADORES");
              }}
            />
            <DrawerLink
              icon="card-outline"
              label="Assinaturas"
              onPress={() => {
                setMenuAberto(false);
                setAba("ASSINATURAS");
              }}
            />
            <DrawerLink
              icon="cash-outline"
              label="Financeiro"
              onPress={() => {
                setMenuAberto(false);
                setAba("PAGAMENTOS");
              }}
            />
            <DrawerLink
              icon="pricetags-outline"
              label="Planos"
              onPress={() => {
                setMenuAberto(false);
                setAba("PLANOS");
              }}
            />
            <DrawerLink
              icon="pulse-outline"
              label="Clientes ativos"
              onPress={() => {
                setMenuAberto(false);
                router.push("/geradores/monitoramento" as any);
              }}
            />
            <DrawerLink icon="play-circle-outline" label="Tutoriais" onPress={() => { setMenuAberto(false); router.push("/tutoriais" as any); }} />
          </Pressable>
        </Pressable>
      </Modal>
      <Modal animationType="slide" transparent visible={Boolean(planoEditando)} onRequestClose={() => setPlanoEditando(null)}>
        <Pressable style={styles.backdrop} onPress={() => setPlanoEditando(null)}>
          <Pressable style={styles.planEditor} onPress={(event) => event.stopPropagation()}>
            <View style={styles.drawerHeader}><Text style={styles.drawerTitle}>{planoEditando?.id ? "Editar plano" : "Novo plano"}</Text><TouchableOpacity onPress={() => setPlanoEditando(null)}><Ionicons name="close" size={26} color={Colors.text}/></TouchableOpacity></View>
            <Text style={styles.inputLabel}>Nome</Text><TextInput style={styles.input} value={planoEditando?.nome ?? ""} onChangeText={(nome) => setPlanoEditando((current:any) => ({...current,nome}))}/>
            <Text style={styles.inputLabel}>Descrição</Text><TextInput style={styles.input} value={planoEditando?.descricao ?? ""} onChangeText={(descricao) => setPlanoEditando((current:any) => ({...current,descricao}))}/>
            <View style={styles.editorRow}><View style={styles.grow}><Text style={styles.inputLabel}>Mensal (R$)</Text><TextInput keyboardType="decimal-pad" style={styles.input} value={String(planoEditando?.valorMensal ?? "")} onChangeText={(valorMensal) => setPlanoEditando((current:any) => ({...current,valorMensal}))}/></View><View style={styles.grow}><Text style={styles.inputLabel}>Anual (R$)</Text><TextInput keyboardType="decimal-pad" style={styles.input} value={String(planoEditando?.valorAnual ?? "")} onChangeText={(valorAnual) => setPlanoEditando((current:any) => ({...current,valorAnual}))}/></View></View>
            <View style={styles.editorRow}><View style={styles.grow}><Text style={styles.inputLabel}>Limite de usinas</Text><TextInput keyboardType="number-pad" style={styles.input} value={String(planoEditando?.limiteUsinas ?? "")} onChangeText={(limiteUsinas) => setPlanoEditando((current:any) => ({...current,limiteUsinas}))}/></View><View style={styles.grow}><Text style={styles.inputLabel}>Limite de clientes</Text><TextInput keyboardType="number-pad" style={styles.input} value={String(planoEditando?.limiteClientes ?? "")} onChangeText={(limiteClientes) => setPlanoEditando((current:any) => ({...current,limiteClientes}))}/></View></View>
            <Text style={styles.inputLabel}>Recursos (um por linha)</Text><TextInput multiline style={[styles.input,styles.resourcesInput]} value={planoEditando?.recursosTexto ?? ""} onChangeText={(recursosTexto) => setPlanoEditando((current:any) => ({...current,recursosTexto}))}/>
            <View style={styles.switchRow}><Text style={styles.cardTitle}>Plano disponível</Text><Switch value={planoEditando?.ativo !== false} onValueChange={(ativo) => setPlanoEditando((current:any) => ({...current,ativo}))}/></View>
            <TouchableOpacity style={styles.primaryButton} onPress={() => void savePlan()}><Text style={styles.primaryButtonText}>Salvar e refletir em todo o sistema</Text></TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={load}
            tintColor={Colors.primary}
          />
        }
      >
        {loading && !data ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabs}
            >
              {(
                [
                  ["RESUMO", "Visão geral"],
                  ["GERADORES", "Geradores"],
                  ["ASSINATURAS", "Assinaturas"],
                  ["PAGAMENTOS", "Financeiro"],
                  ["PLANOS", "Planos"],
                ] as const
              ).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setAba(key)}
                  style={[styles.tab, aba === key && styles.tabActive]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      aba === key && styles.tabTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {aba === "RESUMO" ? (
              <>
                <View style={styles.metrics}>
                  <Metric
                    label="ASSINATURAS"
                    value={String(data?.resumo.total ?? 0)}
                  />
                  <Metric
                    label="ATIVAS"
                    value={String(data?.resumo.ativas ?? 0)}
                    success
                  />
                  <Metric
                    label="INADIMPLENTES"
                    value={String(data?.resumo.inadimplentes ?? 0)}
                    danger
                  />
                  <Metric
                    label="MRR PREVISTO"
                    value={money(data?.resumo.receitaMensalPrevista)}
                  />
                </View>
                <View style={styles.overviewGrid}>
                  <TouchableOpacity
                    onPress={() => setAba("GERADORES")}
                    style={styles.overviewCard}
                  >
                    <Ionicons
                      name="people-outline"
                      size={24}
                      color={Colors.primary}
                    />
                    <Text style={styles.overviewValue}>
                      {data?.geradores.filter(
                        (item) => item.perfil === "GESTOR",
                      ).length ?? 0}
                    </Text>
                    <Text style={styles.muted}>contas geradoras</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setAba("ASSINATURAS")}
                    style={styles.overviewCard}
                  >
                    <Ionicons
                      name="card-outline"
                      size={24}
                      color={Colors.primary}
                    />
                    <Text style={styles.overviewValue}>
                      {data?.assinaturas.length ?? 0}
                    </Text>
                    <Text style={styles.muted}>licenças cadastradas</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
            {aba === "PLANOS" ? (
              <>
                <View style={styles.sectionHeader}><Text style={styles.section}>PLANOS COMERCIAIS</Text><TouchableOpacity style={styles.addButton} onPress={() => setPlanoEditando({ ativo:true, valorMensal:"", valorAnual:"", recursosTexto:"" })}><Ionicons name="add" size={18} color="#FFF"/><Text style={styles.addButtonText}>Novo plano</Text></TouchableOpacity></View>
                {(data?.planos ?? []).map((plan) => (
                  <TouchableOpacity activeOpacity={0.82} style={styles.card} key={plan.id} onPress={() => setPlanoEditando({ ...plan, valorMensal:plan.valor_mensal, valorAnual:plan.valor_anual, limiteUsinas:plan.limite_usinas, limiteClientes:plan.limite_clientes, recursosTexto:(plan.recursos ?? []).join("\n") })}>
                    <View style={styles.row}>
                      <View style={styles.grow}>
                        <Text style={styles.cardTitle}>{plan.nome}</Text>
                        <Text style={styles.subtitle}>{plan.descricao}</Text>
                      </View>
                      <View style={styles.planPrice}>
                        <Text style={styles.price}>
                          {money(plan.valor_mensal)}
                        </Text>
                        <Text style={styles.muted}>/mês</Text>
                      </View>
                    </View>
                    <Text style={styles.resources}>
                      {(plan.recursos ?? []).join(" • ")}
                    </Text>
                    <Text style={styles.annual}>
                      Anual: {money(plan.valor_anual)}
                    </Text>
                    <Text style={styles.editHint}>Toque para editar valores e benefícios</Text>
                  </TouchableOpacity>
                ))}
              </>
            ) : null}
            {aba === "GERADORES" ? (
              <>
                <Text style={styles.section}>GERADORES E ASSINATURAS</Text>
                {(data?.geradores ?? [])
                  .filter((generator) => ["ADMIN", "GESTOR"].includes(generator.perfil))
                  .sort((a, b) => Number(b.perfil === "ADMIN") - Number(a.perfil === "ADMIN") || String(a.nome ?? "").localeCompare(String(b.nome ?? ""), "pt-BR"))
                  .map((generator) => {
                    const assinatura = (data?.assinaturas ?? []).find((item) => item.gerador_id === generator.id && item.status !== "CANCELADA");
                    const administrador = generator.perfil === "ADMIN";
                    return (
                    <TouchableOpacity activeOpacity={0.84} onPress={() => router.push({ pathname: "/geradores/[id]", params: { id: generator.id } } as any)} style={[styles.card, administrador && styles.adminGeneratorCard]} key={generator.id}>
                      <View style={styles.row}>
                        <View style={styles.grow}>
                          <Text style={styles.cardTitle}>{generator.nome}</Text>
                          <Text style={styles.subtitle}>{generator.email}</Text>
                        </View>
                        <Text style={administrador ? styles.adminBadge : assinatura ? styles.badge : styles.badgeNeutral}>{administrador ? "ADMIN · FIXO" : assinatura?.status ?? "SEM PLANO"}</Text>
                      </View>
                      <View style={styles.generatorDataGrid}>
                        <Text style={styles.generatorData}>CPF: {generator.cpf || "Não informado"}</Text>
                        <Text style={styles.generatorData}>Telefone: {generator.telefone || "Não informado"}</Text>
                        <Text style={styles.generatorData}>Usinas: {generator.total_usinas ?? 0}</Text>
                        <Text style={styles.generatorData}>UCs ativas: {generator.total_ucs_ativas ?? 0}</Text>
                        <Text style={styles.generatorData}>Cadastro: {date(generator.created_at)}</Text>
                        <Text style={styles.generatorData}>Conta: {generator.ativo ? "Ativa" : "Inativa"}</Text>
                      </View>
                      <Text style={[styles.muted, { marginTop: Spacing.sm }]}>
                        {administrador ? "Conta administrativa principal — permanece fixa na lista." : assinatura ? `${assinatura.plano?.nome ?? "Plano ativo"} · vence em ${date(assinatura.proximo_vencimento)}` : "Vincule um plano para liberar o acesso deste gerador."}
                      </Text>
                      {!administrador && !assinatura ? <><View style={styles.trialNote}>
                        <Ionicons
                          name="gift-outline"
                          size={16}
                          color={Colors.primary}
                        />
                        <Text style={styles.trialNoteText}>
                          45 dias de teste antes da primeira cobrança
                        </Text>
                      </View>
                      <View style={styles.actions}>
                        <Action
                          label="Plano mensal"
                          icon="calendar-outline"
                          onPress={() => escolherPlano(generator.id, "MENSAL")}
                        />
                        <Action
                          label="Plano anual"
                          icon="calendar-number-outline"
                          onPress={() => escolherPlano(generator.id, "ANUAL")}
                        />
                      </View></> : <View style={styles.trialNote}><Ionicons name={administrador ? "shield-checkmark-outline" : "open-outline"} size={16} color={Colors.primary}/><Text style={styles.trialNoteText}>{administrador ? "Conta protegida contra remoção" : "Toque para consultar todas as informações"}</Text></View>}
                    </TouchableOpacity>
                  );})}
              </>
            ) : null}
            {aba === "ASSINATURAS" ? (
              <>
                <View style={styles.walletHero}>
                  <View>
                    <Text style={styles.walletHeroEyebrow}>
                      CARTEIRA COMERCIAL
                    </Text>
                    <Text style={styles.walletHeroValue}>
                      {money(data?.financeiro?.totalRecebido)}
                    </Text>
                    <Text style={styles.walletHeroCaption}>
                      Total confirmado em pagamentos
                    </Text>
                  </View>
                  <View style={styles.walletHeroStats}>
                    <View>
                      <Text style={styles.walletHeroStatValue}>
                        {data?.resumo.ativas ?? 0}
                      </Text>
                      <Text style={styles.walletHeroStatLabel}>ativas</Text>
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.walletHeroStatValue,
                          { color: "#FECACA" },
                        ]}
                      >
                        {data?.resumo.inadimplentes ?? 0}
                      </Text>
                      <Text style={styles.walletHeroStatLabel}>
                        inadimplentes
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.section}>ASSINATURAS DA CARTEIRA</Text>
                <View style={styles.row}>
                  <Text style={styles.muted}>Histórico cancelado preservado</Text>
                  <TouchableOpacity onPress={() => setMostrarArquivadas((value) => !value)}>
                    <Text style={styles.link}>{mostrarArquivadas ? "Ocultar arquivadas" : "Ver arquivadas"}</Text>
                  </TouchableOpacity>
                </View>
                {(data?.assinaturas ?? [])
                  .filter((item) => mostrarArquivadas ? Boolean(item.arquivada_em) : !item.arquivada_em)
                  .map((subscription) => (
                  <View style={styles.card} key={subscription.id}>
                    <View style={styles.row}>
                      <View style={styles.grow}>
                        <Text style={styles.cardTitle}>
                          {subscription.gerador?.nome ?? "Gerador"}
                        </Text>
                        <Text style={styles.subtitle}>
                          {subscription.gerador?.email ?? "—"}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.badge,
                          subscription.status === "INADIMPLENTE" &&
                            styles.badgeDanger,
                        ]}
                      >
                        {subscription.status}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text>
                        {subscription.plano?.nome ?? "Sem plano"} ·{" "}
                        {subscription.ciclo}
                      </Text>
                      <Text>{money(subscription.valor_contratado)}</Text>
                    </View>
                    <Text style={styles.muted}>
                      Próximo vencimento:{" "}
                      {date(subscription.proximo_vencimento)}
                    </Text>
                    <View style={styles.actions}>
                      <Action
                        label="Gerar cobrança"
                        icon="receipt-outline"
                        onPress={async () => {
                          try {
                            await gerarCobrancaAssinatura(subscription.id);
                            Alert.alert(
                              "Cobrança gerada",
                              "A cobrança da assinatura foi criada no Asaas.",
                            );
                            await load();
                          } catch (e: any) {
                            Alert.alert(
                              "Cobrança",
                              e?.response?.data?.message ??
                                "Não foi possível gerar.",
                            );
                          }
                        }}
                      />
                      <Action
                        label={
                          subscription.status === "SUSPENSA"
                            ? "Reativar"
                            : "Suspender"
                        }
                        icon={
                          subscription.status === "SUSPENSA"
                            ? "play-outline"
                            : "pause-outline"
                        }
                        onPress={async () => {
                          try {
                            await alterarStatusAssinatura(
                              subscription.id,
                              subscription.status === "SUSPENSA"
                                ? "ATIVA"
                                : "SUSPENSA",
                            );
                            await load();
                          } catch (e: any) {
                            Alert.alert(
                              "Assinatura",
                              e?.response?.data?.message ??
                                "Não foi possível alterar o status.",
                            );
                          }
                        }}
                      />
                      {subscription.status === "CANCELADA" ? (
                        <Action
                          label={subscription.arquivada_em ? "Restaurar" : "Arquivar"}
                          icon={subscription.arquivada_em ? "arrow-undo-outline" : "archive-outline"}
                          onPress={() =>
                            Alert.alert(
                              subscription.arquivada_em ? "Restaurar assinatura" : "Arquivar assinatura",
                              subscription.arquivada_em
                                ? "A assinatura voltará para a lista principal."
                                : "Ela sairá da lista principal, mas cobranças e histórico serão preservados.",
                              [
                                { text: "Cancelar", style: "cancel" },
                                {
                                  text: subscription.arquivada_em ? "Restaurar" : "Arquivar",
                                  onPress: async () => {
                                    try {
                                      await arquivarAssinatura(subscription.id, !subscription.arquivada_em);
                                      await load();
                                    } catch (e: any) {
                                      Alert.alert("Assinatura", e?.response?.data?.message ?? "Não foi possível arquivar.");
                                    }
                                  },
                                },
                              ],
                            )
                          }
                        />
                      ) : null}
                    </View>
                  </View>
                ))}
                {!data?.assinaturas.length ? (
                  <View style={styles.empty}>
                    <Text style={styles.cardTitle}>
                      Nenhuma assinatura criada
                    </Text>
                    <Text style={styles.subtitle}>
                      Use o portal web para vincular o primeiro plano a um
                      gerador.
                    </Text>
                  </View>
                ) : null}
              </>
            ) : null}
            {aba === "PAGAMENTOS" ? (
              <>
                <View style={styles.paymentSummary}>
                  <View>
                    <Text style={styles.paymentSummaryLabel}>
                      RECEBIDO NO MÊS
                    </Text>
                    <Text style={styles.paymentSummaryValue}>
                      {money(data?.financeiro?.recebidoNoMes)}
                    </Text>
                  </View>
                  <View style={styles.paymentSummarySide}>
                    <Text style={styles.paymentSummarySideValue}>
                      {money(data?.financeiro?.pendenteNoMes)}
                    </Text>
                    <Text style={styles.muted}>a receber</Text>
                  </View>
                </View>
                <Text style={styles.section}>FATURAMENTO DAS ASSINATURAS</Text>
                {(data?.cobrancas ?? []).map((charge) => {
                  const status = String(charge.status ?? "PENDENTE");
                  const customer =
                    charge.assinatura?.gerador?.nome ?? "Gerador";
                  const paymentUrl = charge.bank_slip_url ?? charge.invoice_url;
                  return (
                    <View style={styles.card} key={charge.id}>
                      <View style={styles.row}>
                        <View style={styles.grow}>
                          <Text style={styles.cardTitle}>{customer}</Text>
                          <Text style={styles.subtitle}>
                            {charge.competencia} · vence em{" "}
                            {date(charge.vencimento)}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.badge,
                            status === "VENCIDA" && styles.badgeDanger,
                            status === "PENDENTE" && styles.badgePending,
                          ]}
                        >
                          {status}
                        </Text>
                      </View>
                      <View style={styles.paymentValueRow}>
                        <Text style={styles.paymentValue}>
                          {money(charge.valor)}
                        </Text>
                        <Text style={styles.muted}>
                          {charge.assinatura?.plano?.nome ??
                            "Licença Andrade Energy"}
                        </Text>
                      </View>
                      {paymentUrl ? (
                        <TouchableOpacity
                          onPress={() => void Linking.openURL(paymentUrl)}
                          style={styles.openPayment}
                        >
                          <Ionicons
                            name="open-outline"
                            size={17}
                            color={Colors.primary}
                          />
                          <Text style={styles.openPaymentText}>
                            Abrir cobrança
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  );
                })}
                {!data?.cobrancas.length ? (
                  <View style={styles.empty}>
                    <Ionicons
                      name="receipt-outline"
                      size={28}
                      color={Colors.primary}
                    />
                    <Text style={styles.cardTitle}>
                      Nenhuma cobrança gerada
                    </Text>
                    <Text style={styles.subtitle}>
                      Abra Assinaturas e use “Gerar cobrança” para iniciar o
                      faturamento.
                    </Text>
                  </View>
                ) : null}
                <View style={styles.notice}>
                  <Ionicons
                    name="sync-circle-outline"
                    size={22}
                    color={Colors.primary}
                  />
                  <Text style={styles.noticeText}>
                    Pagamentos são conciliados automaticamente pelo webhook do
                    Asaas. O gerador pode optar pela recorrência em cartão ou
                    Pix em “Minha assinatura”; sem recorrência, a administração
                    gera a cobrança avulsa.
                  </Text>
                </View>
                {carteira ? <>
                  <Text style={styles.section}>TRANSFERÊNCIAS ASAAS</Text>
                  <View style={[styles.card, styles.balanceCard]}><Text style={styles.balanceLabel}>SALDO DA CONTA ASAAS COMERCIAL</Text><Text style={styles.balanceValue}>{money(carteira.saldoDisponivel)}</Text><Text style={styles.balanceCaption}>{carteira.asaasConectado ? "Conta exclusiva das assinaturas conectada" : "Configure ASAAS_COMERCIAL_API_KEY para habilitar movimentações"}</Text></View>
                  <View style={styles.card}>
                    <Text style={styles.inputLabel}>Senha atual para confirmar alterações</Text><TextInput secureTextEntry autoCapitalize="none" style={styles.input} value={senhaFinanceira} onChangeText={setSenhaFinanceira} placeholder="Senha da administração"/>
                    <Text style={styles.inputLabel}>Tipo de chave Pix</Text><View style={styles.pixTypes}>{["CPF","CNPJ","EMAIL","PHONE","EVP"].map((tipo)=><TouchableOpacity key={tipo} onPress={()=>setPixTipo(tipo)} style={[styles.pixType,pixTipo===tipo&&styles.pixTypeActive]}><Text style={[styles.pixTypeText,pixTipo===tipo&&styles.pixTypeTextActive]}>{tipo}</Text></TouchableOpacity>)}</View>
                    <Text style={styles.inputLabel}>Chave Pix da Andrade Energy</Text><TextInput autoCapitalize="none" style={styles.input} value={pixChave} onChangeText={setPixChave} placeholder={carteira.pixChaveMascarada ?? "Informe a chave"}/>
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => void saveWallet()}><Text style={styles.secondaryButtonText}>Salvar dados de recebimento</Text></TouchableOpacity>
                    <View style={styles.switchRow}><View style={styles.grow}><Text style={styles.cardTitle}>Transferência automática</Text><Text style={styles.subtitle}>Transfere para a chave Pix após o recebimento.</Text></View><Switch value={carteira.transferenciaAutomatica} onValueChange={(value)=>void saveWallet(value)}/></View>
                    <Text style={styles.inputLabel}>Transferência manual</Text><TextInput keyboardType="decimal-pad" style={styles.input} value={saque} onChangeText={setSaque} placeholder="Valor em reais"/>
                    <TouchableOpacity style={styles.primaryButton} onPress={() => void withdraw()}><Text style={styles.primaryButtonText}>Transferir via Pix</Text></TouchableOpacity>
                  </View>
                </> : null}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
      <CommercialTabs active={aba === "ASSINATURAS" ? "ASSINATURAS" : aba === "PAGAMENTOS" ? "PAGAMENTOS" : aba === "PLANOS" ? "PLANOS" : "GERADORES"} />
    </Screen>
  );

  function escolherPlano(geradorId: string, ciclo: "MENSAL" | "ANUAL") {
    const planos = (data?.planos ?? []).filter((item) => item.ativo);
    if (!planos.length) {
      Alert.alert("Plano", "Nenhum plano comercial ativo foi encontrado.");
      return;
    }
    Alert.alert(
      ciclo === "ANUAL" ? "Escolha o plano anual" : "Escolha o plano mensal",
      "Toque no plano que será vinculado ao gerador.",
      planos.slice(0, 3).map((plano) => ({
        text: `${plano.nome} · ${money(ciclo === "ANUAL" ? plano.valor_anual : plano.valor_mensal)}`,
        onPress: () => void create(geradorId, ciclo, plano.id),
      })),
      { cancelable: true },
    );
  }

  async function create(geradorId: string, ciclo: "MENSAL" | "ANUAL", planoId: string) {
    const plan = data?.planos.find((item) => item.id === planoId && item.ativo);
    if (!plan)
      return Alert.alert("Plano", "Cadastre um plano ativo no portal web.");
    const due = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
    try {
      const result = await contratarPlano({
        geradorId,
        planoId: plan.id,
        ciclo,
        formaPagamento: "BOLETO",
        diasTeste: 45,
        inicioEm: new Date().toISOString().slice(0, 10),
        proximoVencimento: due,
      });
      Alert.alert(
        result.teste_concedido ? "Teste ativado" : "Assinatura ativada",
        result.teste_concedido
          ? `${plan.nome} foi vinculado com 45 dias de teste. A primeira cobrança vence em ${date(due)}.`
          : "Este CPF já utilizou o teste gratuito. O plano foi ativado sem um novo período de teste.",
      );
      await load();
    } catch (error: any) {
      Alert.alert(
        "Assinatura",
        error?.response?.data?.message ?? "Não foi possível vincular o plano.",
      );
    }
  }

  async function savePlan() {
    try {
      const current = planoEditando;
      await salvarPlanoComercial(current?.id, {
        nome: current?.nome,
        descricao: current?.descricao,
        valorMensal: Number(String(current?.valorMensal ?? "0").replace(",", ".")),
        valorAnual: Number(String(current?.valorAnual ?? "0").replace(",", ".")),
        limiteUsinas: current?.limiteUsinas || null,
        limiteClientes: current?.limiteClientes || null,
        recursos: String(current?.recursosTexto ?? "").split("\n").map((item)=>item.trim()).filter(Boolean),
        ativo: current?.ativo !== false,
      });
      setPlanoEditando(null);
      await load();
      Alert.alert("Plano atualizado", "Os novos valores já são a referência do app e da web.");
    } catch (error:any) { Alert.alert("Plano", error?.response?.data?.message ?? "Não foi possível salvar o plano."); }
  }

  async function saveWallet(automatic = carteira?.transferenciaAutomatica ?? false) {
    try {
      const updated = await configurarFinanceiroAssinaturas({ pixTipo, pixChave:pixChave || undefined, transferenciaAutomatica:automatic, senhaAtual:senhaFinanceira });
      setCarteira(updated); setPixChave(""); setSenhaFinanceira("");
      Alert.alert("Financeiro", "Configuração de transferência atualizada.");
    } catch (error:any) { Alert.alert("Financeiro", error?.response?.data?.message ?? "Não foi possível salvar."); }
  }

  async function withdraw() {
    const valor = Number(saque.replace(",", "."));
    if (!carteira?.asaasConectado) return Alert.alert("Asaas comercial", "Conecte a conta exclusiva das assinaturas antes de transferir.");
    if (!(valor > 0)) return Alert.alert("Transferência", "Informe um valor válido.");
    Alert.alert("Confirmar transferência", `Transferir ${money(valor)} para ${carteira?.pixChaveMascarada ?? "a chave cadastrada"}?`, [{text:"Cancelar",style:"cancel"},{text:"Transferir",onPress:async()=>{try{await transferirFinanceiroAssinaturas(valor,senhaFinanceira);setSaque("");setSenhaFinanceira("");setCarteira(await obterFinanceiroAssinaturas());Alert.alert("Transferência solicitada","A operação foi enviada à conta Asaas das assinaturas.");}catch(error:any){Alert.alert("Transferência",error?.response?.data?.message??"Não foi possível transferir.");}}}]);
  }
}

function Metric({ label, value, success, danger }: any) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        style={[
          styles.metricValue,
          success && { color: Colors.primary },
          danger && { color: Colors.danger },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}
function Action({ label, icon, onPress }: any) {
  return (
    <TouchableOpacity style={styles.action} onPress={onPress}>
      <Ionicons name={icon} size={18} color={Colors.primary} />
      <Text style={styles.actionText}>{label}</Text>
    </TouchableOpacity>
  );
}
function DrawerLink({ icon, label, onPress }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.drawerLink}>
      <Ionicons name={icon} size={21} color={Colors.primary} />
      <Text style={styles.drawerLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={17} color={Colors.subtitle} />
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  planEditor: { marginTop: "auto", maxHeight: "92%", padding: Spacing.lg, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, backgroundColor: Colors.surface },
  inputLabel: { marginTop: Spacing.sm, marginBottom: 6, color: Colors.text, fontSize: 12, fontWeight: "800" },
  input: { minHeight: 46, paddingHorizontal: 13, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, color: Colors.text, backgroundColor: Colors.background },
  resourcesInput: { minHeight: 82, paddingTop: 12, textAlignVertical: "top" },
  editorRow: { flexDirection: "row", gap: Spacing.sm },
  switchRow: { minHeight: 58, marginVertical: Spacing.sm, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.md },
  primaryButton: { minHeight: 48, marginTop: Spacing.sm, paddingHorizontal: Spacing.md, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Colors.primary },
  primaryButtonText: { color: "#FFF", fontWeight: "900", textAlign: "center" },
  secondaryButton: { minHeight: 46, marginBottom: Spacing.sm, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.md },
  secondaryButtonText: { color: Colors.primary, fontWeight: "800" },
  sectionHeader: { marginTop: Spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  addButton: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: Radius.round, backgroundColor: Colors.primary },
  addButtonText: { color: "#FFF", fontSize: 12, fontWeight: "800" },
  editHint: { marginTop: Spacing.sm, color: Colors.primary, fontSize: 11, fontWeight: "800" },
  balanceCard: { backgroundColor: "#083F31" },
  balanceLabel: { color: "#A7F3D0", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  balanceValue: { marginTop: 7, color: "#FFF", fontSize: 32, fontWeight: "900" },
  balanceCaption: { marginTop: 4, color: "#D1FAE5", fontSize: 12 },
  pixTypes: { marginBottom: Spacing.sm, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pixType: { paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.round },
  pixTypeActive: { borderColor: Colors.primary, backgroundColor: "#E7F5EE" },
  pixTypeText: { color: Colors.subtitle, fontSize: 11, fontWeight: "700" },
  pixTypeTextActive: { color: Colors.primary },
  header: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  headerTop: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerAction: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.round,
    backgroundColor: "rgba(255,255,255,.09)",
  },
  headerCopy: { flex: 1, minWidth: 0, marginLeft: 2 },
  headerEyebrow: {
    color: "#A7F3D0",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  headerTitle: { marginTop: 3, color: "#FFF", fontSize: 13, fontWeight: "800" },
  environmentSwitch: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,.12)",
  },
  environmentCurrent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: "#6EE7B7",
  },
  environmentLabel: { color: "#D8F0E3", fontSize: 12, fontWeight: "700" },
  environmentAction: {
    marginRight: 4,
    color: "#F6CC32",
    fontSize: 11,
    fontWeight: "900",
  },
  backdrop: {
    flex: 1,
    alignItems: "flex-start",
    backgroundColor: "rgba(15,23,42,.45)",
  },
  drawer: {
    width: "84%",
    height: "100%",
    paddingHorizontal: Spacing.lg,
    paddingTop: 58,
    backgroundColor: Colors.surface,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  drawerTitle: {
    color: Colors.text,
    fontSize: Typography.title,
    fontWeight: "900",
  },
  drawerLink: {
    minHeight: 55,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  drawerLabel: {
    flex: 1,
    marginLeft: Spacing.md,
    color: Colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  tabs: { gap: 8, paddingBottom: Spacing.md },
  tab: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.round,
    backgroundColor: "#E8F1EC",
  },
  tabActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  tabText: { color: Colors.text, fontSize: 12, fontWeight: "800" },
  tabTextActive: { color: "#FFF" },
  overviewGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  overviewCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: "#DDEBE4",
  },
  overviewValue: {
    marginTop: 7,
    color: Colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  blocked: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  title: {
    fontSize: Typography.section,
    fontWeight: "900",
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  subtitle: { color: Colors.subtitle, marginTop: 3 },
  link: { color: Colors.primary, fontWeight: "800", marginTop: Spacing.lg },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  metric: {
    width: "48%",
    backgroundColor: "#E8F1EC",
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadows.card,
  },
  metricLabel: { fontSize: 10, fontWeight: "800", color: Colors.subtitle },
  metricValue: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.text,
    marginTop: 6,
  },
  section: {
    fontSize: 12,
    fontWeight: "900",
    color: Colors.subtitle,
    letterSpacing: 1,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: "#F1F6F3",
    borderWidth: 1,
    borderColor: "#C7D9D0",
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  adminGeneratorCard: { borderWidth: 2, borderColor: "#D4A900", backgroundColor: "#FFFBEA" },
  adminBadge: { fontSize: 10, fontWeight: "900", color: "#665000", backgroundColor: "#F6CC32", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99 },
  generatorDataGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: Spacing.md },
  generatorData: { width: "48%", color: Colors.text, fontSize: 11, lineHeight: 17 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm },
  grow: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: "900", color: Colors.text },
  planPrice: { alignItems: "flex-end" },
  price: { fontSize: 17, fontWeight: "900", color: Colors.primary },
  muted: { fontSize: 12, color: Colors.subtitle, marginTop: 3 },
  resources: { color: Colors.text, lineHeight: 20, marginTop: Spacing.md },
  annual: { fontWeight: "800", color: Colors.text, marginTop: Spacing.sm },
  badge: {
    fontSize: 10,
    fontWeight: "900",
    color: Colors.primary,
    backgroundColor: "#E9F7EF",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 99,
  },
  badgeDanger: { color: Colors.danger, backgroundColor: "#FEECEC" },
  badgePending: { color: "#9A6700", backgroundColor: "#FFF3CD" },
  badgeNeutral: {
    fontSize: 10,
    fontWeight: "900",
    color: Colors.subtitle,
    backgroundColor: "#EEF2F0",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 99,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.md,
  },
  trialNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: Spacing.md,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
  },
  trialNoteText: {
    flex: 1,
    color: Colors.primary,
    fontSize: 11,
    fontWeight: "800",
  },
  actions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.md },
  action: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
  },
  actionText: { fontSize: 12, fontWeight: "800", color: Colors.primary },
  paymentSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: "#0A513E",
    ...Shadows.card,
  },
  walletHero: {
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: "#0A513E",
    ...Shadows.card,
  },
  walletHeroEyebrow: {
    color: "#A7F3D0",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  walletHeroValue: {
    marginTop: 5,
    color: "#FFF",
    fontSize: 28,
    fontWeight: "900",
  },
  walletHeroCaption: { marginTop: 3, color: "#D1FAE5", fontSize: 11 },
  walletHeroStats: {
    flexDirection: "row",
    gap: Spacing.xl,
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,.16)",
  },
  walletHeroStatValue: { color: "#FFF", fontSize: 20, fontWeight: "900" },
  walletHeroStatLabel: {
    marginTop: 2,
    color: "#D1FAE5",
    fontSize: 10,
    fontWeight: "700",
  },
  paymentSummaryLabel: {
    color: "#A7F3D0",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  paymentSummaryValue: {
    marginTop: 5,
    color: "#FFF",
    fontSize: 27,
    fontWeight: "900",
  },
  paymentSummarySide: { alignItems: "flex-end" },
  paymentSummarySideValue: {
    color: "#F6CC32",
    fontSize: 17,
    fontWeight: "900",
  },
  paymentValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: Spacing.md,
  },
  paymentValue: { color: Colors.text, fontSize: 22, fontWeight: "900" },
  openPayment: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
  },
  openPaymentText: { color: Colors.primary, fontSize: 12, fontWeight: "900" },
  empty: {
    padding: Spacing.xl,
    alignItems: "center",
    backgroundColor: "#E8F1EC",
    borderRadius: Radius.xl,
  },
  document: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  border: { borderTopWidth: 1, borderTopColor: Colors.border },
  documentTitle: { fontWeight: "800", color: Colors.text },
  notice: {
    flexDirection: "row",
    gap: Spacing.sm,
    backgroundColor: "#FFF7E0",
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  noticeText: { flex: 1, color: Colors.text, lineHeight: 19 },
});
