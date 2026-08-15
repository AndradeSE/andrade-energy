import { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import {
    Radius,
    Shadows,
    Spacing,
} from "../../theme";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function Card({
  children,
  style,
}: Props) {
  return (
    <View style={[styles.card, style]}>
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
