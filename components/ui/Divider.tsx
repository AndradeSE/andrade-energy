import { StyleSheet, View } from "react-native";

import {
    Colors,
    Spacing,
} from "../../theme";

type Props = {
  marginVertical?: number;
};

export default function Divider({
  marginVertical = Spacing.md,
}: Props) {
  return (
    <View
      style={[
        styles.divider,
        {
          marginVertical,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    width: "100%",
    backgroundColor: Colors.border,
  },
});