import { StyleSheet, View } from "react-native";

import { AppHeader, EmptyState, Screen } from "../ui";
import { Spacing } from "../../theme";

export default function DashboardAdmin() {
  return (
    <Screen>
      <AppHeader
        contextSubtitle="Indicadores consolidados da Andrade Energy"
        contextTitle="Painel administrativo"
        icon="grid-outline"
        subtitle="Visão geral da operação"
        title="Administração"
      />

      <View style={styles.content}>
        <EmptyState
          icon="analytics-outline"
          title="Indicadores em preparação"
          subtitle="O dashboard administrativo será preenchido assim que a fonte de dados for disponibilizada."
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.lg,
  },
});
