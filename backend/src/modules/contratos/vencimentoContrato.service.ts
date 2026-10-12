import { supabase } from "../../config/supabase";
import { criarNotificacaoApp } from "../notificacoes/push.service";
import { hojeNoBrasil } from "./desligamentoContrato.policy";
import { diasParaVencimento } from "./vencimentoContrato.policy";
import { enviarEmailTransacional } from "../email/emailTransacional.service";

const escaparHtml = (valor: string) => valor.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export async function enviarEmailAviso(chave: string, email: string | undefined, empresaId: string, detalhe: string,
  assunto = "Contrato próximo do vencimento — Andrade Energy",
  orientacao = "Abra a área Contrato no aplicativo para conferir as condições e registrar sua decisão. A renovação exige uma nova proposta e um novo aceite.") {
  if (!email) return;
  const inicio = new Date().toISOString();
  const limite = new Date(Date.now() - 10 * 60_000).toISOString();
  const { data: aviso, error } = await supabase.from("notificacoes_app")
    .update({ email_envio_iniciado_em: inicio }).eq("chave_dedupe", chave)
    .is("email_enviado_em", null)
    .or(`email_envio_iniciado_em.is.null,email_envio_iniciado_em.lt.${limite}`)
    .select("id").maybeSingle();
  if (error) throw error;
  if (!aviso) return;
  const enviado = await enviarEmailTransacional({ empresaId, destinatario: email,
    assunto,
    html: `<p>${escaparHtml(detalhe)}</p><p>${escaparHtml(orientacao)}</p>`,
    idempotencyKey: chave });
  const { error: erroRegistro } = await supabase.from("notificacoes_app").update(enviado
    ? { email_enviado_em: new Date().toISOString(), email_envio_iniciado_em: null }
    : { email_envio_iniciado_em: null }).eq("id", aviso.id).eq("email_envio_iniciado_em", inicio);
  if (erroRegistro) throw erroRegistro;
}

let executando = false;
export async function avisarContratosProximosDoVencimento() {
  if (executando) return;
  executando = true;
  try {
    const hoje = hojeNoBrasil();
    const limite = new Date(`${hoje}T12:00:00Z`);
    limite.setUTCDate(limite.getUTCDate() + 30);
    for (let inicio = 0; ; inicio += 200) {
      const { data, error } = await supabase.from("contratos").select("*")
        .in("status", ["ATIVO", "VIGENTE"]).gte("vigencia_fim", hoje)
        .lte("vigencia_fim", limite.toISOString().slice(0, 10)).order("id").range(inicio, inicio + 199);
      if (error) throw error;
      for (const contrato of data ?? []) {
        const dias = diasParaVencimento(contrato, hoje);
        if (dias === null) continue;
        const { data: membros, error: erroMembros } = await supabase.from("empresa_usuarios")
          .select("usuario_id,papel,cliente_id,permissoes,usuarios!empresa_usuarios_usuario_id_fkey(email)").eq("empresa_id", contrato.empresa_id).eq("ativo", true);
        if (erroMembros) throw erroMembros;
        for (const membro of membros ?? []) {
          const consumidor = membro.papel === "LEITURA" && membro.cliente_id === contrato.cliente_id;
          const gerador = ["SUPERADMIN", "ADMIN_EMPRESA", "GESTOR"].includes(membro.papel)
            || (membro.papel === "COLABORADOR_GERADOR" && membro.permissoes?.contratos !== false);
          if (!consumidor && !gerador) continue;
          const chave = `vencimento-30:${contrato.id}:${contrato.vigencia_fim}:${membro.usuario_id}`;
          const detalhe = `O contrato ${contrato.numero ?? contrato.id} vence em ${dias} dia(s), em ${contrato.vigencia_fim}. `
            + (consumidor ? "Deseja renovar? Abra o contrato e informe sua escolha. A nova proposta exigirá seu aceite."
              : "Confira a decisão do cliente sobre renovação e prepare a retirada da UC do rateio/injeção para o vencimento, se não houver renovação aceita.");
          await criarNotificacaoApp({ usuario_id: membro.usuario_id, empresa_id: contrato.empresa_id,
            cliente_id: contrato.cliente_id, tipo: "CONTRATO_VENCIMENTO_30_DIAS",
            titulo: "Contrato próximo do vencimento",
            detalhe,
            rota: consumidor ? `/contrato?unidadeId=${contrato.unidade_consumidora_id}` : "/contratos",
            chave_dedupe: chave });
          const conta: any = Array.isArray(membro.usuarios) ? membro.usuarios[0] : membro.usuarios;
          await enviarEmailAviso(chave, conta?.email, contrato.empresa_id, detalhe)
            .catch(erro => console.error("Falha ao enviar e-mail de vencimento:", erro.message));
        }
      }
      if ((data?.length ?? 0) < 200) break;
    }
  } finally { executando = false; }
}
