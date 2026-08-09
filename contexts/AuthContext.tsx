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
  perfil: string;
  cliente_id?: string | null;
  usina_id?: string | null;
};

type AuthContextType = {
  usuario: Usuario | null;
  token: string | null;
  loading: boolean;

  login: (
    token: string,
    usuario: Usuario
  ) => Promise<void>;

  logout: () => Promise<void>;
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

  useEffect(() => {
    carregarSessao();
  }, []);

  async function carregarSessao() {
    try {
      const sessao = await obterSessao();

      console.log("================================");
      console.log("SESSÃO:", sessao);
      console.log("================================");

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
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}