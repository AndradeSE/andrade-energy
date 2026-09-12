import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import {
  Alert,
  Image,
  ImageBackground,
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
import { listarAcessoContratos } from "../services/contratos.service";
import { listarMinhasEmpresas } from "../services/empresas.service";

import {
  Colors,
  Radius,
  Spacing,
  Typography,
} from "../theme";
import { IS_GERADOR_APP } from "../config/appVariant";
import PortalBrandLogo from "../components/brand/PortalBrandLogo";

export default function SelecionarUnidade() {
  const { empresa, trocarEmpresa } = useEmpresa();
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

  const [empresasDisponiveis, setEmpresasDisponiveis] = useState<any[]>([]);
  const [trocandoEmpresa, setTrocandoEmpresa] = useState(false);

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
          const usinas = await listarUsinas();
          const fotos = await AsyncStorage.multiGet(usinas.map((usina: any) => `foto-card-usina:${usina.id}`));
          const fotoPorChave = new Map(fotos);
          setItens(usinas.map((usina: any) => ({ ...usina, foto_card_local: fotoPorChave.get(`foto-card-usina:${usina.id}`) || "" })));
          return;
        }

        if (!usuario?.cpf) {
          console.log(
            "Usuário sem CPF para localizar unidades."
          );
          setErro(true);
          return;
        }

        const [unidades, acessos] = await Promise.all([
          listarMinhasUnidades(),
          listarAcessoContratos().catch(() => []),
        ]);
        const acessoPorId = new Map(acessos.map((item: any) => [String(item.id), item]));
        const fotos = await AsyncStorage.multiGet(unidades.map((unidade: any) => `foto-card-uc:${unidade.id}`));
        const fotoPorChave = new Map(fotos);
        setItens(unidades.map((unidade: any) => ({ ...unidade, ...(acessoPorId.get(String(unidade.id)) ?? {}), foto_card_local: fotoPorChave.get(`foto-card-uc:${unidade.id}`) || "" })));
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
      empresa.id,
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

  useEffect(() => {
    if (gestor) return;
    listarMinhasEmpresas().then(setEmpresasDisponiveis).catch(() => setEmpresasDisponiveis([]));
  }, [gestor, usuario?.id]);

  async function escolherEmpresa(empresaId: string) {
    if (empresaId === empresa.id || trocandoEmpresa) return;
    setTrocandoEmpresa(true);
    try {
      await selecionarUnidade(null);
      await trocarEmpresa(empresaId);
      await carregar();
    } catch (error: any) {
      Alert.alert("Não foi possível trocar", error?.response?.data?.message ?? "Tente novamente.");
    } finally {
      setTrocandoEmpresa(false);
    }
  }

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

  async function personalizarFundo(unidade: UnidadeConsumidora) {
    const resultado = await DocumentPicker.getDocumentAsync({ type: "image/*", copyToCacheDirectory: true, multiple: false });
    if (resultado.canceled || !resultado.assets?.[0]?.uri) return;
    try {
      const extensao = resultado.assets[0].name?.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
      const destino = `${FileSystem.documentDirectory}card-uc-${unidade.id}.${extensao}`;
      await FileSystem.copyAsync({ from: resultado.assets[0].uri, to: destino });
      await AsyncStorage.setItem(`foto-card-uc:${unidade.id}`, destino);
      setItens((atuais) => atuais.map((item) => item.id === unidade.id ? { ...item, foto_card_local: destino } : item));
    } catch {
      Alert.alert("Não foi possível alterar o fundo", "Escolha outra imagem e tente novamente.");
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
      const acesso = unidade as UnidadeConsumidora & { liberado?: boolean; contratoId?: string | null };
      if (acesso.liberado === false && !acesso.contratoId) {
        Alert.alert(
          "Contrato em preparação",
          "Esta UC já foi cadastrada, mas ainda precisa ter o contrato próprio gerado e enviado pelo gerador.",
        );
        return;
      }
      /*
       * IMPORTANTE:
       *
       * Esperamos o contexto salvar
       * a unidade antes de navegar.
       */
      await selecionarUnidade(
        unidade
      );

      if (acesso.liberado === false && acesso.contratoId) {
        router.replace("/(tabs)/contrato");
        return;
      }

      console.log(
        "ENTRANDO NA UNIDADE:",
        unidade.numero
      );

      // Abra sempre a Home da UC. Navegar apenas para o contêiner das abas
      // preservava a última aba ativa e podia devolver o consumidor à tela
      // de contrato mesmo quando não havia bloqueio de assinatura.
      router.replace(
        "/"
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
        <View style={[styles.headerTop, gestor && styles.headerTopGerador]}>
          <TouchableOpacity accessibilityLabel="Opções da conta" onPress={() => setMenuAberto(true)} style={[styles.menuButton, gestor && styles.menuButtonGerador]}>
            <Ionicons name="menu" size={27} color="#FFFFFF" />
          </TouchableOpacity>
          <View pointerEvents={gestor ? "none" : "auto"} style={[styles.logoBox, gestor && styles.logoBoxGerador]}>
            <PortalBrandLogo height={44} width={158} />
          </View>
          {gestor && usuario?.perfil === "ADMIN" ? (
            <TouchableOpacity
              accessibilityLabel="Trocar ambiente"
              onPress={() => router.replace("/admin/escolher-area" as any)}
              style={styles.environmentButton}
            >
              <Ionicons name="swap-horizontal" size={20} color="#FFFFFF" />
              <Text style={styles.environmentButtonText}>Ambiente</Text>
            </TouchableOpacity>
          ) : null}
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
            {!gestor && empresasDisponiveis.length > 1 ? (
              <View style={styles.companySelector}>
                <Text style={styles.companySelectorTitle}>Escolha o gerador</Text>
                <Text style={styles.companySelectorText}>Cada ambiente mostra somente as UCs e contratos daquele gerador.</Text>
                <View style={styles.companyOptions}>
                  {empresasDisponiveis.map((item) => {
                    const selecionada = item.id === empresa.id;
                    return <TouchableOpacity key={item.id} disabled={trocandoEmpresa} onPress={() => void escolherEmpresa(item.id)} style={[styles.companyOption, selecionada && styles.companyOptionActive]}>
                      <Ionicons name={selecionada ? "checkmark-circle" : "business-outline"} size={19} color={selecionada ? "#FFFFFF" : Colors.primary} />
                      <Text numberOfLines={1} style={[styles.companyOptionText, selecionada && styles.companyOptionTextActive]}>{item.nome}</Text>
                    </TouchableOpacity>;
                  })}
                </View>
              </View>
            ) : null}
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

          if (gestor && usina) {
            const inativa = usina.status === "INATIVA";
            const energiaCompetencia = Math.max(0, Number(usina.fechamento_atual?.energia_gerada ?? 0));
            const producaoMedia = Math.max(0, Number(usina.producao_media_12_meses ?? usina.geracao_media ?? 0));
            const geracaoTotal = Math.max(energiaCompetencia, Number(usina.geracao_total ?? 0));
            const energia = (valor: number) => `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kWh`;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Acessar usina ${usina.nome}`}
                onPress={() => void escolherUsina(usina)}
                style={({ pressed }) => [styles.plantCard, pressed && styles.plantPressed]}
              >
                <ImageBackground source={usina.foto_card_local ? { uri: usina.foto_card_local } : require("../assets/images/usina-loading.jpeg")} imageStyle={styles.plantCoverImage} style={styles.plantCover}>
                  <LinearGradient colors={["rgba(2,25,18,.12)", "rgba(2,25,18,.88)"]} style={styles.plantCoverShade}>
                    <View style={styles.plantCoverTop}><View style={styles.plantLiveBadge}><View style={[styles.plantLiveDot, inativa && styles.plantLiveDotInactive]} /><Text style={styles.plantLiveText}>{inativa ? "INATIVA" : "EM OPERAÇÃO"}</Text></View><Ionicons name="chevron-forward-circle" size={27} color="#FFF" /></View>
                    <View style={styles.plantGeneration}><Text style={styles.plantGenerationLabel}>GERAÇÃO NESTA COMPETÊNCIA</Text><Text style={styles.plantGenerationValue}>{energia(energiaCompetencia)}</Text></View>
                    <View style={styles.plantCoverMetrics}><View style={styles.plantCoverMetric}><Text style={styles.plantCoverMetricLabel}>MÉDIA MENSAL</Text><Text style={styles.plantCoverMetricValue}>{energia(producaoMedia)}</Text></View><View style={styles.plantCoverDivider} /><View style={styles.plantCoverMetric}><Text style={styles.plantCoverMetricLabel}>ACUMULADA</Text><Text style={styles.plantCoverMetricValue}>{energia(geracaoTotal)}</Text></View></View>
                  </LinearGradient>
                </ImageBackground>
                <View style={styles.plantBody}>
                <View style={styles.plantHeading}>
                  <View style={[styles.plantIcon, { backgroundColor: "#FFFFFF" }]}>
                    <Image resizeMode="contain" source={require("../assets/images/android-icon-gerador-safe.png")} style={styles.plantAppIcon} />
                  </View>
                  <View style={styles.plantIdentity}>
                    <Text style={styles.plantEyebrow}>USINA GERADORA</Text>
                    <Text style={styles.plantName}>{usina.nome}</Text>
                  </View>
                </View>
                <View style={styles.plantStatusRow}>
                  <View style={[styles.plantStatusDot, inativa && styles.plantInactive]} />
                  <Text style={styles.plantStatusText}>{inativa ? "Inativa" : usina.status === "ATIVA" ? "Ativa" : "Cadastrada"}</Text>
                  {usina.distribuidora ? <Text style={styles.plantUtility}>{usina.distribuidora}</Text> : null}
                </View>
                {usina.numero_instalacao ? (
                  <View style={styles.plantDetail}>
                    <Ionicons name="flash-outline" size={16} color="#577268" />
                    <Text style={styles.plantDetailText}>Instalação {usina.numero_instalacao}</Text>
                  </View>
                ) : null}
                {usina.endereco ? (
                  <View style={styles.plantDetail}>
                    <Ionicons name="location-outline" size={16} color="#577268" />
                    <Text style={styles.plantDetailText}>{usina.endereco}</Text>
                  </View>
                ) : null}
                <View style={styles.plantFooter}>
                  <Text style={styles.plantAction}>Acessar gestão da usina</Text>
                  <View style={[styles.plantArrow, { backgroundColor: corPrincipal }]}>
                    <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
                  </View>
                </View>
                </View>
              </Pressable>
            );
          }

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
                <ImageBackground source={unidade?.foto_card_local ? { uri: unidade.foto_card_local } : require("../assets/images/usina-loading.jpeg")} imageStyle={styles.unitCoverImage} style={styles.unitCover}>
                  <LinearGradient colors={["rgba(3,30,22,.12)", "rgba(3,30,22,.88)"]} style={styles.unitCoverShade}>
                    <View style={styles.unitCoverTop}>
                      <View style={styles.unitLiveBadge}><View style={styles.unitLiveDot} /><Text style={styles.unitLiveText}>{item.status === "INATIVA" ? "INATIVA" : "ATIVA"}</Text></View>
                      <TouchableOpacity accessibilityLabel={`Personalizar fundo da UC ${unidade!.numero}`} hitSlop={8} onPress={(event) => { event.stopPropagation(); void personalizarFundo(unidade!); }} style={styles.unitPhotoButton}><Ionicons name="image-outline" size={18} color="#FFF" /></TouchableOpacity>
                    </View>
                    <View style={styles.unitCoverIdentity}>
                      <Text style={styles.unitCoverEyebrow}>MINHA UNIDADE</Text>
                      <Text numberOfLines={1} style={styles.unitCoverTitle}>{unidade!.apelido || `UC ${unidade!.numero}`}</Text>
                    </View>
                    <View style={styles.unitCoverMetrics}>
                      <View style={styles.unitCoverMetric}><Text style={styles.unitCoverMetricLabel}>MODALIDADE</Text><Text style={styles.unitCoverMetricValue}>{String(unidade!.modalidade_faturamento ?? "COMPENSAÇÃO").replace("_", " ")}</Text></View>
                      <View style={styles.unitCoverDivider} />
                      <View style={styles.unitCoverMetric}><Text style={styles.unitCoverMetricLabel}>DESCONTO</Text><Text style={styles.unitCoverMetricValue}>{Number(unidade!.desconto_percentual ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</Text></View>
                    </View>
                  </LinearGradient>
                </ImageBackground>
                <View style={styles.unitBody}>
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
                      NÚMERO DA UC
                    </Text>

                    <Text
                      style={
                        styles.unitNumber
                      }
                    >
                      {unidade!.numero}
                    </Text>
                  </View>

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
                        : "Contrato ativo"}
                    </Text>
                  </View>
                </View>

                <View style={styles.unitFacts}>
                  <View style={styles.unitFact}>
                    <Text style={styles.holderLabel}>TITULAR DA FATURA</Text>
                    <Text numberOfLines={1} style={styles.holder}>{unidade!.titular || usuario?.nome}</Text>
                  </View>
                  <View style={styles.unitFact}>
                    <Text style={styles.holderLabel}>CONCESSIONÁRIA</Text>
                    <Text numberOfLines={1} style={styles.holder}>{unidade!.distribuidora || "Não informada"}</Text>
                  </View>
                </View>

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

                <View style={styles.unitActionsRow}>
                  <TouchableOpacity accessibilityLabel={`Nomear UC ${unidade!.numero}`} hitSlop={8} onPress={(event) => { event.stopPropagation(); setUnidadeNomeando(unidade!); setApelido(String(unidade!.apelido ?? "")); }} style={styles.renameButton}><Ionicons name="pencil-outline" size={17} color={Colors.primary} /><Text style={styles.renameText}>{unidade!.apelido ? "Alterar nome" : "Dar um nome"}</Text></TouchableOpacity>
                  <View style={styles.openHint}>
                    <Text style={styles.openText}>Acessar</Text>
                    <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
                  </View>
                </View>
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
    plantCard: {
      marginBottom: 16, padding: 0, overflow: "hidden", borderRadius: 22,
      backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D4E5DC",
      shadowColor: "#163F30", shadowOpacity: 0.07, shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 }, elevation: 2,
    },
    plantCover: { height: 210, justifyContent: "flex-end" },
    plantCoverImage: { borderTopLeftRadius: 22, borderTopRightRadius: 22 },
    plantCoverShade: { flex: 1, justifyContent: "space-between", padding: Spacing.md },
    plantCoverTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    plantLiveBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 9, paddingVertical: 5, borderRadius: Radius.round, backgroundColor: "rgba(2,32,23,.62)" },
    plantLiveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#38E184" },
    plantLiveDotInactive: { backgroundColor: "#FBBF24" },
    plantLiveText: { color: "#FFF", fontSize: 9, fontWeight: "900", letterSpacing: .8 },
    plantGeneration: { alignItems: "center" },
    plantGenerationLabel: { color: "rgba(255,255,255,.76)", fontSize: 10, fontWeight: "900", letterSpacing: .8 },
    plantGenerationValue: { marginTop: 4, color: "#FFF", fontSize: 32, fontWeight: "900", textShadowColor: "rgba(0,0,0,.35)", textShadowRadius: 4 },
    plantCoverMetrics: { flexDirection: "row", alignItems: "center", paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,.28)" },
    plantCoverMetric: { flex: 1, alignItems: "center" },
    plantCoverMetricLabel: { color: "rgba(255,255,255,.68)", fontSize: 9, fontWeight: "800" },
    plantCoverMetricValue: { marginTop: 3, color: "#FFF", fontSize: Typography.small, fontWeight: "900" },
    plantCoverDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,.3)" },
    plantBody: { padding: 20 },
    plantPressed: { opacity: 0.85, backgroundColor: "#F1F8F4" },
    plantHeading: { flexDirection: "row", alignItems: "center", gap: 14 },
    plantIcon: { width: 66, height: 66, overflow: "hidden", borderRadius: 19, alignItems: "center", justifyContent: "center" },
    plantAppIcon: { width: 78, height: 78 },
    plantIdentity: { flex: 1, minWidth: 0 },
    plantEyebrow: { color: "#577268", fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
    plantName: { color: "#173D30", fontSize: 21, fontWeight: "800", marginTop: 5 },
    plantStatusRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 7, marginTop: 18, marginBottom: 10 },
    plantStatusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#169B63" },
    plantInactive: { backgroundColor: "#947329" },
    plantStatusText: { fontSize: 12, color: "#38594B", fontWeight: "600" },
    plantUtility: { fontSize: 12, color: "#577268", marginLeft: 7, flexShrink: 1 },
    plantDetail: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 6 },
    plantDetailText: { flex: 1, color: "#577268", fontSize: 13, lineHeight: 19 },
    plantFooter: { borderTopWidth: 1, borderTopColor: "#E7EFEA", paddingTop: 14, marginTop: 17, flexDirection: "row", alignItems: "center", gap: 12 },
    plantAction: { flex: 1, color: "#173D30", fontSize: 14, fontWeight: "700" },
    plantArrow: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
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

    companySelector: {
      marginBottom: Spacing.md,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: "#C9DED1",
      borderRadius: Radius.lg,
      backgroundColor: "#F4FAF6",
    },
    companySelectorTitle: { color: Colors.text, fontSize: Typography.card, fontWeight: "900" },
    companySelectorText: { marginTop: 4, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 18 },
    companyOptions: { gap: Spacing.xs, marginTop: Spacing.sm },
    companyOption: { minHeight: 46, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: "#B9D8C7", borderRadius: Radius.md, backgroundColor: Colors.surface },
    companyOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
    companyOptionText: { flex: 1, color: Colors.text, fontSize: Typography.small, fontWeight: "800" },
    companyOptionTextActive: { color: "#FFFFFF" },

    headerTopGerador: {
      justifyContent: "center",
      position: "relative",
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

    menuButtonGerador: {
      position: "absolute",
      left: 0,
      zIndex: 2,
      marginRight: 0,
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

    logoBoxGerador: {
      flex: 0,
      width: 158,
      alignItems: "center",
    },

    environmentButton: {
      position: "absolute",
      right: 0,
      zIndex: 2,
      minWidth: 58,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },

    environmentButtonText: {
      marginTop: 1,
      color: "#FFFFFF",
      fontSize: 9,
      fontWeight: "800",
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
      padding: 0,
      overflow: "hidden",
      borderRadius:
        Radius.xl,
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor: "#D4E5DC",
      shadowColor:
        "#000",
      shadowOpacity:
        0.07,
      shadowRadius: 12,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      elevation: 2,
    },

    unitCover: { height: 196, justifyContent: "flex-end" },
    unitCoverImage: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl },
    unitCoverShade: { flex: 1, justifyContent: "space-between", padding: Spacing.md },
    unitCoverTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    unitLiveBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 9, paddingVertical: 5, borderRadius: Radius.round, backgroundColor: "rgba(2,32,23,.62)" },
    unitLiveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#38E184" },
    unitLiveText: { color: "#FFF", fontSize: 9, fontWeight: "900", letterSpacing: .8 },
    unitPhotoButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: Radius.round, backgroundColor: "rgba(2,32,23,.62)" },
    unitCoverEyebrow: { color: "rgba(255,255,255,.72)", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
    unitCoverIdentity: { alignItems: "center" },
    unitCoverTitle: { marginTop: 4, color: "#FFF", fontSize: 28, fontWeight: "900", textShadowColor: "rgba(0,0,0,.35)", textShadowRadius: 4 },
    unitCoverMetrics: { flexDirection: "row", alignItems: "center", paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,.28)" },
    unitCoverMetric: { flex: 1, alignItems: "center" },
    unitCoverMetricLabel: { color: "rgba(255,255,255,.68)", fontSize: 9, fontWeight: "800" },
    unitCoverMetricValue: { marginTop: 3, color: "#FFF", fontSize: Typography.small, fontWeight: "900" },
    unitCoverDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,.3)" },
    unitBody: { padding: Spacing.md },

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
        Spacing.sm,
      paddingVertical: 6,
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

    unitFacts: {
      flexDirection: "row",
      gap: Spacing.sm,
      marginTop: Spacing.md,
    },

    unitFact: {
      flex: 1,
      minWidth: 0,
      padding: Spacing.sm,
      borderWidth: 1,
      borderColor: "#D7E6DE",
      borderRadius: Radius.md,
      backgroundColor: "#F2F7F4",
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
      justifyContent: "center",
      gap: 4,
      minHeight: 40,
      paddingHorizontal: 14,
      borderRadius: Radius.round,
      backgroundColor: Colors.primary,
    },

    openText: {
      color: "#FFFFFF",
      fontSize:
        Typography.small,
      fontWeight:
        "800",
    },

    renameButton: {
      flex: 1,
      minHeight: 40,
      justifyContent: "center",
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

    unitActionsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
      marginTop: Spacing.md,
      paddingTop: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: "#E0EAE5",
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
