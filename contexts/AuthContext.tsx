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

type Usuario = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  cliente_id?: string | null;
  usina_id?: string | null;
};

type AuthContextType = {
  usuario: Usuario | null;
  loading: boolean;
  login: (usuario: Usuario) => Promise<void>;
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

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    carregarSessao();
  }, []);

  async function carregarSessao() {
  try {
    const dados = await obterSessao();

    console.log("================================");
    console.log("SESSÃO:", dados);
    console.log("================================");

    if (dados) {
      setUsuario(dados);
    }
  } finally {
    setLoading(false);
  }
}

  async function login(usuario: Usuario) {
    await salvarSessao(usuario);

    setUsuario(usuario);
  }

  async function logout() {
    await removerSessao();

    setUsuario(null);
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
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