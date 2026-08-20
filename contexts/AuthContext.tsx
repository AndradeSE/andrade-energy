import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import * as SecureStore from "expo-secure-store";
import { AppState } from "react-native";

import {
  autenticarComDigital,
  digitalEstaAtiva,
  migrarPreferenciaDigital,
  verificarDigitalDisponivel,
} from "../services/biometric.service";

import {
  obterSessao,
  removerSessao,
  salvarSessao as salvarSessaoStorage,
} from "../storage/session";

/*
 * ========================================================
 * CHAVES LOCAIS
 * ========================================================
 *
 * A sessão de autenticação NÃO fica aqui.
 *
 * Token + usuário continuam sendo controlados por:
 *
 * storage/session.ts
 *
 * porque config/api.ts utiliza obterSessao()
 * para montar o Authorization.
 *
 * SecureStore abaixo é usado somente para
 * unidade/usina selecionada.
 */

const UNIDADE_KEY =
  "andrade_energy_unidade";

const USINA_KEY =
  "andrade_energy_usina";

/*
 * ========================================================
 * TIPOS
 * ========================================================
 */

export type Perfil =
  | "ADMIN"
  | "GESTOR"
  | "LEITURA"
  | string;

export type AuthUsuario = {
  id?: string | number;

  nome?: string;

  email?: string;

  cpf?: string;

  perfil?: Perfil;

  telefone?: string;

  [key: string]: any;
};

export type UnidadeConsumidora = {
  id: string;

  numero: string;

  titular?: string;

  endereco?: string;

  distribuidora?: string;

  status?: string;

  numero_instalacao?: string | null;

  [key: string]: any;
};

export type UsinaSelecionada = {
  id: string;

  nome: string;

  numero_instalacao?: string | null;

  endereco?: string | null;

  distribuidora?: string | null;

  status?: string | null;

  [key: string]: any;
};

type AuthSession = {
  token: string;

  user: AuthUsuario;
};

type SessaoStorage = {
  token: string;

  usuario: AuthUsuario;
};

/*
 * ========================================================
 * CONTEXTO
 * ========================================================
 */

type AuthContextData = {
  token: string | null;

  usuario: AuthUsuario | null;

  user: AuthUsuario | null;

  session: AuthSession | null;

  perfil: Perfil | null;

  authenticated: boolean;

  isLoading: boolean;

  loading: boolean;

  unidadeSelecionada:
    UnidadeConsumidora | null;

  usinaSelecionada:
    UsinaSelecionada | null;

  selecionarUnidade: (
    unidade: UnidadeConsumidora | null
  ) => Promise<void>;

  selecionarUsina: (
    usina: UsinaSelecionada | null
  ) => Promise<void>;

  atualizarUsuario: (
    dados: Partial<AuthUsuario>
  ) => Promise<void>;

  digitalEnabled: boolean;

  isUnlocked: boolean;

  unlockWithDigital:
    () => Promise<boolean>;

  refreshDigitalStatus:
    () => Promise<void>;

  lockApp:
    () => void;

  login: (
    token: string,
    usuario: AuthUsuario
  ) => Promise<void>;

  logout:
    () => Promise<void>;

  signOut:
    () => Promise<void>;
};

const AuthContext =
  createContext<AuthContextData | undefined>(
    undefined
  );

