import { Ionicons } from "@expo/vector-icons";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  Colors,
  Spacing,
  Typography,
} from "../../theme";
import { Badge, Card } from "../ui";
import { formatarDataBrasileira } from "../../services/faturas.service";

type Props = {
  competencia: string;
  valor: number;
  vencimento: string;
  status?: string;
  onPress?: () => void;
};

function formatarMoeda(valor: number) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function NextInvoiceCard({
  competencia,
  valor,
  vencimento,
  status = "Em aberto",
  onPress,
}: Props) {
  const competenciaExibida =
    competencia || "Competência não informada";

  const vencimentoExibido =
    formatarDataBrasileira(vencimento, "Vencimento não informado");

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={!onPress}
      onPress={onPress}
    >
      <Card>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Última fatura</Text>
            <Text style={styles.competencia}>
              {competenciaExibida}
            </Text>
          </View>

          <Badge label={status} variant="warning" />
        </View>

        <View style={styles.content}>
          <View>
            <Text style={styles.value}>{formatarMoeda(valor)}</Text>

            <View style={styles.dueDate}>
              <Ionicons
                name="calendar-outline"
                size={16}
                color={Colors.subtitle}
              />

              <Text style={styles.dueDateText}>
                {vencimentoExibido}
              </Text>
            </View>
          </View>

          {onPress ? (
            <Ionicons
              name="chevron-forward"
              size={22}
              color={Colors.primary}
            />
          ) : null}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  eyebrow: {
    color: Colors.subtitle,
    fontSize: Typography.caption,
  },

  competencia: {
    marginTop: Spacing.xs,
    color: Colors.text,
    fontSize: Typography.card,
    fontWeight: "700",
  },

  content: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: Spacing.lg,
  },

  value: {
    color: Colors.text,
    fontSize: Typography.title,
    fontWeight: "700",
  },

  dueDate: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
  },

  dueDateText: {
    marginLeft: Spacing.xs,
    color: Colors.subtitle,
    fontSize: Typography.caption,
  },
});
