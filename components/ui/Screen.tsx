import { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { Edge, SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "../../theme";

type Props = {
  children?: ReactNode;
  edges?: Edge[];
};

export default function Screen({
  children,
  edges,
}: Props) {
  return (
    <SafeAreaView edges={edges} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        {children}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