/*
 * ========================================================
 * PROVIDER
 * ========================================================
 */

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [
    token,
    setToken,
  ] =
    useState<string | null>(
      null
    );

  const [
    usuario,
    setUsuario,
  ] =
    useState<AuthUsuario | null>(
      null
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    unidadeSelecionada,
    setUnidadeSelecionada,
  ] =
    useState<
      UnidadeConsumidora | null
    >(null);

  const [
    usinaSelecionada,
    setUsinaSelecionada,
  ] =
    useState<
      UsinaSelecionada | null
    >(null);

  const [
    digitalEnabled,
    setDigitalEnabled,
  ] =
    useState(false);

  const [
    isUnlocked,
    setIsUnlocked,
  ] =
    useState(false);

  /*
   * ======================================================
   * RESTAURAR SESSÃO
   * ======================================================
   */

  async function restaurarSessao() {
    try {
      setIsLoading(
        true
      );

      /*
       * IMPORTANTE:
       *
       * Aqui usamos exatamente o mesmo armazenamento
       * que config/api.ts utiliza.
       */

      const [
        sessaoSalva,
        unidadeSalva,
        usinaSalva,
      ] =
        await Promise.all([
          obterSessao(),

          SecureStore.getItemAsync(
            UNIDADE_KEY
          ),

          SecureStore.getItemAsync(
            USINA_KEY
          ),
        ]);

      /*
       * Nenhuma sessão válida
       */

      if (
        !sessaoSalva?.token ||
        !sessaoSalva?.usuario
      ) {
        setToken(
          null
        );

        setUsuario(
          null
        );

        setUnidadeSelecionada(
          null
        );

        setUsinaSelecionada(
          null
        );

        setDigitalEnabled(
          false
        );

        setIsUnlocked(
          false
        );

        return;
      }

      const sessao =
        sessaoSalva as SessaoStorage;

      const [preferenciaDigital, biometriaDisponivel] = await Promise.all([
        migrarPreferenciaDigital(sessao.usuario?.id),
        verificarDigitalDisponivel(),
      ]);
      const digitalAtiva = preferenciaDigital && biometriaDisponivel;

      setDigitalEnabled(digitalAtiva);

      /*
       * Restaura autenticação
       */

      setToken(
        sessao.token
      );

      setUsuario(
        sessao.usuario
      );

      /*
       * Restaura unidade
       */

      if (unidadeSalva) {
        try {
          const unidade =
            JSON.parse(
              unidadeSalva
            ) as UnidadeConsumidora;

          setUnidadeSelecionada(
            unidade
          );
        } catch (
          error
        ) {
          console.log(
            "Erro ao restaurar unidade:",
            error
          );

          await SecureStore.deleteItemAsync(
            UNIDADE_KEY
          );

          setUnidadeSelecionada(
            null
          );
        }
      }

      /*
       * Restaura usina
       */

      if (usinaSalva) {
        try {
          const usina =
            JSON.parse(
              usinaSalva
            ) as UsinaSelecionada;

          setUsinaSelecionada(
            usina
          );
        } catch (
          error
        ) {
          console.log(
            "Erro ao restaurar usina:",
            error
          );

          await SecureStore.deleteItemAsync(
            USINA_KEY
          );

          setUsinaSelecionada(
            null
          );
        }
      }

      /*
       * Se a digital estiver habilitada,
       * o aplicativo inicia bloqueado.
       *
       * biometric-lock fará o desbloqueio.
       */

      setIsUnlocked(
        !digitalAtiva
      );

      console.log(
        "SESSÃO RESTAURADA:",
        sessao.usuario?.email ??
          sessao.usuario?.id
      );
    } catch (
      error
    ) {
      console.log(
        "Erro ao restaurar sessão:",
        error
      );

      setToken(
        null
      );

      setUsuario(
        null
      );

      setUnidadeSelecionada(
        null
      );

      setUsinaSelecionada(
        null
      );

      setIsUnlocked(
        false
      );
    } finally {
      setIsLoading(
        false
      );
    }
  }

  /*
   * ======================================================
   * LOGIN
   * ======================================================
   */

  async function login(
    novoToken: string,
    novoUsuario: AuthUsuario
  ) {
    if (!novoToken) {
      throw new Error(
        "Token de autenticação não informado."
      );
    }

    if (!novoUsuario) {
      throw new Error(
        "Usuário não informado."
      );
    }

    try {
      /*
       * ESTA É A PARTE PRINCIPAL DA CORREÇÃO.
       *
       * O token volta a ser salvo no storage/session.ts.
       *
       * Assim config/api.ts encontrará:
       *
       * sessao.token
       */

      await salvarSessaoStorage({
        token:
          novoToken,

        usuario:
          novoUsuario,
      });

      /*
       * Atualiza contexto React
       */

      setToken(
        novoToken
      );

      setUsuario(
        novoUsuario
      );

      /*
       * Novo login começa sem unidade/usina.
       */

      setUnidadeSelecionada(
        null
      );

      setUsinaSelecionada(
        null
      );

      await Promise.all([
        SecureStore.deleteItemAsync(
          UNIDADE_KEY
        ),

        SecureStore.deleteItemAsync(
          USINA_KEY
        ),
      ]);

      /*
       * O usuário acabou de informar senha.
       * Portanto a sessão atual já está desbloqueada.
       */

      setIsUnlocked(
        true
      );

      /*
       * Atualiza status da digital.
       */

      await atualizarStatusDigital(novoUsuario?.id);

      console.log(
        "LOGIN SALVO:",
        novoUsuario?.email ??
          novoUsuario?.id,
        "PERFIL:",
        novoUsuario?.perfil
      );
    } catch (
      error
    ) {
      console.log(
        "Erro ao salvar sessão:",
        error
      );

      throw error;
    }
  }

  /*
   * ======================================================
   * SELECIONAR UNIDADE
   * ======================================================
   */

  async function selecionarUnidade(
    unidade:
      UnidadeConsumidora | null
  ) {
    try {
      /*
       * Usuário quer trocar de UC.
       */

      if (!unidade) {
        await SecureStore.deleteItemAsync(
          UNIDADE_KEY
        );

        setUnidadeSelecionada(
          null
        );

        return;
      }

      /*
       * Salva unidade.
       */

      await SecureStore.setItemAsync(
        UNIDADE_KEY,
        JSON.stringify(
          unidade
        )
      );

      setUnidadeSelecionada(
        unidade
      );

      /*
       * Consumidor e gerador são seleções
       * mutuamente exclusivas.
       */

      setUsinaSelecionada(
        null
      );

      await SecureStore.deleteItemAsync(
        USINA_KEY
      );

      console.log(
        "UNIDADE SELECIONADA:",
        unidade.numero
      );
    } catch (
      error
    ) {
      console.log(
        "Erro ao selecionar unidade:",
        error
      );

      throw error;
    }
  }

  const atualizarUsuario = useCallback(async (dados: Partial<AuthUsuario>) => {
    setUsuario((atual) => {
      const atualizado = { ...atual, ...dados } as AuthUsuario;
      if (token) void salvarSessaoStorage({ token, usuario: atualizado });
      return atualizado;
    });
  }, [token]);

  /*
   * ======================================================
   * SELECIONAR USINA
   * ======================================================
   */

  async function selecionarUsina(
    usina:
      UsinaSelecionada | null
  ) {
    try {
      if (!usina) {
        await SecureStore.deleteItemAsync(
          USINA_KEY
        );

        setUsinaSelecionada(
          null
        );

        return;
      }

      await SecureStore.setItemAsync(
        USINA_KEY,
        JSON.stringify(
          usina
        )
      );

      setUsinaSelecionada(
        usina
      );

      setUnidadeSelecionada(
        null
      );

      await SecureStore.deleteItemAsync(
        UNIDADE_KEY
      );

      console.log(
        "USINA SELECIONADA:",
        usina.nome
      );
    } catch (
      error
    ) {
      console.log(
        "Erro ao selecionar usina:",
        error
      );

      throw error;
    }
  }

  /*
   * ======================================================
   * STATUS DA DIGITAL
   * ======================================================
   */

  async function atualizarStatusDigital(usuarioId?: string | number) {
    try {
      const [preferenciaAtiva, biometriaDisponivel] = await Promise.all([
        digitalEstaAtiva(usuarioId),
        verificarDigitalDisponivel(),
      ]);
      const enabled = preferenciaAtiva && biometriaDisponivel;

      setDigitalEnabled(
        enabled
      );
    } catch (
      error
    ) {
      console.log(
        "Erro ao consultar status da digital:",
        error
      );

      setDigitalEnabled(
        false
      );
    }
  }

  async function refreshDigitalStatus() {
    await atualizarStatusDigital(usuario?.id);
  }

  /*
   * ======================================================
   * DESBLOQUEAR COM DIGITAL
   * ======================================================
   */

  async function unlockWithDigital():
    Promise<boolean> {
    try {
      const result =
        await autenticarComDigital();

      if (
        result.success
      ) {
        setIsUnlocked(
          true
        );

        console.log(
          "DIGITAL VALIDADA"
        );

        return true;
      }

      console.log(
        "DIGITAL NÃO VALIDADA:",
        result.error
      );

      return false;
    } catch (
      error
    ) {
      console.log(
        "Erro ao desbloquear com digital:",
        error
      );

      return false;
    }
  }

  /*
   * ======================================================
   * BLOQUEAR APP
   * ======================================================
   */

  function lockApp() {
    if (
      digitalEnabled &&
      token
    ) {
      setIsUnlocked(
        false
      );
    }
  }

  useEffect(() => {
    const inscricao = AppState.addEventListener("change", (estado) => {
      if (estado === "background" && digitalEnabled && token) {
        setIsUnlocked(false);
      }
    });

    return () => inscricao.remove();
  }, [digitalEnabled, token]);

  /*
   * ======================================================
   * LOGOUT
   * ======================================================
   */

  async function logout() {
    try {
      /*
       * Remove a sessão exatamente do local
       * utilizado pelo Axios.
       */

      await removerSessao();

      /*
       * Remove somente dados locais da seleção.
       */

      await Promise.all([
        SecureStore.deleteItemAsync(
          UNIDADE_KEY
        ),

        SecureStore.deleteItemAsync(
          USINA_KEY
        ),
      ]);
    } catch (
      error
    ) {
      console.log(
        "Erro ao limpar sessão:",
        error
      );
    }

    setToken(
      null
    );

    setUsuario(
      null
    );

    setUnidadeSelecionada(
      null
    );

    setUsinaSelecionada(
      null
    );

    setIsUnlocked(
      false
    );

    console.log(
      "SESSÃO ENCERRADA"
    );
  }

  async function signOut() {
    await logout();
  }

  /*
   * ======================================================
   * INICIALIZAÇÃO
   * ======================================================
   */

  useEffect(() => {
    void restaurarSessao();
  }, []);

  /*
   * ======================================================
   * SESSION
   * ======================================================
   */

  const session =
    useMemo<AuthSession | null>(
      () => {
        if (
          !token ||
          !usuario
        ) {
          return null;
        }

        return {
          token,

          user:
            usuario,
        };
      },
      [
        token,
        usuario,
      ]
    );

  const authenticated =
    Boolean(
      token &&
      usuario
    );

  const perfil =
    usuario?.perfil ??
    null;

  /*
   * ======================================================
   * PROVIDER
   * ======================================================
   */

  return (
    <AuthContext.Provider
      value={{
        token,

        usuario,

        user:
          usuario,

        session,

        perfil,

        authenticated,

        isLoading,

        loading:
          isLoading,

        unidadeSelecionada,

        usinaSelecionada,

        selecionarUnidade,

        selecionarUsina,

        atualizarUsuario,

        digitalEnabled,

        isUnlocked,

        unlockWithDigital,

        refreshDigitalStatus,

        lockApp,

        login,

        logout,

        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/*
 * ========================================================
 * HOOK
 * ========================================================
 */

export function useAuth() {
  const context =
    useContext(
      AuthContext
    );

  if (!context) {
    throw new Error(
      "useAuth deve ser usado dentro de AuthProvider"
    );
  }

  return context;
}
