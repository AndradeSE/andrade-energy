import { supabase } from "../../config/supabase";
import {atualizarInadimplenciaAutomaticamente} from './inadimplenciaUc.service';
import { hojeNoBrasil } from "../contratos/desligamentoContrato.policy";
import { enviarEmailAviso } from "../contratos/vencimentoContrato.service";
import { criarNotificacaoApp } from "../notificacoes/push.service";
import { avisoCobrancaVencida, diasParaLembreteFatura } from "./lembreteVencimento.policy";

let executando = false;
export async function avisarFaturasProximasDoVencimento() {
  await atualizarInadimplenciaAutomaticamente();
  if (executando) return;
  executando = true;
  try {
    const hoje = hojeNoBrasil();
    const limite = new Date(`${hoje}T12:00:00Z`);
    limite.setUTCDate(limite.getUTCDate() + 5);
    for (let inicio = 0; ; inicio += 200) {
      const { data, error } = await supabase.from("faturas").select("id,empresa_id,cliente_id,numero_instalacao,referencia,vencimento,valor_total,valor_total_unificado,status,cobrancas(status,pago_em)")
        .in("status", ["ABERTA", "VENCIDA"]).lte("vencimento", limite.toISOString().slice(0, 10))
        .order("id").range(inicio, inicio + 199);
      if (error) throw error;
      for (const fatura of data ?? []) {
        const dias = diasParaLembreteFatura(fatura, hoje);
        const vencida = avisoCobrancaVencida(fatura, hoje);
        if (dias === null && !vencida) continue;
        const { data: acessos, error: erroAcessos } = await supabase.from("empresa_usuarios")
          .select("usuario_id,usuarios!empresa_usuarios_usuario_id_fkey(email)")
          .eq("empresa_id", fatura.empresa_id).eq("cliente_id", fatura.cliente_id).eq("papel", "LEITURA").eq("ativo", true);
        if (erroAcessos) throw erroAcessos;
        for (const acesso of acessos ?? []) {
          const chave = vencida ? `fatura-atraso:${fatura.id}:${fatura.vencimento}:${vencida.etapa}:${acesso.usuario_id}` : `fatura-vencimento:${fatura.id}:${fatura.vencimento}:${acesso.usuario_id}`;
          const dataBr = String(fatura.vencimento).slice(0, 10).split("-").reverse().join("/");
          const valor = Number(fatura.valor_total_unificado ?? fatura.valor_total);
          const valorTexto = Number.isFinite(valor) ? `, no valor de ${valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : "";
          const detalhe = vencida
            ? `Prezado(a) cliente, identificamos a fatura ${fatura.referencia ?? ""}${fatura.numero_instalacao ? ` da UC ${fatura.numero_instalacao}` : ""}${valorTexto}, com vencimento em ${dataBr}, em aberto há ${vencida.dias} dia(s) nos registros do sistema. Solicitamos a regularização pelos meios de pagamento disponíveis no aplicativo. Caso o pagamento já tenha sido efetuado, desconsidere este aviso. Se a baixa ainda não constar, entre em contato com o responsável pelo atendimento para conferência.`
            : `Sua fatura ${fatura.referencia ?? ""} vence ${dias === 0 ? "hoje" : `em ${dias} dia(s)`}, em ${dataBr}. Caso o pagamento já tenha sido efetuado, desconsidere este aviso e confira a confirmação no aplicativo.`;
          await criarNotificacaoApp({ usuario_id: acesso.usuario_id, empresa_id: fatura.empresa_id,
            cliente_id: fatura.cliente_id, tipo: vencida ? "FATURA_VENCIDA" : "FATURA_PROXIMA_VENCIMENTO", titulo: vencida ? "Aviso de cobrança — fatura vencida" : "Fatura próxima do vencimento",
            detalhe, rota: `/faturas/${fatura.id}`, chave_dedupe: chave });
          const conta: any = Array.isArray(acesso.usuarios) ? acesso.usuarios[0] : acesso.usuarios;
          await enviarEmailAviso(chave, conta?.email, fatura.empresa_id, detalhe,
            vencida ? "Aviso de cobrança de fatura vencida — Andrade Energy" : "Lembrete de vencimento da fatura — Andrade Energy", "Abra Faturas no aplicativo para conferir o documento e as formas de pagamento.")
            .catch(erro => console.error("Falha ao enviar e-mail de lembrete da fatura:", erro.message));
        }
      }
      if ((data?.length ?? 0) < 200) break;
    }
  } finally { executando = false; }
}
