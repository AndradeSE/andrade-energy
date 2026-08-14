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
      <View>{icon}</View>

      <Text style={styles.title}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 18,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },

  title: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
});