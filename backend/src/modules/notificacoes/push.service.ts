import { supabase } from "../../config/supabase";
import { deliverQueuedPush } from "./pushQueue";
import { EMPRESA_ANDRADE_ID } from "../../config/empresa";

export type NovaNotificacaoApp = {
  usuario_id: string;
  empresa_id: string;
  tipo: string;
  titulo: string;
  detalhe?: string | null;
  rota?: string | null;
  chave_dedupe?: string | null;
  cliente_id?: string | null;
  usina_id?: string | null;
};

function tokenExpoValido(token: string) {
  return /^ExponentPushToken\[[^\]]+\]$|^ExpoPushToken\[[^\]]+\]$/.test(token);
}

export async function enviarPushDaNotificacao(notificacao: NovaNotificacaoApp & { id?: string }) {
  if (notificacao.tipo === "COTA_SERVICO") {
    if (notificacao.empresa_id !== EMPRESA_ANDRADE_ID) return;
    const { data: membership, error: membershipError } = await supabase.from("empresa_usuarios")
      .select("usuarios!empresa_usuarios_usuario_id_fkey(perfil,ativo,empresa_id)")
      .eq("empresa_id", EMPRESA_ANDRADE_ID).eq("usuario_id", notificacao.usuario_id).eq("ativo", true)
      .in("papel", ["SUPERADMIN", "ADMIN_EMPRESA"]).maybeSingle();
    if (membershipError) throw new Error("Não foi possível verificar o destinatário ADM.");
    const user: any = Array.isArray(membership?.usuarios) ? membership.usuarios[0] : membership?.usuarios;
    if (!user?.ativo || user.perfil !== "ADMIN" || user.empresa_id !== EMPRESA_ANDRADE_ID) return;
  }
  let query = supabase.from("dispositivos_push")
    .select("token")
    .eq("usuario_id", notificacao.usuario_id)
    .eq("empresa_id", notificacao.empresa_id)
    .eq("ativo", true);
  if (notificacao.tipo === "COTA_SERVICO") query = query.eq("app_variante", "gerador");
  const { data: dispositivos, error } = await query;
  if (error) throw error;

  const tokens = [...new Set((dispositivos ?? []).map((item: any) => String(item.token)).filter(tokenExpoValido))];
  if (!tokens.length) return;

  const [usina, cliente] = await Promise.all([
    notificacao.usina_id
      ? supabase.from("usinas").select("nome").eq("id", notificacao.usina_id).eq("empresa_id", notificacao.empresa_id).maybeSingle()
      : Promise.resolve({ data: null }),
    notificacao.cliente_id
      ? supabase.from("clientes").select("nome").eq("id", notificacao.cliente_id).eq("empresa_id", notificacao.empresa_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const contexto = [
    usina.data?.nome ? `Usina: ${String(usina.data.nome).slice(0, 60)}` : null,
    cliente.data?.nome ? `Cliente: ${String(cliente.data.nome).slice(0, 60)}` : null,
  ].filter(Boolean).join(" · ");

  const mensagens = tokens.map((to) => ({
    to,
    title: notificacao.titulo,
    // A tela bloqueada pode mostrar o push para terceiros. Os detalhes
    // pessoais ficam apenas na caixa de notificações após autenticação.
    body: contexto || "Abra o aplicativo para ver os detalhes.",
    sound: "default",
    channelId: "avisos-contexto",
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
    signal: AbortSignal.timeout(10_000),
  });
  if (!resposta.ok) throw new Error(`Expo Push respondeu HTTP ${resposta.status}`);

  const corpo: any = await resposta.json();
  const tickets = Array.isArray(corpo?.data) ? corpo.data : [corpo?.data];
  if (tickets.length !== mensagens.length || tickets.some((ticket: any) => !ticket || !["ok", "error"].includes(ticket.status))) {
    throw new Error("Resposta de push inválida.");
  }
  for (const ticket of tickets) {
    if (ticket?.status === "error") {
      console.error("Expo recusou push", { motivo: ticket?.details?.error ?? "desconhecido" });
    }
  }
  const invalidos = tickets.flatMap((ticket: any, indice: number) =>
    ticket?.details?.error === "DeviceNotRegistered" ? [tokens[indice]] : [],
  );
  if (invalidos.length) {
    await supabase.from("dispositivos_push").update({ ativo: false, atualizado_em: new Date().toISOString() }).in("token", invalidos);
  }
  if (tickets.some((ticket: any) => ticket.status === "error" && ticket.details?.error !== "DeviceNotRegistered")) {
    throw new Error("Provedor recusou a entrega do push.");
  }
}

export async function criarNotificacaoApp(notificacao: NovaNotificacaoApp) {
  if (process.env.API_RUNTIME === "serverless" || process.env.API_DURABLE_PUSH === "true") {
    const { data: id, error } = await supabase.rpc("criar_notificacao_com_push", { p_notificacao: notificacao });
    if (error) throw error;
    if (!id) return null;
    // The notification and outbox entry commit together; provider failure is retryable.
    await deliverQueuedPush(supabase, enviarPushDaNotificacao, id).catch(() => console.warn("Push permanece pendente na fila."));
    return { id: String(id) };
  }
  // A unicidade de chave_dedupe é um índice parcial no PostgreSQL. O
  // PostgREST não consegue usá-lo como alvo simples de ON CONFLICT; por isso
  // a notificação deve ser inserida normalmente e a corrida tratada por 23505.
  if (notificacao.chave_dedupe) {
    const { data: existente, error: erroBusca } = await supabase.from("notificacoes_app")
      .select("id").eq("chave_dedupe", notificacao.chave_dedupe).maybeSingle();
    if (erroBusca) throw erroBusca;
    if (existente) return null;
  }
  const { cliente_id, usina_id, ...registro } = notificacao;
  const { data, error } = await supabase.from("notificacoes_app").insert(registro).select("id").maybeSingle();
  if (error?.code === "23505" && notificacao.chave_dedupe) return null;
  if (error) throw error;
  if (!data) return null;
  // A falha do provedor de push não pode impedir a ação de negócio nem o aviso no sino.
  void enviarPushDaNotificacao({ ...notificacao, id: data.id }).catch((erro) =>
    console.error("Falha ao enviar push Expo", { tipo: erro?.name ?? "Error" }),
  );
  return data;
}

export async function processarPushPendente() {
  return deliverQueuedPush(supabase, enviarPushDaNotificacao);
}
