import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  obterSessao,
  removerSessao,
  salvarSessao,
} from "../storage/session";

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  cpf?: string | null;
  perfil: string;
  cliente_id?: string | null;
  usina_id?: string | null;
};

export type UnidadeConsumidora = {
  id: string;
  numero: string;
  titular?: string | null;
  distribuidora?: string | null;
  endereco?: string | null;
  status?: string | null;
};

export type UsinaSelecionada = {
  id: string;
  nome: string;
  numero_instalacao?: string | null;
  distribuidora?: string | null;
  endereco?: string | null;
  status?: string | null;
};

type AuthContextType = {
  usuario: Usuario | null;
  token: string | null;
  loading: boolean;
  unidadeSelecionada: UnidadeConsumidora | null;
  usinaSelecionada: UsinaSelecionada | null;

  login: (
    token: string,
    usuario: Usuario
  ) => Promise<void>;

  logout: () => Promise<void>;
  selecionarUnidade: (unidade: UnidadeConsumidora | null) => void;
  selecionarUsina: (usina: UsinaSelecionada | null) => void;
};

const AuthContext = createContext<AuthContextType>(
  {} as AuthContextType
);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [usuario, setUsuario] =
    useState<Usuario | null>(null);

  const [token, setToken] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);
  const [unidadeSelecionada, setUnidadeSelecionada] =
    useState<UnidadeConsumidora | null>(null);
  const [usinaSelecionada, setUsinaSelecionada] =
    useState<UsinaSelecionada | null>(null);

  useEffect(() => {
    carregarSessao();
  }, []);

  async function carregarSessao() {
    try {
      const sessao = await obterSessao();

      if (sessao) {
        setUsuario(sessao.usuario);
        setToken(sessao.token);
      }
    } finally {
      setLoading(false);
    }
  }

  async function login(
  token: string,
  usuario: Usuario
) {

  await salvarSessao({
    token,
    usuario,
  });

  setToken(token);
  setUsuario(usuario);

}

  async function logout() {
    await removerSessao();

    setToken(null);
    setUsuario(null);
    setUnidadeSelecionada(null);
    setUsinaSelecionada(null);
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        loading,
        unidadeSelecionada,
        usinaSelecionada,
        login,
        logout,
        selecionarUnidade: setUnidadeSelecionada,
        selecionarUsina: setUsinaSelecionada,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
