import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, Linking, StyleSheet, Text, View } from "react-native";
import { AppHeader, Button, Card, ElasticScrollView, Screen } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import { IS_GERADOR_APP } from "../config/appVariant";
import { canViewServiceQuotas } from "../utils/service-quota-access";
import { listServiceQuotas, refreshServiceQuotas, type ServiceQuotas } from "../services/cotas-servicos.service";
import { Colors, Spacing } from "../theme";
import ContingencyControl from '../components/ContingencyControl';
import {contingencyRoutingEnabled} from '../config/api';

const number = (value: number) => Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const date = (value: string) => new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
const panels: Record<string, string> = { AZURE: "https://portal.azure.com/", RENDER: "https://dashboard.render.com/", RESEND: "https://resend.com/overview", BREVO: "https://app.brevo.com/", NETLIFY: "https://app.netlify.com/", SUPABASE: "https://supabase.com/dashboard" };
export default function ServiceQuotasScreen() {
  const { usuario } = useAuth();
  const allowed = IS_GERADOR_APP && canViewServiceQuotas(usuario);
  const [data, setData] = useState<ServiceQuotas | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useFocusEffect(useCallback(() => {
    let active = true;
    if (!allowed) { setData(null); return; }
    setBusy(true); setError("");
    void listServiceQuotas().then(result => { if (active) setData(result); })
      .catch(() => { if (active) setError("Não foi possível carregar as cotas. Tente atualizar."); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [allowed, usuario?.id]));
  async function refresh() {
    if (busy || !allowed) return;
    setBusy(true); setError("");
    try { setData(await refreshServiceQuotas()); }
    catch { setError("Não foi possível atualizar agora. Aguarde um minuto e tente novamente."); }
    finally { setBusy(false); }
  }
  const quotaGroups: ServiceQuotas["servicos"][] = [];
  for (const item of data?.servicos ?? []) {
    const resendGroup = item.servico === "RESEND" ? quotaGroups.find(group => group[0].servico === "RESEND") : undefined;
    if (resendGroup) resendGroup.push(item);
    else quotaGroups.push([item]);
  }
  return <Screen><AppHeader title="Cotas de serviços" subtitle="Infraestrutura da plataforma" contextTitle="Administração" contextSubtitle="Uso e limites dos serviços" icon="speedometer-outline" showPlantContext={false} showPlantSwitch={false}/>
    <ElasticScrollView contentContainerStyle={styles.content}>
      {!allowed ? <Card><Text style={styles.title}>Acesso exclusivo de ADM</Text><Text style={styles.text}>Estas informações pertencem à administração da plataforma.</Text></Card> : <>
        <Text style={styles.text}>Avisos no sino e por push em 80%, 90% e 100%, sem repetir a mesma faixa no período. Somente ADM recebe estes avisos no Gerador.</Text>
        {data?.ambiente === "preview" ? <Text style={styles.note}>Homologação · dados e avisos deste ambiente</Text> : null}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {busy ? <ActivityIndicator color={Colors.primary} accessibilityLabel="Consultando cotas"/> : null}
        <Button title={busy ? "Consultando…" : "Atualizar consultas automáticas"} disabled={busy} onPress={() => void refresh()}/>
        {quotaGroups.map(group => <Card key={`${group[0].servico}:${group[0].metrica}`}>
          <Text style={styles.title}>{group[0].servico === "RESEND" ? "Resend · e-mails" : group[0].rotulo}</Text>
          {group.map((item, index) => {
          const reading = item.leitura;
          const pct = reading?.percentual;
          const partialReadingFresh = item.consulta?.status === "SEM_DADOS_COMPLETOS" && reading && Date.parse(reading.verificado_em) >= Date.parse(item.consulta.consultado_em) - 60_000;
          const stale = reading?.desatualizada || (item.automatico && item.consulta?.status !== "OK" && !partialReadingFresh);
          return <View key={item.metrica} style={index > 0 ? styles.quotaDivider : undefined}>
            {item.servico === "RESEND" ? <Text style={styles.period}>{item.metrica === "emails_dia" ? "Cota diária" : "Cota mensal"}</Text> : null}
            {item.observacao ? <Text style={styles.note}>{item.observacao}</Text> : null}
            {reading ? <>
              <Text style={styles.balance}>{reading.limite === null ? "Sem limite definido no plano" : `${item.servico === "AZURE" ? "Estimativa: " : ""}${number(reading.restante ?? 0)} ${item.unidade} restantes`}</Text>
              <Text style={styles.text}>Utilizado: {number(reading.usado)}{reading.limite === null ? "" : ` de ${number(reading.limite)}`} {item.unidade}</Text>
              {pct !== null && pct !== undefined ? <><View style={styles.track}><View style={[styles.fill, { width: `${Math.min(Math.max(pct, 0), 100)}%`, backgroundColor: pct >= 90 ? "#B54228" : Colors.primary }]}/></View><Text style={styles.text}>{number(pct)}% utilizado</Text></> : null}
              <Text style={styles.text}>{item.servico === "BREVO" ? "Plano gratuito · limite diário de envios" : `${reading.origem === "API_OFICIAL" ? item.servico === "AZURE" ? "Renovação mensal prevista" : "Renovação informada" : "Leitura válida até"}: ${date(reading.renova_em)}`}</Text>
              <Text style={styles.note}>{reading.origem === "API_OFICIAL" ? "API oficial" : "Leitura confirmada do painel"} · {date(reading.verificado_em)}</Text>
              {stale ? <Text style={styles.warning}>Consulta desatualizada ou indisponível. Este saldo pode ter mudado.</Text> : null}
            </> : <Text style={styles.text}>{item.automatico ? item.consulta?.status === "SEM_PERMISSAO" ? "A chave configurada não permite consultar o uso." : item.consulta?.status === "PLANO_NAO_SUPORTADO" ? "O plano retornado não permite confirmar a cota gratuita. Confira o saldo no painel." : item.consulta?.status === "SEM_DADOS_COMPLETOS" ? "O Azure ainda não retornou medições para este item no mês. A ausência de dados não significa consumo zero." : "Sem leitura disponível. A consulta automática precisa estar conectada." : "Leitura manual: confira o painel do provedor e informe abaixo os valores para acompanhar o saldo aqui."}</Text>}
          </View>;
          })}
          <Text style={styles.link} accessibilityRole="link" onPress={() => void Linking.openURL(panels[group[0].servico]).catch(() => setError("Não foi possível abrir o painel."))}>Abrir painel do provedor</Text>
        </Card>)}
        <Text style={styles.note}>Os avisos não contratam planos nem compram créditos. Confira a política de troca e o estado do servidor reserva no controle abaixo.</Text>
        {contingencyRoutingEnabled?<ContingencyControl/>:null}
      </>}
    </ElasticScrollView></Screen>;
}
const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: 40, gap: Spacing.md },
  title: { fontSize: 18, fontWeight: "700", color: Colors.text, marginBottom: 8, flexShrink: 1 },
  text: { color: Colors.text, fontSize: 14, lineHeight: 21, marginBottom: 5 },
  period: { color: Colors.text, fontSize: 15, fontWeight: "700", marginBottom: 8 },
  quotaDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border, marginTop: Spacing.md, paddingTop: Spacing.md },
  balance: { color: Colors.primary, fontSize: 22, fontWeight: "700", marginBottom: 8, flexShrink: 1 },
  note: { color: "#64716A", fontSize: 12, lineHeight: 18 },
  error: { color: "#A52B21", fontSize: 14 }, warning: { color: "#985418", fontSize: 13, lineHeight: 19 },
  track: { height: 8, width: "100%", backgroundColor: "#E4EBE7", borderRadius: 4, overflow: "hidden", marginVertical: 8 },
  fill: { height: 8, borderRadius: 4 }, link: { color: Colors.primary, fontWeight: "700", paddingVertical: 14, minHeight: 44 },
});
