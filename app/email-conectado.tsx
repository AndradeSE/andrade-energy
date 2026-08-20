import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { Screen } from "../components/ui";
import { concluirConexaoEmailUmaVez } from "../services/conexoes-email.service";
import { Colors, Spacing, Typography } from "../theme";

WebBrowser.maybeCompleteAuthSession();

function primeiroValor(valor?: string | string[]) {
  return Array.isArray(valor) ? valor[0] : valor;
}

/**
 * Rota de retorno do OAuth. O `state` é conferido no backend antes que a
 * conexão seja marcada como ativa, por isso o app não recebe tokens do e-mail.
 */
export default function EmailConectado() {
  const params = useLocalSearchParams<{ state?: string | string[]; error?: string | string[] }>();
  const processado = useRef(false);

  useEffect(() => {
    if (processado.current) return;
    processado.current = true;

    const state = primeiroValor(params.state);
    const erro = primeiroValor(params.error);

    async function concluir() {
      if (erro || !state) {
        router.replace({ pathname: "/unidades/recebimento-email", params: { conexao: "erro" } });
        return;
      }

      try {
        await concluirConexaoEmailUmaVez(state);
        router.replace({ pathname: "/unidades/recebimento-email", params: { conexao: "sucesso" } });
      } catch {
        router.replace({ pathname: "/unidades/recebimento-email", params: { conexao: "erro" } });
      }
    }

    void concluir();
  }, [params.error, params.state]);

  return (
    <Screen>
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.text}>Concluindo a conexão segura…</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.lg },
  text: { marginTop: Spacing.md, color: Colors.subtitle, fontSize: Typography.body, textAlign: "center" },
});
