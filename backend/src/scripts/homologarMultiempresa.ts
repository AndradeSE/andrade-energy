import { supabase } from "../config/supabase";
import { EMPRESA_ANDRADE_ID } from "../config/empresa";
import { gerarToken, hashToken } from "../utils/token";

const SLUG = "homologacao-multiempresa";

async function executar() {
  const { data: empresa, error: empresaError } = await supabase.from("empresas").upsert({
    slug: SLUG,
    nome: "Homologação Multiempresa",
    razao_social: "Ambiente interno de homologação",
    cor_primaria: "#155EEF",
    cor_secundaria: "#F79009",
    empresa_proprietaria: false,
    identidade_personalizada: true,
    nome_remetente: "Homologação Multiempresa",
    dominio_email_verificado: false,
    ativo: true,
    atualizado_em: new Date().toISOString(),
  }, { onConflict: "slug" }).select("id,nome,slug").single();
  if (empresaError) throw empresaError;

  const { data: administradores, error: adminsError } = await supabase.from("usuarios")
    .select("id").eq("empresa_id", EMPRESA_ANDRADE_ID).eq("perfil", "ADMIN").eq("ativo", true);
  if (adminsError) throw adminsError;
  if (!administradores?.length) throw new Error("Nenhum administrador Andrade ativo foi encontrado.");

  const { error: vinculoError } = await supabase.from("empresa_usuarios").upsert(
    administradores.map((admin) => ({ empresa_id: empresa.id, usuario_id: admin.id, papel: "ADMIN_EMPRESA", principal: false, ativo: true, atualizado_em: new Date().toISOString() })),
    { onConflict: "empresa_id,usuario_id" },
  );
  if (vinculoError) throw vinculoError;

  const tabelas = ["clientes", "usinas", "unidades_consumidoras", "faturas", "contratos", "gerador_carteiras"];
  const contagens: Record<string, { andrade: number; homologacao: number }> = {};
  for (const tabela of tabelas) {
    const [andrade, homologacao] = await Promise.all([
      supabase.from(tabela).select("id", { count: "exact", head: true }).eq("empresa_id", EMPRESA_ANDRADE_ID),
      supabase.from(tabela).select("id", { count: "exact", head: true }).eq("empresa_id", empresa.id),
    ]);
    if (andrade.error) throw andrade.error;
    if (homologacao.error) throw homologacao.error;
    contagens[tabela] = { andrade: andrade.count ?? 0, homologacao: homologacao.count ?? 0 };
  }

  const token = gerarToken();
  const tokenHash = hashToken(token);
  const { data: sessao, error: sessaoError } = await supabase.from("sessoes_usuarios").insert({
    usuario_id: administradores[0].id,
    token_hash: tokenHash,
    empresa_ativa_id: empresa.id,
    expira_em: new Date(Date.now() + 10 * 60_000).toISOString(),
  }).select("id").single();
  if (sessaoError) throw sessaoError;

  let apiValidada = false;
  let rotasPrivadasValidadas = false;
  try {
    const cabecalhos = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const base = "https://andrade-energy-api-vda.onrender.com/api";
    const [identidadeResposta, clientesResposta, usinasResposta] = await Promise.all([
      fetch(`${base}/empresas/atual`, { headers: cabecalhos }),
      fetch(`${base}/clientes`, { headers: cabecalhos }),
      fetch(`${base}/usinas`, { headers: cabecalhos }),
    ]);
    if (![identidadeResposta, clientesResposta, usinasResposta].every((resposta) => resposta.ok)) {
      throw new Error(`A API recusou a sessão de homologação (${identidadeResposta.status}/${clientesResposta.status}/${usinasResposta.status}).`);
    }
    const identidade = await identidadeResposta.json() as any;
    const clientes = await clientesResposta.json() as any[];
    const usinas = await usinasResposta.json() as any[];
    if (identidade.id !== empresa.id || !Array.isArray(clientes) || clientes.length !== 0 || !Array.isArray(usinas) || usinas.length !== 0) {
      throw new Error(`Falha de isolamento detectada na API pública: identidade=${identidade.id}, clientes=${Array.isArray(clientes) ? clientes.length : "formato-invalido"}, usinas=${Array.isArray(usinas) ? usinas.length : "formato-invalido"}.`);
    }

    const troca = await fetch(`${base}/empresas/${EMPRESA_ANDRADE_ID}/selecionar`, { method: "POST", headers: cabecalhos });
    if (!troca.ok) throw new Error(`A API não permitiu retornar ao ambiente Andrade (${troca.status}).`);
    const identidadeAndradeResposta = await fetch(`${base}/empresas/atual`, { headers: cabecalhos });
    const identidadeAndrade = await identidadeAndradeResposta.json() as any;
    if (!identidadeAndradeResposta.ok || identidadeAndrade.id !== EMPRESA_ANDRADE_ID) {
      throw new Error("A troca de ambiente não persistiu na sessão.");
    }

    const rotasSemSessao = await Promise.all([
      fetch(`${base}/clientes`),
      fetch(`${base}/usinas`),
      fetch(`${base}/faturas`),
      fetch(`${base}/faturas/analisar`, { method: "POST" }),
      fetch(`${base}/faturas/importar`, { method: "POST" }),
      fetch(`${base}/faturas/00000000-0000-0000-0000-000000000000`, { method: "DELETE" }),
    ]);
    if (rotasSemSessao.some((resposta) => resposta.status !== 401)) {
      throw new Error(`Rota operacional acessível sem sessão: ${rotasSemSessao.map((resposta) => resposta.status).join("/")}.`);
    }
    rotasPrivadasValidadas = true;
    apiValidada = true;
  } finally {
    await supabase.from("sessoes_usuarios").update({ revogada_em: new Date().toISOString() }).eq("id", sessao.id);
  }

  console.log(JSON.stringify({
    resultado: "APROVADO",
    empresa,
    administradoresVinculados: administradores.length,
    apiPublicaESessao: apiValidada ? "APROVADAS" : "REPROVADAS",
    rotasOperacionaisSemSessao: rotasPrivadasValidadas ? "BLOQUEADAS" : "REPROVADAS",
    isolamento: contagens,
    observacao: "Nenhum cliente, usina, UC, fatura, contrato ou carteira foi criado no ambiente de homologação.",
  }, null, 2));
}

executar().catch((erro) => {
  console.error(erro?.message ?? erro);
  process.exit(1);
});
