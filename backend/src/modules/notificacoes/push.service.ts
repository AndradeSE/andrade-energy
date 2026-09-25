import { supabase } from "../../config/supabase";

export type NovaNotificacaoApp = {
  usuario_id: string;
  empresa_id: string;
  tipo: string;
  titulo: string;
  detalhe?: string | null;
  rota?: string | null;
  chave_dedupe?: string | null;
};

function tokenExpoValido(token: string) {
  return /^ExponentPushToken\[[^\]]+\]$|^ExpoPushToken\[[^\]]+\]$/.test(token);
}

export async function enviarPushDaNotificacao(notificacao: NovaNotificacaoApp & { id?: string }) {
  const { data: dispositivos, error } = await supabase.from("dispositivos_push")
    .select("token")
    .eq("usuario_id", notificacao.usuario_id)
    .eq("empresa_id", notificacao.empresa_id)
    .eq("ativo", true);
  if (error) throw error;

  const tokens = [...new Set((dispositivos ?? []).map((item: any) => String(item.token)).filter(tokenExpoValido))];
  if (!tokens.length) return;

  const mensagens = tokens.map((to) => ({
    to,
    title: notificacao.titulo,
    body: notificacao.detalhe || notificacao.titulo,
    sound: "default",
    channelId: "avisos-importantes",
    priority: "high",
    data: {
      notificacaoId: notificacao.id,
      tipo: notificacao.tipo,
      url: notificacao.rota || "/",
    },
  }));

  const resposta = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(mensagens),
  });
  if (!resposta.ok) throw new Error(`Expo Push respondeu HTTP ${resposta.status}`);

  const corpo: any = await resposta.json();
  const tickets = Array.isArray(corpo?.data) ? corpo.data : [corpo?.data];
  const invalidos = tickets.flatMap((ticket: any, indice: number) =>
    ticket?.details?.error === "DeviceNotRegistered" ? [tokens[indice]] : [],
  );
  if (invalidos.length) {
    await supabase.from("dispositivos_push").update({ ativo: false, atualizado_em: new Date().toISOString() }).in("token", invalidos);
  }
}

export async function criarNotificacaoApp(notificacao: NovaNotificacaoApp) {
  // A unicidade de chave_dedupe é um índice parcial no PostgreSQL. O
  // PostgREST não consegue usá-lo como alvo simples de ON CONFLICT; por isso
  // a notificação deve ser inserida normalmente e a corrida tratada por 23505.
  if (notificacao.chave_dedupe) {
    const { data: existente, error: erroBusca } = await supabase.from("notificacoes_app")
      .select("id").eq("chave_dedupe", notificacao.chave_dedupe).maybeSingle();
    if (erroBusca) throw erroBusca;
    if (existente) return null;
  }
  const { data, error } = await supabase.from("notificacoes_app").insert(notificacao).select("id").maybeSingle();
  if (error?.code === "23505" && notificacao.chave_dedupe) return null;
  if (error) throw error;
  if (!data) return null;
  // A falha do provedor de push não pode impedir a ação de negócio nem o aviso no sino.
  void enviarPushDaNotificacao({ ...notificacao, id: data.id }).catch((erro) =>
    console.error("Falha ao enviar push Expo", { tipo: erro?.name ?? "Error" }),
  );
  return data;
}
