import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import {
  Alert,
  RefreshControl,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useState } from "react";

import {
  Badge,
  Button,
  Card,
  Divider,
  ElasticScrollView as ScrollView,
  EmptyState,
  Loading,
  Screen,
} from "../../components/ui";
import { useContrato } from "../../hooks/useContrato";
import { useDashboard } from "../../hooks/useDashboard";
import { useAuth } from "../../contexts/AuthContext";
import ClienteHeader from "../../components/cliente/ClienteHeader";
import {
  cancelarContrato,
  importarContratoAssinadoPeloCliente,
  registrarAceiteEletronico,
} from "../../services/contratos.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";
import { useQueryClient } from "@tanstack/react-query";

function formatarData(data?: string) {
  if (!data) return "Não informado";

  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return data;

  return valor.toLocaleDateString("pt-BR");
}

function normalizarStatus(status?: string) {
  return (status ?? "Ativo").trim().toUpperCase();
}

export default function Contrato() {
  const { data, isLoading, error, refetch: recarregarContrato } = useContrato();
  const { data: dashboard, refetch: recarregarDashboard } = useDashboard();
  const { unidadeSelecionada } = useAuth();
  const queryClient = useQueryClient();
  const [atualizando, setAtualizando] = useState(false);
  const [registrandoAceite, setRegistrandoAceite] = useState(false);
  const [enviandoAssinado, setEnviandoAssinado] = useState(false);

  async function atualizarPagina() {
    setAtualizando(true);
    try {
      await Promise.all([recarregarContrato(), recarregarDashboard()]);
    } finally {
      setAtualizando(false);
    }
  }

  if (isLoading) return <Loading />;

  if (error || !data) {
    return (
      <Screen>
        <View style={styles.stateContainer}>
          <EmptyState
            icon="document-text-outline"
            title="Contrato não encontrado"
            subtitle="Não localizamos um contrato vinculado à sua conta. Fale com o suporte se precisar de ajuda."
          />
        </View>
      </Screen>
    );
  }

  const status = normalizarStatus(data.status);
  const ativo = ["ATIVO", "VIGENTE"].includes(status);
  const vencido =
    status === "VENCIDO" ||
    Boolean(
      data.vigencia_fim &&
      new Date(`${data.vigencia_fim}T23:59:59`).getTime() < Date.now(),
    );
  const economiaMensal = Number(
    dashboard?.economiaMes ?? data.economia_mensal_estimada ?? 0,
  );
  const economiaAnual = Number(
    data.economia_anual_estimada ?? economiaMensal * 12,
  );
  const arquivoContrato =
    data.contrato_assinado_url ?? data.contrato_gerado_url ?? data.arquivo_pdf;
  const aceiteRegistrado = Boolean(data.aceite_cliente_em);
  const pdfAssinadoEnviado = Boolean(data.contrato_assinado_url);

  async function abrirContrato() {
    if (!arquivoContrato) {
      Alert.alert("Contrato", "O documento em PDF ainda não está disponível.");
      return;
    }

    try {
      const podeAbrir = await Linking.canOpenURL(arquivoContrato);
      if (!podeAbrir) throw new Error("URL não suportada");
      await Linking.openURL(arquivoContrato);
    } catch {
      Alert.alert(
        "Não foi possível abrir o contrato",
        "Confira sua conexão ou fale com o suporte.",
      );
    }
  }

  function confirmarAceite() {
    Alert.alert(
      "Registrar aceite",
      "Você confirma que leu e aceita as condições deste contrato? O aceite será registrado com a data, hora e sua conta. Para assinatura digital gratuita, use também o GOV.BR.",
      [
        { text: "Voltar", style: "cancel" },
        {
          text: "Li e aceito",
          onPress: async () => {
            setRegistrandoAceite(true);
            try {
              await registrarAceiteEletronico(data.id);
              await queryClient.invalidateQueries({ queryKey: ["contrato"] });
              Alert.alert(
                "Aceite registrado",
                "Seu aceite foi salvo. Se desejar, você pode assinar o PDF gratuitamente pelo GOV.BR e enviar o documento assinado aqui.",
              );
            } catch (erro: any) {
              Alert.alert(
                "Não foi possível registrar",
                erro?.response?.data?.message ?? "Tente novamente.",
              );
            } finally {
              setRegistrandoAceite(false);
            }
          },
        },
      ],
    );
  }

  async function assinarComGovBr() {
    if (!arquivoContrato) {
      Alert.alert(
        "PDF indisponível",
        "O gerador precisa gerar a minuta antes da assinatura.",
      );
      return;
    }
    await abrirContrato();
    setTimeout(() => {
      Alert.alert(
        "Assinatura gratuita",
        "Com o PDF aberto, salve-o e acesse o Assinador GOV.BR. Você precisará de uma conta GOV.BR nível prata ou ouro. Depois, envie aqui o PDF assinado.",
        [
          { text: "Agora não", style: "cancel" },
          {
            text: "Abrir GOV.BR",
            onPress: () => Linking.openURL("https://assinador.iti.br/"),
          },
        ],
      );
    }, 350);
  }

  async function enviarPdfAssinado() {
    const resultado = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (resultado.canceled || !resultado.assets?.[0]) return;
    setEnviandoAssinado(true);
    try {
      await importarContratoAssinadoPeloCliente(data.id, resultado.assets[0]);
      await queryClient.invalidateQueries({ queryKey: ["contrato"] });
      Alert.alert(
        "Contrato enviado",
        "O PDF assinado foi vinculado ao seu contrato.",
      );
    } catch (erro: any) {
      Alert.alert(
        "Não foi possível enviar",
        erro?.response?.data?.message ?? "Tente novamente.",
      );
    } finally {
      setEnviandoAssinado(false);
    }
  }

  function solicitarCancelamento() {
    if (!vencido) {
      Alert.alert(
        "Contrato vigente",
        "Para cancelar antes do vencimento, entre em contato com o gerador responsável.",
      );
      return;
    }
    Alert.alert(
      "Cancelar contrato",
      "Deseja realmente cancelar este contrato vencido?",
      [
        { text: "Voltar", style: "cancel" },
        {
          text: "Confirmar cancelamento",
          style: "destructive",
          onPress: async () => {
            try {
              const resultado = await cancelarContrato(data.id);
              await queryClient.invalidateQueries({ queryKey: ["contrato"] });
              Alert.alert(
                "Contrato cancelado",
                resultado?.faturaEncerramento
                  ? "O contrato foi cancelado. Uma fatura de encerramento foi gerada com o saldo de energia acumulado do cliente."
                  : "O contrato foi cancelado com sucesso.",
              );
            } catch (erro: any) {
              Alert.alert(
                "Não foi possível cancelar",
                erro?.response?.data?.message ??
                  erro?.message ??
                  "Tente novamente.",
              );
            }
          },
        },
      ],
    );
  }

  function solicitarRenovacao() {
    const assunto = encodeURIComponent(
      `Renovação antecipada do contrato ${data.numero ?? data.id}`,
    );
    const corpo = encodeURIComponent(
      `Olá, gostaria de antecipar a renovação do contrato ${data.numero ?? data.id}, vinculado à UC ${dashboard?.uc ?? unidadeSelecionada?.numero ?? ""}. Aguardo as novas condições para confirmar.`,
    );
    void Linking.openURL(
      `mailto:contato@andradeenergy.com.br?subject=${assunto}&body=${corpo}`,
    );
  }

  return (
    <Screen>
      <ClienteHeader
        cliente={dashboard?.cliente ?? "Cliente"}
        uc={dashboard?.uc ?? unidadeSelecionada?.numero ?? ""}
        distribuidora={
          dashboard?.distribuidora ??
          unidadeSelecionada?.distribuidora ??
          "Concessionária"
        }
        fullBleed
      />
      <ScrollView
        bounces
        alwaysBounceVertical
        overScrollMode="always"
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={atualizarPagina}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>DOCUMENTOS</Text>
          <Text style={styles.title}>Meu contrato</Text>
          <Text style={styles.subtitle}>
            Resumo do seu plano de energia e condições de adesão.
          </Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroHeader}>
            <View style={styles.heroIcon}>
              <Ionicons
                name="document-text-outline"
                size={24}
                color={Colors.surface}
              />
            </View>
            <Badge
              label={data.status || "Ativo"}
              variant={ativo ? "success" : "warning"}
            />
          </View>

          <Text style={styles.heroLabel}>Número do contrato</Text>
          <Text style={styles.heroValue}>{data.numero || "Não informado"}</Text>
          <Text style={styles.heroHint}>
            Andrade Energy · Energia por assinatura
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Resumo do contrato</Text>

        <Card>
          <InfoRow
            icon="pricetag-outline"
            label="Desconto contratado"
            value={`${Number(data.desconto ?? 0).toLocaleString("pt-BR")}%`}
          />
          <Divider />
          <InfoRow
            icon="create-outline"
            label="Termo de adesão"
            value={data.termo_adesao ?? data.numero ?? "Assinado digitalmente"}
          />
          <Divider />
          <InfoRow
            icon="flash-outline"
            label="Unidades consumidoras"
            value={String(
              data.unidades_consumidoras ?? (unidadeSelecionada ? 1 : 0),
            )}
          />
        </Card>

        <Text style={styles.sectionTitle}>Economia estimada</Text>
        <Card>
          <View style={styles.economyGrid}>
            <View style={styles.economyItem}>
              <Text style={styles.infoLabel}>Mensal</Text>
              <Text style={styles.economyValue}>
                {economiaMensal.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </Text>
            </View>
            <View style={styles.economyItem}>
              <Text style={styles.infoLabel}>Anual</Text>
              <Text style={styles.economyValue}>
                {economiaAnual.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </Text>
            </View>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Vigência</Text>

        <Card>
          <View style={styles.period}>
            <View style={styles.periodItem}>
              <Text style={styles.periodLabel}>INÍCIO</Text>
              <Text style={styles.periodValue}>
                {formatarData(data.vigencia_inicio)}
              </Text>
            </View>

            <View style={styles.periodLine}>
              <View style={styles.periodDot} />
              <View style={styles.periodTrack} />
              <View style={styles.periodDot} />
            </View>

            <View style={[styles.periodItem, styles.periodItemEnd]}>
              <Text style={styles.periodLabel}>TÉRMINO</Text>
              <Text style={styles.periodValue}>
                {formatarData(data.vigencia_fim)}
              </Text>
            </View>
          </View>
        </Card>

        <Button
          disabled={!arquivoContrato}
          icon={
            <Ionicons
              name="download-outline"
              size={20}
              color={Colors.surface}
            />
          }
          onPress={abrirContrato}
          title={
            arquivoContrato
              ? pdfAssinadoEnviado
                ? "Abrir contrato assinado"
                : "Abrir minuta do contrato"
              : "PDF ainda não disponível"
          }
        />

        <Text style={styles.sectionTitle}>Assinatura</Text>
        <Card>
          <InfoRow
            icon={
              aceiteRegistrado
                ? "checkmark-circle-outline"
                : "shield-checkmark-outline"
            }
            label="Aceite no aplicativo"
            value={
              aceiteRegistrado
                ? `Registrado em ${formatarData(data.aceite_cliente_em)}`
                : "Pendente"
            }
          />
          <Divider />
          <InfoRow
            icon={
              pdfAssinadoEnviado
                ? "document-attach-outline"
                : "document-outline"
            }
            label="Assinatura digital"
            value={
              pdfAssinadoEnviado
                ? "PDF assinado vinculado"
                : "Opcional pelo GOV.BR"
            }
          />
        </Card>

        {!aceiteRegistrado ? (
          <Button
            disabled={registrandoAceite || !arquivoContrato}
            icon={
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color={Colors.surface}
              />
            }
            onPress={confirmarAceite}
            title={
              registrandoAceite
                ? "Registrando aceite..."
                : "Li e aceito o contrato"
            }
          />
        ) : null}

        {!pdfAssinadoEnviado ? (
          <>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={assinarComGovBr}
              style={styles.govButton}
            >
              <Ionicons name="open-outline" size={20} color={Colors.primary} />
              <Text style={styles.govButtonText}>
                Assinar gratuitamente no GOV.BR
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={enviandoAssinado}
              onPress={enviarPdfAssinado}
              style={styles.uploadButton}
            >
              <Ionicons
                name="cloud-upload-outline"
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.govButtonText}>
                {enviandoAssinado ? "Enviando PDF..." : "Enviar PDF assinado"}
              </Text>
            </TouchableOpacity>
          </>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={solicitarRenovacao}
          style={styles.renewButton}
        >
          <Ionicons
            name="refresh-circle-outline"
            size={21}
            color={Colors.primary}
          />
          <View style={styles.renewCopy}>
            <Text style={styles.renewTitle}>Antecipar renovação</Text>
            <Text style={styles.renewText}>
              Solicite as novas condições antes do término e confirme antes de
              renovar.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={solicitarCancelamento}
          style={styles.cancelButton}
        >
          <Ionicons
            name="close-circle-outline"
            size={20}
            color={vencido ? Colors.danger : Colors.subtitle}
          />
          <Text style={styles.cancelButtonText}>Cancelar contrato</Text>
        </TouchableOpacity>

        <View style={styles.securityNote}>
          <Ionicons
            name="shield-checkmark-outline"
            size={18}
            color={Colors.primary}
          />
          <Text style={styles.securityText}>
            Documento vinculado à sua unidade consumidora.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={20} color={Colors.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl * 3,
  },
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.lg,
  },
  heading: {
    marginBottom: Spacing.lg,
  },
  eyebrow: {
    color: Colors.primary,
    fontSize: Typography.small,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
  title: {
    marginTop: Spacing.xs,
    color: Colors.text,
    fontSize: Typography.title,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: Spacing.xs,
    color: Colors.subtitle,
    fontSize: Typography.caption,
    lineHeight: 20,
  },
  hero: {
    position: "relative",
    overflow: "hidden",
    marginBottom: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primaryDark,
  },
  heroBackground: {
    borderRadius: Radius.xl,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4, 42, 31, 0.34)",
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  heroLabel: {
    marginTop: Spacing.lg,
    color: "#CBD5E1",
    fontSize: Typography.caption,
  },
  heroValue: {
    marginTop: 4,
    color: Colors.surface,
    fontSize: Typography.section,
    fontWeight: "800",
  },
  heroHint: {
    marginTop: Spacing.sm,
    color: "#CBD5E1",
    fontSize: Typography.small,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
    color: Colors.subtitle,
    fontSize: Typography.caption,
    fontWeight: "700",
  },
  infoRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
  },
  infoIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
  },
  infoContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  infoLabel: {
    color: Colors.subtitle,
    fontSize: Typography.small,
  },
  infoValue: {
    marginTop: 3,
    color: Colors.text,
    fontSize: Typography.body,
    fontWeight: "700",
  },
  period: {
    flexDirection: "row",
    alignItems: "center",
  },
  periodItem: {
    flex: 1,
  },
  periodItemEnd: {
    alignItems: "flex-end",
  },
  periodLabel: {
    color: Colors.subtitle,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  periodValue: {
    marginTop: 5,
    color: Colors.text,
    fontSize: Typography.caption,
    fontWeight: "700",
  },
  periodLine: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.sm,
  },
  periodDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.round,
    backgroundColor: Colors.primary,
  },
  periodTrack: {
    flex: 1,
    height: 2,
    backgroundColor: "#D1FAE5",
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
  },
  renewButton: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryLight,
  },
  renewCopy: { flex: 1 },
  renewTitle: {
    color: Colors.primary,
    fontSize: Typography.body,
    fontWeight: "800",
  },
  renewText: {
    marginTop: 2,
    color: Colors.subtitle,
    fontSize: Typography.small,
    lineHeight: 16,
  },
  cancelButton: {
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: Spacing.sm,
    borderColor: Colors.danger,
    borderWidth: 1,
    borderRadius: Radius.lg,
  },
  cancelButtonText: {
    marginLeft: Spacing.xs,
    color: Colors.danger,
    fontSize: Typography.body,
    fontWeight: "700",
  },
  govButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: Spacing.sm,
    borderColor: Colors.primary,
    borderWidth: 1,
    borderRadius: Radius.lg,
  },
  uploadButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: Spacing.sm,
    borderColor: Colors.primaryLight,
    borderWidth: 1,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryLight,
  },
  govButtonText: {
    marginLeft: Spacing.xs,
    color: Colors.primary,
    fontSize: Typography.body,
    fontWeight: "700",
  },
  economyGrid: { flexDirection: "row", justifyContent: "space-between" },
  economyItem: { flex: 1 },
  economyValue: {
    marginTop: 5,
    color: Colors.primary,
    fontSize: Typography.section,
    fontWeight: "800",
  },
  securityText: {
    marginLeft: Spacing.xs,
    color: Colors.subtitle,
    fontSize: Typography.small,
  },
});
