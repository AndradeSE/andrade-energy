import {
    Alert,
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import {
    useEffect,
    useRef,
    useState,
    useCallback,
} from "react";

import {
    Ionicons,
} from "@expo/vector-icons";

import {
    useAuth,
} from "../contexts/AuthContext";

import {
    Colors,
    Radius,
    Spacing,
} from "../theme";

export default function BiometricLock({ onUnlocked }: { onUnlocked?: () => void }) {
  const {
    unlockWithDigital,
    signOut,
  } =
    useAuth();

  const [
    authenticating,
    setAuthenticating,
  ] =
    useState(false);

  /*
   * Evita abrir dois prompts
   * durante desenvolvimento/StrictMode.
   */
  const iniciou =
    useRef(false);

  const handleDigital = useCallback(async () => {
    if (
      authenticating
    ) {
      return;
    }

    try {
      setAuthenticating(
        true
      );

      /*
       * Não precisamos mais chamar
       * router.replace().
       *
       * Quando isUnlocked vira true,
       * Stack.Protected automaticamente
       * libera as rotas do app.
       */
      const success =
        await unlockWithDigital();

      if (!success) {
        Alert.alert(
          "Biometria não reconhecida",
          "Confirme que há uma digital ou rosto cadastrado no aparelho. Você também pode entrar com a senha."
        );
      } else {
        onUnlocked?.();
      }
    } catch (error) {
      console.log(
        "Erro ao validar impressão digital:",
        error
      );

      Alert.alert(
        "Não foi possível autenticar",
        "Tente novamente ou utilize sua senha."
      );
    } finally {
      setAuthenticating(
        false
      );
    }
  }, [authenticating, onUnlocked, unlockWithDigital]);

  useEffect(() => {
    if (
      iniciou.current
    ) {
      return;
    }

    iniciou.current =
      true;

    const timer =
      setTimeout(() => {
        void handleDigital();
      }, 500);

    return () => {
      clearTimeout(
        timer
      );
    };
  }, [handleDigital]);

  async function handlePassword() {
    try {
      /*
       * Como estamos usando a sessão
       * já existente, sair da conta
       * leva novamente ao login.
       */
      await signOut();
    } catch (error) {
      console.log(
        "Erro ao retornar para login:",
        error
      );

      Alert.alert(
        "Erro",
        "Não foi possível retornar para a tela de login."
      );
    }
  }

  return (
    <View
      style={
        styles.container
      }
    >
      <View
        style={
          styles.content
        }
      >
        <View
          style={
            styles.iconContainer
          }
        >
          <Ionicons
            name="finger-print-outline"
            size={72}
            color={
              Colors.primary
            }
          />
        </View>

        <Text
          style={
            styles.title
          }
        >
          Bem-vindo de volta
        </Text>

        <Text
          style={
            styles.subtitle
          }
        >
          Use a biometria do aparelho para acessar o Andrade Energy.
        </Text>

        <TouchableOpacity
          style={[
            styles.primaryButton,

            authenticating &&
              styles.primaryButtonDisabled,
          ]}
          activeOpacity={
            0.85
          }
          disabled={
            authenticating
          }
          onPress={
            handleDigital
          }
        >
          {authenticating ? (
            <ActivityIndicator
              color="#FFFFFF"
            />
          ) : (
            <Ionicons
              name="finger-print-outline"
              size={26}
              color="#FFFFFF"
            />
          )}

          <Text
            style={
              styles.primaryButtonText
            }
          >
            {authenticating
              ? "Verificando..."
              : "Entrar com biometria"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={
            styles.passwordButton
          }
          disabled={
            authenticating
          }
          onPress={
            handlePassword
          }
        >
          <Text
            style={
              styles.passwordText
            }
          >
            Entrar com senha
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,

      justifyContent:
        "center",

      backgroundColor:
        Colors.background,

      padding:
        Spacing.lg,
    },

    content: {
      alignItems:
        "center",

      backgroundColor:
        Colors.surface,

      borderRadius:
        Radius.xl,

      paddingHorizontal:
        Spacing.lg,

      paddingVertical:
        Spacing.xl,
    },

    iconContainer: {
      width: 112,

      height: 112,

      borderRadius: 56,

      backgroundColor:
        "#DCFCE7",

      alignItems:
        "center",

      justifyContent:
        "center",

      marginBottom:
        Spacing.lg,
    },

    title: {
      fontSize: 26,

      fontWeight:
        "700",

      color:
        Colors.text,

      textAlign:
        "center",
    },

    subtitle: {
      marginTop:
        Spacing.sm,

      marginBottom:
        Spacing.xl,

      fontSize: 16,

      lineHeight: 23,

      color:
        Colors.subtitle,

      textAlign:
        "center",
    },

    primaryButton: {
      width:
        "100%",

      minHeight: 56,

      borderRadius:
        Radius.lg,

      flexDirection:
        "row",

      gap:
        Spacing.sm,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        Colors.primary,
    },

    primaryButtonDisabled: {
      opacity: 0.7,
    },

    primaryButtonText: {
      color:
        "#FFFFFF",

      fontSize: 16,

      fontWeight:
        "600",
    },

    passwordButton: {
      marginTop:
        Spacing.lg,

      padding:
        Spacing.sm,
    },

    passwordText: {
      color:
        Colors.primary,

      fontSize: 15,

      fontWeight:
        "600",
    },
  });
