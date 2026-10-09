import { createHash } from "node:crypto";
import { supabase } from "../../config/supabase";
import { obterTokenLeituraGmail } from "./conexoesEmail.service";
import { anexosPdfGmail, consultarGmail, listarMensagensFaturaGmail, ParteGmail } from "./gmailLeitura.client";

let executando = false;

type DependenciasGmail = {
  db: typeof supabase;
  obterToken: typeof obterTokenLeituraGmail;
  listar: typeof listarMensagensFaturaGmail;
  consultar: typeof consultarGmail;
};

export async function enfileirarFaturasGmail(deps: DependenciasGmail = {
  db: supabase, obterToken: obterTokenLeituraGmail, listar: listarMensagensFaturaGmail, consultar: consultarGmail,
}) {
  if (executando) return;
  executando = true;
  try {
    const { data: conexoes, error } = await deps.db.from("conexoes_email")
      .select("id,empresa_id,email_conectado,unidade_consumidora_id,conectado_em")
      .eq("provedor", "GMAIL").eq("status", "LEITURA_AUTORIZADA");
    if (error) throw error;
    const caixasConsultadas = new Set<string>();
    for (const conexao of conexoes ?? []) {
      let etapa = "CONFIGURACAO_UC";
      try {
        const { data: unidade, error: erroUc } = await deps.db.from("unidades_consumidoras")
          .select("id,cliente_id,tipo,status,recebimento_email_ativo,usinas(titularidade_ucs_recebedoras)")
          .eq("id", conexao.unidade_consumidora_id).eq("empresa_id", conexao.empresa_id).maybeSingle();
        if (erroUc) throw erroUc;
        if (!unidade || unidade.status !== "ATIVA" || !unidade.recebimento_email_ativo) continue;
        const usina: any = Array.isArray(unidade.usinas) ? unidade.usinas[0] : unidade.usinas;
        const escopo = unidade.tipo === "GERADORA" ? unidade.id
          : usina?.titularidade_ucs_recebedoras === "CLIENTE" ? unidade.cliente_id : "GERADOR";
        const caixa = `${conexao.empresa_id}:${conexao.email_conectado}:${escopo}`;
        if (caixasConsultadas.has(caixa)) continue;
        etapa = "AUTORIZACAO";
        const token = await deps.obterToken(conexao.id, conexao.empresa_id);
        // Recupera contas recentes que chegaram antes da correção, sem ler toda a caixa.
        const desde = new Date(Date.now() - 30 * 24 * 60 * 60_000);
        etapa = "CONSULTAR_MENSAGENS";
        for (const mensagem of await deps.listar(token, desde)) {
          const dados = await deps.consultar<{ payload?: ParteGmail & { headers?: Array<{ name: string; value: string }> }; internalDate?: string }>(token,
            `messages/${encodeURIComponent(mensagem.id)}?format=full`);
          const headers = dados.payload?.headers ?? [];
          const remetente = headers.find(h => h.name.toLowerCase() === "from")?.value ?? "";
          if (!/(?:^|<)fatura@cemig\.com\.br(?:>|$)/i.test(remetente.trim())) continue;
          for (const parte of anexosPdfGmail(dados.payload)) {
            const chave = createHash("sha256").update(`${caixa}:${mensagem.id}:${parte.partId ?? parte.body?.attachmentId}`).digest("hex");
            etapa = "ENFILEIRAR_PDF";
            const { error: erroFila } = await deps.db.from("recebimentos_faturas_email").upsert({
              empresa_id: conexao.empresa_id, provedor: "GMAIL", provedor_email_id: chave,
              unidade_consumidora_id: unidade.id, destinatario: conexao.email_conectado,
              remetente, assunto: headers.find(h => h.name.toLowerCase() === "subject")?.value ?? "Fatura CEMIG",
              arquivo_nome: parte.filename || "fatura.pdf", status: "PENDENTE",
              payload: { gmail: { conexaoId: conexao.id, unidadeOrigemId: unidade.id, mensagemId: mensagem.id,
                anexoId: parte.body?.attachmentId ?? "", parteId: parte.partId ?? "" } },
            }, { onConflict: "provedor,provedor_email_id", ignoreDuplicates: true });
            if (erroFila) throw erroFila;
          }
        }
        caixasConsultadas.add(caixa);
        const { error: erroAtualizar } = await deps.db.from("conexoes_email")
          .update({ regra_status: "ATIVA", regra_erro: null, ultima_validacao_em: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("empresa_id", conexao.empresa_id).eq("email_conectado", conexao.email_conectado)
          .eq("provedor", "GMAIL").eq("status", "LEITURA_AUTORIZADA");
        if (erroAtualizar) throw erroAtualizar;
      } catch (erro: any) {
        const codigo = String(erro?.codigoGmail ?? erro?.code ?? "INDEFINIDO");
        console.warn("Falha na leitura Gmail", { etapa, codigo: /^[A-Z0-9_]{1,60}$/.test(codigo) ? codigo : "INDEFINIDO" });
        // Sem tokens ou conteúdo do e-mail nos logs.
        const { error: erroAtualizar } = await deps.db.from("conexoes_email").update({
          regra_status: "ERRO",
          regra_erro: codigo === "GMAIL_LEITURA_NAO_AUTORIZADA"
            ? "O Gmail foi conectado sem permissão para ler as faturas. Conecte a conta novamente e autorize a leitura dos e-mails."
            : codigo === "OAUTH_REAUTORIZACAO"
            ? "A autorização do Gmail expirou ou foi revogada. Conecte a conta novamente para retomar a importação."
            : codigo === "GMAIL_API_DESATIVADA"
              ? "A API Gmail precisa ser ativada na integração Google da Andrade Energy."
              : "A consulta automática ao Gmail falhou. Confira a conexão e, se necessário, conecte a conta novamente.",
          updated_at: new Date().toISOString(),
        }).eq("id", conexao.id);
        if (erroAtualizar) throw erroAtualizar;
      }
    }
  } finally { executando = false; }
}
