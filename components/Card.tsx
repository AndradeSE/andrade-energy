import { ReactNode } from "react";
import { StyleProp, View, ViewStyle } from "react-native";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function Card({
  children,
  style,
}: Props) {
  return (
    <View
      style={[
        {
          backgroundColor: "#FFFFFF",
          borderRadius: 20,
          padding: 20,
          marginBottom: 16,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}