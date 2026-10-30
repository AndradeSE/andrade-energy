import { Text } from "react-native";
import { TouchableOpacity } from "./assistant/AssistantNativeControls";

type Props = {
  title: string;
  onPress: () => void;
};

export default function ActionButton({
  title,
  onPress,
}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: "#16A34A",
        padding: 16,
        borderRadius: 14,
        marginTop: 16,
      }}
    >
      <Text
        style={{
          color: "#FFF",
          textAlign: "center",
          fontWeight: "bold",
          fontSize: 16,
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}