import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  useEffect,
  useState,
} from "react";

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  useAuth,
} from "../../contexts/AuthContext";

import {
  ativarDigital,
  autenticarComDigital,
  desativarDigital,
  verificarDigitalDisponivel,
} from "../../services/biometric.service";

import {
  Colors,
  Radius,
  Spacing,
} from "../../theme";

export default function Perfil() {
  const {
    user,
    perfil,
    digitalEnabled,
    refreshDigitalStatus,
    signOut,
  } = useAuth();

  const [
    loadingDigital,
    setLoadingDigital,
  ] = useState(false);

  const [
    digitalAvailable,
    setDigitalAvailable,
  ] = useState(false);

  useEffect(() => {
    verificarDisponibilidade();
  }, []);

  async function verificarDisponibilidade() {
    try {
      const available =
        await verificarDigitalDisponivel();

      setDigitalAvailable(
        available
      );
    } catch (error) {
      console.log(
        "Erro ao verificar digital:",
        error
      );

      setDigitalAvailable(
        false
      );
    }
  }

  async function handleDigital(
    value: boolean
  ) {
    if (loadingDigital) {
      return;
    }

    try {
      setLoadingDigital(
        true
      );

      /*
       * ATIVAR IMPRESSÃO DIGITAL
       */
      if (value) {
        const available =
          await verificarDigitalDisponivel();

        if (!available) {
          Alert.alert(
            "Impressão digital indisponível",
            "Cadastre uma impressão digital nas configurações do seu celular antes de ativar este recurso."
          );

          return;
        }

        /*
         * Confirma a identidade
         * antes de ativar.
         */
        const result =
          await autenticarComDigital();

        if (!result.success) {
          return;
        }

        await ativarDigital();

        await refreshDigitalStatus();

        return;
      }

      /*
       * DESATIVAR IMPRESSÃO DIGITAL
       *
       * Também confirma identidade
       * antes de remover a proteção.
       */
      const result =
        await autenticarComDigital();

      if (!result.success) {
        return;
      }

      await desativarDigital();

      await refreshDigitalStatus();

      Alert.alert(
        "Impressão digital desativada",
        "Nos próximos acessos, utilize sua senha."
      );
    } catch (error) {
      console.log(
        "Erro ao alterar configuração da digital:",
        error
      );

      Alert.alert(
        "Erro",
        "Não foi possível alterar a configuração da impressão digital."
      );
    } finally {
      setLoadingDigital(
        false
      );
    }
  }

  function handleLogout() {
    Alert.alert(
      "Sair",
      "Deseja realmente sair da sua conta?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },

        {
          text: "Sair",
          style: "destructive",

          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.log(
                "Erro ao sair:",
                error
              );

              Alert.alert(
                "Erro",
                "Não foi possível sair da conta."
              );
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView
      style={
        styles.container
      }
      contentContainerStyle={
        styles.content
      }
      showsVerticalScrollIndicator={
        false
      }
    >
      <Text
        style={
          styles.title
        }
      >
        Perfil
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        Gerencie sua conta e preferências.
      </Text>

      {/* USUÁRIO */}

      <View
        style={
          styles.card
        }
      >
        <View
          style={
            styles.avatar
          }
        >
          <Ionicons
            name="person-outline"
            size={30}
            color={
              Colors.primary
            }
          />
        </View>

        <View
          style={
            styles.userContent
          }
        >
          <Text
            style={
              styles.userEmail
            }
          >
            {user?.email ??
              "Usuário"}
          </Text>

          <Text
            style={
              styles.profileText
            }
          >
            {perfil ??
              "Cliente"}
          </Text>
        </View>
      </View>

      {/* SEGURANÇA */}

      <Text
        style={
          styles.sectionTitle
        }
      >
        Segurança
      </Text>

      <View
        style={
          styles.card
        }
      >
        <View
          style={
            styles.settingRow
          }
        >
          <View
            style={
              styles.settingIcon
            }
          >
            <Ionicons
              name="finger-print-outline"
              size={25}
              color={
                Colors.primary
              }
            />
          </View>

          <View
            style={
              styles.settingContent
            }
          >
            <Text
              style={
                styles.settingTitle
              }
            >
              Entrar com impressão digital
            </Text>

            <Text
              style={
                styles.settingDescription
              }
            >
              {digitalAvailable
                ? "Use sua impressão digital para acessar sua conta."
                : "Nenhuma impressão digital disponível neste dispositivo."}
            </Text>
          </View>

          <Switch
            value={
              digitalEnabled
            }
            disabled={
              loadingDigital ||
              !digitalAvailable
            }
            onValueChange={
              handleDigital
            }
            trackColor={{
              true:
                Colors.primary,
            }}
          />
        </View>
      </View>

      {/* CONTA */}

      <Text
        style={
          styles.sectionTitle
        }
      >
        Conta
      </Text>

      <View
        style={
          styles.card
        }
      >
        <TouchableOpacity
          style={
            styles.menuRow
          }
          activeOpacity={
            0.8
          }
          onPress={
            handleLogout
          }
        >
          <View
            style={[
              styles.settingIcon,
              styles.logoutIcon,
            ]}
          >
            <Ionicons
              name="log-out-outline"
              size={24}
              color={
                Colors.danger
              }
            />
          </View>

          <Text
            style={
              styles.logoutText
            }
          >
            Sair da conta
          </Text>

          <Ionicons
            name="chevron-forward"
            size={20}
            color={
              Colors.subtitle
            }
          />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,

      backgroundColor:
        Colors.background,
    },

    content: {
      padding:
        Spacing.lg,

      paddingBottom:
        120,
    },

    title: {
      fontSize: 28,

      fontWeight:
        "700",

      color:
        Colors.text,
    },

    subtitle: {
      marginTop: 4,

      marginBottom:
        Spacing.lg,

      color:
        Colors.subtitle,

      fontSize: 15,
    },

    sectionTitle: {
      marginTop:
        Spacing.lg,

      marginBottom:
        Spacing.sm,

      fontSize: 14,

      fontWeight:
        "600",

      color:
        Colors.subtitle,

      textTransform:
        "uppercase",
    },

    card: {
      backgroundColor:
        Colors.surface,

      borderRadius:
        Radius.lg,

      padding:
        Spacing.md,
    },

    avatar: {
      width: 56,

      height: 56,

      borderRadius: 28,

      backgroundColor:
        "#DCFCE7",

      justifyContent:
        "center",

      alignItems:
        "center",
    },

    userContent: {
      marginTop:
        Spacing.md,
    },

    userEmail: {
      fontSize: 17,

      fontWeight:
        "600",

      color:
        Colors.text,
    },

    profileText: {
      marginTop: 3,

      color:
        Colors.subtitle,
    },

    settingRow: {
      flexDirection:
        "row",

      alignItems:
        "center",
    },

    settingIcon: {
      width: 44,

      height: 44,

      borderRadius: 22,

      backgroundColor:
        "#DCFCE7",

      justifyContent:
        "center",

      alignItems:
        "center",
    },

    settingContent: {
      flex: 1,

      marginHorizontal:
        Spacing.md,
    },

    settingTitle: {
      fontSize: 16,

      fontWeight:
        "600",

      color:
        Colors.text,
    },

    settingDescription: {
      marginTop: 3,

      fontSize: 13,

      lineHeight: 18,

      color:
        Colors.subtitle,
    },

    menuRow: {
      flexDirection:
        "row",

      alignItems:
        "center",
    },

    logoutIcon: {
      backgroundColor:
        "#FEE2E2",
    },

    logoutText: {
      flex: 1,

      marginLeft:
        Spacing.md,

      fontSize: 16,

      fontWeight:
        "500",

      color:
        Colors.danger,
    },
  });
