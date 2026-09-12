import dotenv from "dotenv";
import { supabase } from "../config/supabase";
import { EMPRESA_ANDRADE_ID } from "../config/empresa";
import { criarConviteGerador } from "../modules/convites/convites.service";
import { cadastrarConta } from "../modules/auth/auth.service";

dotenv.config();

for (const chave of [
  "RESEND_API_KEY",
  "BREVO_API_KEY",
  "BREVO_REMETENTE_EMAIL",
  "MICROSOFT_CLIENT_ID",
  "MICROSOFT_TOKEN_CACHE_BASE64",
]) delete process.env[chave];

async function main() {
const sufixo = Date.now().toString().slice(-8);
const email = `homologacao.${sufixo}@example.invalid`;
const cpf = `9${sufixo}00`.slice(0, 11);
let usuarioId = "";
let empresaId = "";
let conviteId = "";

try {
  const [{ data: admin, error: adminError }, { data: plano, error: planoError }] = await Promise.all([
    supabase.from("usuarios").select("id,perfil,empresa_id").eq("perfil", "ADMIN").eq("empresa_id", EMPRESA_ANDRADE_ID).eq("ativo", true).limit(1).single(),
    supabase.from("planos_geradores").select("id,nome").eq("ativo", true).order("valor_mensal").limit(1).single(),
  ]);
  if (adminError || !admin) throw adminError ?? new Error("Administrador de homologação não encontrado.");
  if (planoError || !plano) throw planoError ?? new Error("Plano ativo não encontrado.");

  const convite = await criarConviteGerador({ nome: `Homologação ${sufixo}`, cpf, email, planoId: plano.id, ciclo: "MENSAL", diasTeste: 45 }, admin);
  if (!convite.token) throw new Error("A homologação não recebeu o token do convite.");

  const { data: conviteCriado } = await supabase.from("convites_clientes").select("id").eq("email", email).order("created_at", { ascending: false }).limit(1).single();
  conviteId = conviteCriado?.id ?? "";
  const cadastro = await cadastrarConta({ nome: "ignorado", cpf, email, senha: `Teste-${sufixo}!`, tipo: "GERADOR", convite: convite.token });

  const { data: usuario, error: usuarioError } = await supabase.from("usuarios").select("id,empresa_id,perfil").eq("email", email).eq("perfil", "GESTOR").single();
  if (usuarioError || !usuario) throw usuarioError ?? new Error("Conta geradora não criada.");
  usuarioId = usuario.id;
  empresaId = usuario.empresa_id;
  if (empresaId === EMPRESA_ANDRADE_ID) throw new Error("A conta herdou indevidamente a empresa administradora.");

  const [{ count: usinas }, { data: assinatura }] = await Promise.all([
    supabase.from("usinas").select("id", { count: "exact", head: true }).eq("empresa_id", empresaId),
    supabase.from("assinaturas_geradores").select("id,status,plano_id,ciclo,fim_teste_em").eq("gerador_id", usuarioId).single(),
  ]);
  if ((usinas ?? 0) !== 0) throw new Error("A nova operação não iniciou vazia.");
  if (!assinatura || assinatura.plano_id !== plano.id || assinatura.status !== "TESTE" || assinatura.ciclo !== "MENSAL" || !assinatura.fim_teste_em) {
    throw new Error("A assinatura do convite não foi criada corretamente.");
  }

  console.log(JSON.stringify({ sucesso: true, operacaoIsolada: true, usinas: 0, plano: plano.nome, assinatura: assinatura.status, ciclo: assinatura.ciclo, cadastro: cadastro.message }, null, 2));
} finally {
  if (usuarioId) {
    await supabase.from("cobrancas_assinaturas_geradores").delete().in("assinatura_id", (await supabase.from("assinaturas_geradores").select("id").eq("gerador_id", usuarioId)).data?.map((item) => item.id) ?? []);
    await supabase.from("assinaturas_geradores").delete().eq("gerador_id", usuarioId);
    await supabase.from("sessoes_usuarios").delete().eq("usuario_id", usuarioId);
    await supabase.from("empresa_usuarios").delete().eq("usuario_id", usuarioId);
    await supabase.from("usuarios").delete().eq("id", usuarioId);
  }
  if (conviteId) await supabase.from("convites_clientes").delete().eq("id", conviteId);
  if (empresaId && empresaId !== EMPRESA_ANDRADE_ID) await supabase.from("empresas").delete().eq("id", empresaId);
}
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
