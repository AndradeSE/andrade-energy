import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Card, Divider, ElasticScrollView as ScrollView, Screen } from "../../components/ui";
import { Colors, Radius, Spacing, Typography } from "../../theme";

export default function PagamentoFaturaPendente() {
  const emPreparacao = () =>
    Alert.alert("Em preparação", "Este documento será disponibilizado após o faturamento.");

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heading}>
          <TouchableOpacity accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.back}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Fatura em aberto</Text>
            <Text style={styles.subtitle}>Aguardando o próximo faturamento</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>DOCUMENTOS E PAGAMENTO</Text>
        <PaymentRow icon="document-attach-outline" label="Fatura da concessionária" onPress={emPreparacao} />
        <PaymentRow icon="documents-outline" label="Fatura unificada" onPress={emPreparacao} />
        <PaymentRow icon="barcode-outline" label="Boleto" onPress={emPreparacao} />
        <PaymentRow icon="qr-code-outline" label="PIX copia e cola" onPress={emPreparacao} trailing="Copiar" />

        <Text style={styles.sectionTitle}>DADOS DA FATURA</Text>
        <Card>
          <DataRow icon="cash-outline" label="Valor" value="R$ 0,00" />
          <Divider />
          <DataRow icon="calendar-outline" label="Período" value="Em preparação" />
          <Divider />
          <DataRow icon="calendar-number-outline" label="Vencimento" value="Em preparação" />
        </Card>
      </ScrollView>
    </Screen>
  );
}

function PaymentRow({ icon, label, onPress, trailing }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; trailing?: string }) {
  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={styles.paymentRow}>
      <View style={styles.paymentIcon}><Ionicons name={icon} size={20} color={Colors.surface} /></View>
      <View style={styles.paymentContent}>
        <Text style={styles.paymentLabel}>{label}</Text>
        <Text style={styles.paymentStatus}>Em preparação</Text>
      </View>
      {trailing ? <Text style={styles.trailing}>{trailing}</Text> : null}
      <Ionicons name="chevron-forward" size={19} color={Colors.text} />
    </TouchableOpacity>
  );
}

function DataRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.dataRow}>
      <View style={styles.dataIcon}><Ionicons name={icon} size={17} color={Colors.surface} /></View>
      <View style={styles.dataContent}><Text style={styles.dataLabel}>{label}</Text><Text style={styles.dataValue}>{value}</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
  heading: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.xl, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { width: 38, height: 38, alignItems: "center", justifyContent: "center", marginRight: Spacing.xs },
  title: { color: Colors.text, fontSize: Typography.card, fontWeight: "800" },
  subtitle: { marginTop: 3, color: Colors.subtitle, fontSize: Typography.small },
  sectionTitle: { marginTop: Spacing.md, marginBottom: Spacing.sm, color: Colors.text, fontSize: Typography.small, fontWeight: "800", letterSpacing: 0.5 },
  paymentRow: { minHeight: 64, flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radius.md, backgroundColor: "#DEE0E3" },
  paymentIcon: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: "#8F938D" },
  paymentContent: { flex: 1, marginHorizontal: Spacing.sm },
  paymentLabel: { color: Colors.text, fontSize: Typography.caption, fontWeight: "800" },
  paymentStatus: { marginTop: 3, color: Colors.subtitle, fontSize: Typography.small },
  trailing: { marginRight: Spacing.xs, color: Colors.primary, fontSize: Typography.small, fontWeight: "800" },
  dataRow: { minHeight: 56, flexDirection: "row", alignItems: "center" },
  dataIcon: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: "#8F938D" },
  dataContent: { flex: 1, marginLeft: Spacing.sm },
  dataLabel: { color: Colors.subtitle, fontSize: Typography.small },
  dataValue: { marginTop: 2, color: Colors.text, fontSize: Typography.caption, fontWeight: "800" },
});
