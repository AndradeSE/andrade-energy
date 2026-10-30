import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

type Props = {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  featured?: boolean;
  size?: number;
};

/**
 * Mantém o mesmo espaço vertical de um ícone comum mesmo quando o botão
 * central é maior. Assim o círculo pode sobressair sem desnivelar o texto.
 */
export default function AppTabIcon({ name, color, featured = false, size = 21 }: Props) {
  if (!featured) return <Ionicons name={name} color={color} size={size} />;

  return (
    <View style={styles.slot}>
      <View style={styles.featuredCircle}>
        <Ionicons name={name} color="#FFFFFF" size={25} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    width: 50,
    height: 21,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  featuredCircle: {
    position: "absolute",
    bottom: 0,
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#12B981",
    elevation: 8,
    shadowColor: "#12B981",
    shadowOpacity: 0.3,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 5 },
  },
});
