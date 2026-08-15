import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import {
    Radius,
    Shadows,
    Spacing,
} from "../../theme";

type Props = {
  children: ReactNode;
};

export default function Card({
  children,
}: Props) {
  return (
    <View style={styles.card}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#DEE0E3",
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
});
