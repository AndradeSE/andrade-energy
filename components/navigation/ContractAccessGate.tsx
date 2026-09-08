import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router, usePathname } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../config/api";

/** Consulta o servidor em cada navegação; não usa o cache local como autorização. */
export default function ContractAccessGate() {
  const { usuario, unidadeSelecionada, selecionarUnidade, signOut } = useAuth();
  const path = usePathname();
  const [bloqueado, setBloqueado] = useState(false);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    let ativo = true;
    if (usuario?.perfil !== "LEITURA" || /^(?:\/\(tabs\))?\/(?:login|criar-conta|contrato|perfil|biometric|selecionar-unidade)(?:\/|$)/.test(path)) {
      setBloqueado(false); return;
    }
    setBloqueado(true); setErro(false);
    api.get("/contratos/acesso/minhas-unidades").then(async ({ data }) => {
      if (!ativo) return;
      if (!Array.isArray(data) || !data.length) {
        setErro(true); return;
      }
      const atual = data.find((uc: any) => uc.id === unidadeSelecionada?.id);
      const liberadas = data.filter((uc: any) => uc.liberado);
      const pendente = atual && !atual.liberado ? atual : !liberadas.length ? data[0] : null;
      if (pendente?.contratoId) {
        await selecionarUnidade(pendente);
        if (ativo) router.replace("/(tabs)/contrato");
      } else if (pendente) {
        // Sem contrato vinculado não existe documento que o consumidor possa
        // assinar. Volte à seleção em vez de prendê-lo numa aba sem saída.
        if (ativo) router.replace("/selecionar-unidade");
      } else if (ativo) setBloqueado(false);
    }).catch(() => { if (ativo) setErro(true); });
    return () => { ativo = false; };
  }, [usuario?.id, usuario?.perfil, unidadeSelecionada?.id, path, tentativa]);
  if (!bloqueado) return null;
  return <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, zIndex: 10000, backgroundColor: "#EFF6F2", justifyContent: "center", alignItems: "center", padding: 28 }}>
    {erro ? <><Text>Não foi possível verificar seus contratos.</Text><Pressable onPress={() => setTentativa(v => v + 1)}><Text style={{ padding: 20 }}>Tentar novamente</Text></Pressable><Pressable onPress={() => void signOut()}><Text>Sair da conta</Text></Pressable></> : <><ActivityIndicator /><Text>Verificando acesso à unidade...</Text></>}
  </View>;
}
