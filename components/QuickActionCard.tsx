import { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  icon: ReactNode;
  title: string;
  onPress: () => void;
};

export default function QuickActionCard({
  icon,
  title,
  onPress,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.icon}>{icon}</View>

      <Text style={styles.title}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  icon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E1F4E8",
  },

  title: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
});
