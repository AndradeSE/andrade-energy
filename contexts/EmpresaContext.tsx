import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "./AuthContext";
import { IdentidadeEmpresa, obterEmpresaAtual } from "../services/empresas.service";

const ANDRADE_PADRAO: IdentidadeEmpresa = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "andrade-energy",
  nome: "Andrade Energy",
  cor_primaria: "#087A46",
  cor_secundaria: "#F7D75C",
  empresa_proprietaria: true,
  identidade_personalizada: true,
};

type EmpresaContextData = {
  empresa: IdentidadeEmpresa;
  carregandoEmpresa: boolean;
  recarregarEmpresa: () => Promise<void>;
};

const EmpresaContext = createContext<EmpresaContextData | undefined>(undefined);

export function EmpresaProvider({ children }: { children: ReactNode }) {
  const { authenticated, usuario } = useAuth();
  const [empresa, setEmpresa] = useState(ANDRADE_PADRAO);
  const [carregandoEmpresa, setCarregandoEmpresa] = useState(false);

  async function recarregarEmpresa() {
    if (!authenticated) {
      setEmpresa(ANDRADE_PADRAO);
      return;
    }
    setCarregandoEmpresa(true);
    try {
      const atual = await obterEmpresaAtual();
      setEmpresa(atual.identidade_personalizada ? atual : { ...ANDRADE_PADRAO, id: atual.id, slug: atual.slug });
    } catch {
      setEmpresa(ANDRADE_PADRAO);
    } finally {
      setCarregandoEmpresa(false);
    }
  }

  useEffect(() => {
    void recarregarEmpresa();
  }, [authenticated, usuario?.id, usuario?.empresa_id]);

  const valor = useMemo(
    () => ({ empresa, carregandoEmpresa, recarregarEmpresa }),
    [empresa, carregandoEmpresa],
  );

  return <EmpresaContext.Provider value={valor}>{children}</EmpresaContext.Provider>;
}

export function useEmpresa() {
  const contexto = useContext(EmpresaContext);
  if (!contexto) throw new Error("useEmpresa deve ser usado dentro de EmpresaProvider");
  return contexto;
}

