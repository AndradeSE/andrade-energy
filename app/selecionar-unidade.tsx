import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import CadastroActions from "../components/cadastro/CadastroActions";
import {
  ElasticFlatList as FlatList,
  EmptyState,
  Loading,
} from "../components/ui";

import {
  UnidadeConsumidora,
  UsinaSelecionada,
  useAuth,
} from "../contexts/AuthContext";
import { useEmpresa } from "../contexts/EmpresaContext";

import {
  listarMinhasUnidades,
  nomearMinhaUnidade,
} from "../services/clientes.service";

import {
  listarUsinas,
} from "../services/usinas.service";

import {
  Colors,
  Radius,
  Spacing,
  Typography,
} from "../theme";
import { IS_GERADOR_APP } from "../config/appVariant";
import PortalBrandLogo from "../components/brand/PortalBrandLogo";

export default function SelecionarUnidade() {
  const { empresa } = useEmpresa();
  const corPrincipal = empresa.cor_primaria || "#087A46";
  const {
    usuario,
    selecionarUnidade,
    selecionarUsina,
    logout,
  } = useAuth();

  // A experiência é definida pelo aplicativo aberto, não pelo perfil da conta.
  // Assim, um proprietário pode consultar as próprias UCs no app Consumidor.
  const gestor = IS_GERADOR_APP;

  const [itens, setItens] =
    useState<
      (
        | UnidadeConsumidora
        | UsinaSelecionada
      )[]
    >([]);

  const [loading, setLoading] =
    useState(true);

  const [erro, setErro] =
    useState(false);

  const [atualizando, setAtualizando] =
    useState(false);

  const [busca, setBusca] =
    useState("");

  const [
    menuAberto,
    setMenuAberto,
  ] = useState(false);

  const [unidadeNomeando, setUnidadeNomeando] = useState<UnidadeConsumidora | null>(null);
  const [apelido, setApelido] = useState("");
  const [salvandoApelido, setSalvandoApelido] = useState(false);

  const insets =
    useSafeAreaInsets();

  /*
   * ========================================================
   * CARREGAR UNIDADES / USINAS
   * ========================================================
   */

  const carregar =
    useCallback(async (mostrarLoading = true) => {
      if (mostrarLoading) setLoading(true);
      setErro(false);

      try {
        if (gestor) {
          setItens(await listarUsinas());
          return;
        }

        if (!usuario?.cpf) {
          console.log(
            "Usuário sem CPF para localizar unidades."
          );
          setErro(true);
          return;
        }

        setItens(await listarMinhasUnidades());
      } catch (error) {
        console.log(
          gestor
            ? "Erro ao carregar usinas:"
            : "Erro ao carregar unidades:",
          error
        );
        setErro(true);
      } finally {
        if (mostrarLoading) setLoading(false);
      }
    }, [
      gestor,
      usuario?.cpf,
    ]);

  /*
   * Recarrega sempre que a tela
   * recebe foco.
   */
  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar])
  );

  async function atualizarPagina() {
    setAtualizando(true);
    try {
      await carregar(false);
    } finally {
      setAtualizando(false);
    }
  }

  async function salvarApelido() {
    if (!unidadeNomeando?.id || salvandoApelido) return;
    setSalvandoApelido(true);
    try {
      const atualizada = await nomearMinhaUnidade(unidadeNomeando.id, apelido);
      setItens((atuais) => atuais.map((item) => item.id === unidadeNomeando.id ? { ...item, apelido: atualizada.apelido } : item));
      setUnidadeNomeando(null);
    } catch (error: any) {
      Alert.alert("Não foi possível salvar", error?.response?.data?.message ?? "Tente novamente.");
    } finally {
      setSalvandoApelido(false);
    }
  }

  /*
   * ========================================================
   * SELECIONAR UNIDADE CONSUMIDORA
   * ========================================================
   */

  async function escolher(
    unidade: UnidadeConsumidora
  ) {
    try {
      /*
       * IMPORTANTE:
       *
       * Esperamos o contexto salvar
       * a unidade antes de navegar.
       */
      await selecionarUnidade(
        unidade
      );

      console.log(
        "ENTRANDO NA UNIDADE:",
        unidade.numero
      );

      router.replace(
        "/(tabs)"
      );
    } catch (error) {
      console.log(
        "Erro ao entrar na unidade:",
        error
      );

      Alert.alert(
        "Não foi possível acessar",
        "Não foi possível selecionar esta unidade. Tente novamente."
      );
    }
  }

  /*
   * ========================================================
   * SELECIONAR USINA
   * ========================================================
   */

  async function escolherUsina(
    usina: UsinaSelecionada
  ) {
    try {
      await selecionarUsina(
        usina
      );

      console.log(
        "ENTRANDO NA USINA:",
        usina.nome
      );

      router.replace(
        "/(tabs)"
      );
    } catch (error) {
      console.log(
        "Erro ao entrar na usina:",
        error
      );

      Alert.alert(
        "Não foi possível acessar",
        "Não foi possível selecionar esta usina. Tente novamente."
      );
    }
  }

  /*
   * ========================================================
   * LOADING
   * ========================================================
   */

  if (loading) {
    return <Loading />;
  }

  /*
   * ========================================================
   * FILTRO
   * ========================================================
   */

  const termo =
    busca
      .trim()
      .toLocaleLowerCase(
        "pt-BR"
      );

  const itensFiltrados =
    itens.filter(
      (item) =>
        Object.values(
          item
        ).some(
          (valor) =>
            String(
              valor ?? ""
            )
              .toLocaleLowerCase(
                "pt-BR"
              )
              .includes(
                termo
              )
        )
    );

  /*
   * ========================================================
   * TELA
   * ========================================================
   */

  return (
    <SafeAreaView
      edges={[
        "left",
        "right",
        "bottom",
      ]}
      style={
        styles.screen
      }
    >
      <StatusBar
        backgroundColor={corPrincipal}
        barStyle="light-content"
      />

      <LinearGradient
        colors={[corPrincipal, "#082F26"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.85 }}
        style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity accessibilityLabel="Opções da conta" onPress={() => setMenuAberto(true)} style={styles.menuButton}>
            <Ionicons name="menu" size={27} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.logoBox}><PortalBrandLogo height={44} width={158} /></View>
        </View>
        <Text numberOfLines={2} style={styles.welcome}>Olá, {usuario?.nome?.trim() || "bem-vindo"}</Text>
      </LinearGradient>

      <FlatList
        contentContainerStyle={
          styles.content
        }
        data={
          itensFiltrados
        }
        keyExtractor={(
          item
        ) =>
          String(
            item.id
          )
        }
        refreshControl={
          <RefreshControl
            colors={[
              Colors.primary,
            ]}
            onRefresh={
              atualizarPagina
            }
            refreshing={
              atualizando
            }
            tintColor={
              Colors.primary
            }
          />
        }
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            {/* TÍTULO */}

            <View
              style={
                styles.intro
              }
            >
              <Text
                style={
                  styles.title
                }
              >
                {gestor
                  ? "Escolha uma usina"
                  : "Escolha sua unidade consumidora"}
              </Text>
            </View>

            {/* BUSCA */}

            <View
              style={
                styles.actions
              }
            >
              <View
                style={
                  styles.search
                }
              >
                <Ionicons
                  name="search-outline"
                  size={20}
                  color={
                    Colors.subtitle
                  }
                />

                <TextInput
                  accessibilityLabel={`Buscar ${
                    gestor
                      ? "usina"
                      : "unidade"
                  }`}
                  onChangeText={
                    setBusca
                  }
                  placeholder={
                    gestor
                      ? "Buscar por nome ou instalação"
                      : "Buscar por UC, titular ou endereço"
                  }
                  placeholderTextColor={
                    Colors.subtitle
                  }
                  style={
                    styles.searchInput
                  }
                  value={
                    busca
                  }
                />

                {busca ? (
                  <TouchableOpacity
                    accessibilityLabel="Limpar busca"
                    hitSlop={10}
                    onPress={() =>
                      setBusca(
                        ""
                      )
                    }
                  >
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={
                        Colors.subtitle
                      }
                    />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon={
              erro
                ? "alert-circle-outline"
                : gestor
                  ? "sunny-outline"
                  : "home-outline"
            }
            title={
              erro
                ? `Não foi possível carregar ${
                    gestor
                      ? "as usinas"
                      : "as unidades"
                  }`
                : busca
                  ? "Nenhum resultado encontrado"
                  : `Nenhuma ${
                      gestor
                        ? "usina"
                        : "unidade"
                    } vinculada`
            }
            subtitle={
              erro
                ? "Confira sua conexão e tente entrar novamente."
                : busca
                  ? "Altere os termos da busca e tente novamente."
                  : `Use as opções abaixo para adicionar ${
                      gestor
                        ? "uma usina"
                        : "uma unidade"
                    }.`
            }
          />
        }
        renderItem={({
          item,
        }) => {
          const usina =
            gestor
              ? (item as UsinaSelecionada)
              : null;

          const unidade =
            !gestor
              ? (item as UnidadeConsumidora)
              : null;

          const titulo =
            gestor
              ? usina!.nome
              : String(unidade!.apelido ?? "").trim() || `UC ${unidade!.numero}`;

          const detalhe =
            gestor
              ? usina!
                  .numero_instalacao
                ? `Instalação ${usina!.numero_instalacao}`
                : usina!
                      .endereco ||
                    usina!
                      .distribuidora ||
                    "Usina solar"
              : unidade!
                    .titular ||
                unidade!
                  .endereco ||
                unidade!
                  .distribuidora ||
                "CEMIG";

          return (
            <TouchableOpacity
              accessibilityLabel={`Selecionar ${
                gestor
                  ? "usina"
                  : "unidade"
              } ${titulo}`}
              activeOpacity={
                0.84
              }
              onPress={() => {
                if (
                  gestor &&
                  usina
                ) {
                  escolherUsina(
                    usina
                  );

                  return;
                }

                if (
                  unidade
                ) {
                  escolher(
                    unidade
                  );
                }
              }}
            >
              <View
                style={
                  styles.unitCard
                }
              >
                <View
                  style={
                    styles.unitTop
                  }
                >
                  <View
                    style={
                      styles.unitInfo
                    }
                  >
                    <Text
                      style={
                        styles.unitLabel
                      }
                    >
                      {gestor
                        ? "USINA:"
                        : unidade!.apelido ? "NOME DA UNIDADE:" : "UC:"}
                    </Text>

                    <Text
                      style={
                        styles.unitNumber
                      }
                    >
                      {gestor
                        ? usina!
                            .nome
                        : unidade!.apelido || unidade!.numero}
                    </Text>
                  </View>

                  {!gestor && unidade ? <TouchableOpacity accessibilityLabel={`Nomear UC ${unidade.numero}`} hitSlop={8} onPress={(event) => { event.stopPropagation(); setUnidadeNomeando(unidade); setApelido(String(unidade.apelido ?? "")); }} style={styles.renameButton}><Ionicons name="pencil-outline" size={17} color={Colors.primary} /><Text style={styles.renameText}>{unidade.apelido ? "Renomear" : "Nomear"}</Text></TouchableOpacity> : null}

                  <View
                    style={
                      styles.activeBadge
                    }
                  >
                    <Text
                      style={
                        styles.activeText
                      }
                    >
                      {item.status ===
                      "INATIVA"
                        ? "Inativa"
                        : gestor
                          ? "Usina ativa"
                          : "Contrato ativo"}
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.energyFlow
                  }
                >
                  <View
                    style={
                      styles.flowDot
                    }
                  />

                  <View
                    style={
                      styles.flowLine
                    }
                  />

                  <View
                    style={
                      styles.flowDot
                    }
                  />

                  <View
                    style={
                      styles.flowLine
                    }
                  />

                  <Ionicons
                    name={
                      gestor
                        ? "sunny"
                        : "flash"
                    }
                    size={26}
                    color={
                      Colors.primary
                    }
                  />
                </View>

                <Text
                  style={
                    styles.holderLabel
                  }
                >
                  {gestor
                    ? "TITULAR / RESPONSÁVEL"
                    : "TITULAR"}
                </Text>

                <Text
                  style={
                    styles.holder
                  }
                >
                  {gestor
                    ? usina!.nome
                    : unidade!
                          .titular ||
                      usuario?.nome}
                </Text>

                <Text
                  style={
                    styles.unitDetail
                  }
                >
                  {!gestor && unidade!.apelido ? `UC ${unidade!.numero} • ${detalhe}` : detalhe}
                </Text>

                {!gestor &&
                unidade!
                  .endereco ? (
                  <Text
                    style={
                      styles.unitAddress
                    }
                  >
                    {
                      unidade!
                        .endereco
                    }
                  </Text>
                ) : null}

                <View
                  style={
                    styles.openHint
                  }
                >
                  <Text
                    style={
                      styles.openText
                    }
                  >
                    Selecionar
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={17}
                    color={
                      Colors.primary
                    }
                  />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={
          <View>
            {gestor ? (
              <View
                style={
                  styles.generatorActions
                }
              >
                <Text
                  style={
                    styles.generatorActionsTitle
                  }
                >
                  Adicionar nova usina
                </Text>

                <CadastroActions
                  tipo="USINA"
                />
              </View>
            ) : (
              <View
                style={
                  styles.cpfNotice
                }
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={19}
                  color={
                    Colors.primary
                  }
                />

                <Text
                  style={
                    styles.cpfNoticeText
                  }
                >
                  As unidades são localizadas automaticamente pelo CPF da sua conta.
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={
                logout
              }
              style={
                styles.logout
              }
            >
              <Ionicons
                name="log-out-outline"
                size={19}
                color={
                  Colors.subtitle
                }
              />

              <Text
                style={
                  styles.logoutText
                }
              >
                Sair da conta
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal animationType="fade" transparent visible={Boolean(unidadeNomeando)} onRequestClose={() => setUnidadeNomeando(null)}>
        <Pressable style={styles.backdrop} onPress={() => setUnidadeNomeando(null)}>
          <Pressable style={styles.renameDialog} onPress={(event) => event.stopPropagation()}>
            <View style={styles.renameIcon}><Ionicons name="home-outline" size={24} color={Colors.primary} /></View>
            <Text style={styles.renameTitle}>Nomear esta unidade</Text>
            <Text style={styles.renameSubtitle}>Use um nome fácil de reconhecer. O número oficial da UC continuará visível.</Text>
            <TextInput autoFocus maxLength={40} value={apelido} onChangeText={setApelido} placeholder="Ex.: Casa, Loja ou Escritório" placeholderTextColor={Colors.subtitle} style={styles.renameInput} />
            <View style={styles.renameActions}><TouchableOpacity disabled={salvandoApelido} onPress={() => setUnidadeNomeando(null)}><Text style={styles.renameCancel}>Cancelar</Text></TouchableOpacity><TouchableOpacity disabled={salvandoApelido} onPress={() => void salvarApelido()} style={styles.renameSave}><Text style={styles.renameSaveText}>{salvandoApelido ? "Salvando..." : "Salvar nome"}</Text></TouchableOpacity></View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* MENU */}

      <Modal
        animationType="fade"
        transparent
        visible={
          menuAberto
        }
        onRequestClose={() =>
          setMenuAberto(
            false
          )
        }
      >
        <Pressable
          style={
            styles.backdrop
          }
          onPress={() =>
            setMenuAberto(
              false
            )
          }
        >
          <Pressable
            style={[
              styles.drawer,
              {
                paddingTop:
                  insets.top,
              },
            ]}
            onPress={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <View
              style={
                styles.drawerHeader
              }
            >
              <View
                style={
                  styles.drawerAvatar
                }
              >
                <Ionicons
                  name="person"
                  size={22}
                  color={
                    Colors.surface
                  }
                />
              </View>

              <View
                style={
                  styles.drawerUser
                }
              >
                <Text
                  numberOfLines={
                    1
                  }
                  style={
                    styles.drawerName
                  }
                >
                  {usuario?.nome}
                </Text>

                <Text
                  numberOfLines={
                    1
                  }
                  style={
                    styles.drawerEmail
                  }
                >
                  {usuario?.email}
                </Text>
              </View>

              <TouchableOpacity
                accessibilityLabel="Fechar menu"
                onPress={() =>
                  setMenuAberto(
                    false
                  )
                }
              >
                <Ionicons
                  name="close"
                  size={25}
                  color={
                    Colors.surface
                  }
                />
              </TouchableOpacity>
            </View>

            <View
              style={
                styles.drawerAccent
              }
            />

            <View
              style={
                styles.drawerGroup
              }
            >
              <DrawerItem
                icon="person-outline"
                label="Gerenciar conta"
                onPress={() =>
                  Alert.alert(
                    "Sua conta",
                    `${usuario?.nome}\n${usuario?.email}`
                  )
                }
              />

              <DrawerItem
                icon="document-text-outline"
                label="Meus contratos"
                onPress={() =>
                  Alert.alert(
                    "Escolha necessária",
                    `Selecione ${
                      gestor
                        ? "uma usina"
                        : "uma unidade"
                    } para consultar os contratos.`
                  )
                }
              />

              <DrawerItem
                icon="shield-checkmark-outline"
                label="Política de privacidade"
                onPress={() =>
                  Alert.alert(
                    "Privacidade",
                    "Seus dados são utilizados apenas para prestar os serviços da Andrade Energy."
                  )
                }
              />

              <DrawerItem
                icon="help-circle-outline"
                label="Ajuda e suporte"
                onPress={() =>
                  Alert.alert(
                    "Ajuda",
                    "Entre em contato com a equipe Andrade Energy para receber atendimento."
                  )
                }
              />
            </View>

            <View
              style={
                styles.drawerGroup
              }
            >
              <DrawerItem
                danger
                icon="log-out-outline"
                label="Sair da conta"
                onPress={() =>
                  Alert.alert(
                    "Sair",
                    "Deseja encerrar sua sessão?",
                    [
                      {
                        text:
                          "Cancelar",
                        style:
                          "cancel",
                      },
                      {
                        text:
                          "Sair",
                        style:
                          "destructive",
                        onPress:
                          logout,
                      },
                    ]
                  )
                }
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function DrawerItem({
  icon,
  label,
  onPress,
  danger = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={
        onPress
      }
      style={
        styles.drawerItem
      }
    >
      <View
        style={[
          styles.drawerItemIcon,
          danger &&
            styles.drawerItemIconDanger,
        ]}
      >
        <Ionicons
          name={
            icon
          }
          size={19}
          color={
            danger
              ? Colors.danger
              : Colors.primary
          }
        />
      </View>

      <Text
        style={[
          styles.drawerItemText,
          danger &&
            styles.drawerItemTextDanger,
        ]}
      >
        {label}
      </Text>

      <Ionicons
        name="chevron-forward"
        size={17}
        color={
          Colors.subtitle
        }
      />
    </TouchableOpacity>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        Colors.background,
    },

    content: {
      flexGrow: 1,
      paddingHorizontal:
        Spacing.lg,
      paddingBottom:
        Spacing.xl,
    },

    header: {
      paddingHorizontal:
        Spacing.lg,
      paddingBottom:
        Spacing.md,
      flexShrink: 0,
    },

    headerTop: {
      minHeight: 48,
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    menuButton: {
      width: 44,
      height: 44,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight:
        Spacing.xs,
    },

    avatar: {
      width: 48,
      height: 48,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderRadius:
        Radius.round,
      backgroundColor:
        "rgba(255,255,255,0.18)",
    },

    welcome: {
      marginTop: Spacing.xs,
      color:
        "#FFFFFF",
      fontSize:
        Typography.body,
      fontWeight:
        "700",
    },

    logoBox: {
      flex: 1,
      height: 44,
      alignItems:
        "flex-end",
      justifyContent:
        "center",
    },

    intro: {
      alignItems:
        "center",
      paddingTop:
        Spacing.lg,
      paddingBottom:
        Spacing.lg,
    },

    title: {
      maxWidth: 330,
      color:
        Colors.text,
      fontSize:
        Typography.title,
      fontWeight:
        "800",
      textAlign:
        "center",
    },

    actions: {
      marginBottom:
        Spacing.lg,
    },

    search: {
      minHeight: 54,
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        Spacing.md,
      borderWidth: 1,
      borderColor:
        Colors.border,
      borderRadius:
        Radius.md,
      backgroundColor:
        Colors.surface,
    },

    searchInput: {
      flex: 1,
      marginHorizontal:
        Spacing.xs,
      color:
        Colors.text,
      fontSize:
        Typography.caption,
    },

    cpfNotice: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap:
        Spacing.xs,
      marginTop:
        Spacing.xxl,
      padding:
        Spacing.md,
      borderWidth: 1,
      borderColor:
        Colors.border,
      borderRadius:
        Radius.lg,
      backgroundColor:
        Colors.primaryLight,
    },

    cpfNoticeText: {
      flex: 1,
      color:
        Colors.primaryDark,
      fontSize:
        Typography.small,
      fontWeight:
        "600",
      lineHeight: 18,
    },

    generatorActions: {
      marginTop:
        Spacing.xxl,
    },

    generatorActionsTitle: {
      marginBottom:
        Spacing.md,
      color:
        Colors.primary,
      fontSize: 20,
      fontWeight:
        "900",
      letterSpacing:
        0.2,
      textAlign:
        "center",
    },

    unitCard: {
      marginBottom:
        Spacing.md,
      padding:
        Spacing.lg,
      borderRadius:
        Radius.xl,
      backgroundColor:
        "#F2F8F4",
      shadowColor:
        "#000",
      shadowOpacity:
        0.08,
      shadowRadius: 5,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      elevation: 2,
    },

    unitTop: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },

    unitInfo: {
      flex: 1,
      marginRight:
        Spacing.sm,
    },

    unitLabel: {
      color:
        Colors.text,
      fontSize:
        Typography.caption,
      fontWeight:
        "800",
    },

    unitNumber: {
      marginTop: 3,
      color:
        Colors.text,
      fontSize:
        Typography.card,
      fontWeight:
        "800",
    },

    activeBadge: {
      paddingHorizontal:
        Spacing.md,
      paddingVertical: 9,
      borderRadius:
        Radius.round,
      backgroundColor:
        Colors.success,
    },

    activeText: {
      color:
        Colors.surface,
      fontSize:
        Typography.small,
      fontWeight:
        "800",
    },

    energyFlow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      marginVertical:
        Spacing.xl,
      paddingHorizontal:
        Spacing.lg,
    },

    flowDot: {
      width: 15,
      height: 15,
      borderRadius:
        Radius.round,
      backgroundColor:
        "#858984",
    },

    flowLine: {
      flex: 1,
      height: 3,
      backgroundColor:
        "#858984",
    },

    holderLabel: {
      color:
        Colors.text,
      fontSize:
        Typography.small,
      fontWeight:
        "800",
    },

    holder: {
      marginTop: 4,
      color:
        Colors.text,
      fontSize:
        Typography.caption,
      fontWeight:
        "700",
    },

    unitDetail: {
      marginTop:
        Spacing.md,
      color:
        Colors.subtitle,
      fontSize:
        Typography.small,
      lineHeight: 18,
    },

    unitAddress: {
      marginTop: 3,
      color:
        Colors.subtitle,
      fontSize:
        Typography.small,
    },

    openHint: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "flex-end",
      gap: 4,
      marginTop:
        Spacing.md,
    },

    openText: {
      color:
        Colors.primary,
      fontSize:
        Typography.small,
      fontWeight:
        "800",
    },

    renameButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: "#B9D8C7",
      borderRadius: Radius.md,
      backgroundColor: Colors.primaryLight,
    },

    renameText: { color: Colors.primary, fontSize: Typography.small, fontWeight: "800" },
    renameDialog: { width: "88%", maxWidth: 430, alignSelf: "center", marginTop: "auto", marginBottom: "auto", padding: Spacing.lg, borderRadius: Radius.xl, backgroundColor: Colors.surface },
    renameIcon: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: Radius.lg, backgroundColor: Colors.primaryLight },
    renameTitle: { marginTop: Spacing.md, color: Colors.text, fontSize: Typography.section, fontWeight: "900" },
    renameSubtitle: { marginTop: 6, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 19 },
    renameInput: { minHeight: 50, marginTop: Spacing.lg, paddingHorizontal: 14, borderWidth: 1, borderColor: "#BED5C8", borderRadius: Radius.md, color: Colors.text, backgroundColor: Colors.background },
    renameActions: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: Spacing.lg, marginTop: Spacing.lg },
    renameCancel: { color: Colors.subtitle, fontWeight: "800" },
    renameSave: { minHeight: 44, justifyContent: "center", paddingHorizontal: 18, borderRadius: Radius.md, backgroundColor: Colors.primary },
    renameSaveText: { color: Colors.surface, fontWeight: "900" },

    logout: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap:
        Spacing.xs,
      marginTop:
        Spacing.xl,
      padding:
        Spacing.md,
    },

    logoutText: {
      color:
        Colors.subtitle,
      fontSize:
        Typography.caption,
      fontWeight:
        "600",
    },

    backdrop: {
      flex: 1,
      backgroundColor:
        "rgba(17,24,39,0.42)",
    },

    drawer: {
      width: "86%",
      height: "100%",
      overflow:
        "hidden",
      borderTopRightRadius:
        24,
      borderBottomRightRadius:
        24,
      backgroundColor:
        Colors.surface,
    },

    drawerHeader: {
      minHeight: 92,
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        Spacing.lg,
      backgroundColor:
        "#8F938D",
    },

    drawerAvatar: {
      width: 42,
      height: 42,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderRadius:
        Radius.round,
      backgroundColor:
        "rgba(255,255,255,0.18)",
    },

    drawerUser: {
      flex: 1,
      marginHorizontal:
        Spacing.sm,
    },

    drawerName: {
      color:
        Colors.surface,
      fontSize:
        Typography.caption,
      fontWeight:
        "800",
    },

    drawerEmail: {
      marginTop: 2,
      color:
        "rgba(255,255,255,0.76)",
      fontSize:
        Typography.small,
    },

    drawerAccent: {
      width: 72,
      height: 4,
      marginTop:
        Spacing.md,
      marginLeft:
        Spacing.lg,
      borderRadius:
        Radius.round,
      backgroundColor:
        Colors.primary,
    },

    drawerGroup: {
      margin:
        Spacing.md,
      overflow:
        "hidden",
      borderRadius:
        Radius.lg,
      backgroundColor:
        "#EAF4ED",
    },

    drawerItem: {
      minHeight: 58,
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        Spacing.sm,
      borderBottomWidth:
        1,
      borderBottomColor:
        Colors.surface,
    },

    drawerItemIcon: {
      width: 34,
      height: 34,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderRadius:
        Radius.md,
      backgroundColor:
        Colors.primaryLight,
    },

    drawerItemIconDanger: {
      backgroundColor:
        "#FEF2F2",
    },

    drawerItemText: {
      flex: 1,
      marginLeft:
        Spacing.sm,
      color:
        Colors.text,
      fontSize:
        Typography.caption,
      fontWeight:
        "600",
    },

    drawerItemTextDanger: {
      color:
        Colors.danger,
    },
  });
