import { StyleSheet, Text, View } from "react-native";

import {
    Colors
} from "../../theme";

type Props = {
  name: string;
  size?: number;
};

export default function Avatar({
  name,
  size = 52,
}: Props) {
  const initials = name
    .trim()
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            fontSize: size * 0.38,
          },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  text: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});