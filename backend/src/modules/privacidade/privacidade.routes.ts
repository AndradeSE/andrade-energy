import { Router } from "express";
import { supabase } from "../../config/supabase";
import { exigirAutenticacao } from "../../middlewares/auth.middleware";
import { criarNotificacaoApp } from "../notificacoes/push.service";

const router = Router();
async function documentoPublico(tipo: "POLITICA_PRIVACIDADE" | "TERMOS_USO", res: import("express").Response) {
  const { data, error } = await supabase.from("documentos_comerciais")
    .select("titulo,versao,conteudo,publicado_em")
    .eq("tipo", tipo).eq("ativo", true)
    .not("publicado_em", "is", null)
    .order("publicado_em", { ascending: false }).limit(1).maybeSingle();
  if (error || !data) return res.status(503).json({ message: "Documento indisponível no momento." });
  return res.json(data);
}
router.get("/politica", async (_req, res) => documentoPublico("POLITICA_PRIVACIDADE", res));
router.get("/termos", async (_req, res) => documentoPublico("TERMOS_USO", res));
router.use(exigirAutenticacao);

const TIPOS = new Set(["CONFIRMACAO", "ACESSO", "CORRECAO", "ANONIMIZACAO_BLOQUEIO", "PORTABILIDADE", "ELIMINACAO", "OPOSICAO", "COMPARTILHAMENTO", "REVOGACAO_CONSENTIMENTO", "INFORMACAO"]);

router.post("/solicitacoes", async (req, res) => {
  const usuario = (req as any).usuario;
  const empresaId = String(usuario?.empresa_id ?? "");
  const tipo = String(req.body?.tipo ?? "").toUpperCase();
  if (!empresaId || !usuario?.id) return res.status(403).json({ message: "Conta sem empresa ativa." });
  if (!TIPOS.has(tipo)) return res.status(400).json({ message: "Selecione um direito de privacidade válido." });

  // Não recebemos documentos, CPF ou justificativas livres aqui. A identidade
  // é a sessão autenticada; detalhes adicionais são tratados em canal seguro.
  const { data, error } = await supabase.from("auditoria_seguranca")
    .insert({ empresa_id: empresaId, usuario_id: usuario.id, acao: "SOLICITACAO_PRIVACIDADE", recurso: "privacidade", detalhes: { tipo, status: "RECEBIDA" } })
    .select("id,criado_em").single();
  if (error) return res.status(500).json({ message: "Não foi possível registrar a solicitação. Tente novamente." });

  const { data: administradores } = await supabase.from("empresa_usuarios")
    .select("usuario_id,papel")
    .eq("empresa_id", empresaId).eq("ativo", true)
    .in("papel", ["ADMIN_EMPRESA", "GESTOR"]);
  await Promise.all((administradores ?? []).map((membro) => criarNotificacaoApp({
    usuario_id: membro.usuario_id,
    empresa_id: empresaId,
    tipo: "SOLICITACAO_PRIVACIDADE",
    titulo: "Novo pedido de privacidade",
    detalhe: `Pedido ${tipo.toLowerCase()} recebido. Protocolo ${data.id}.`,
    rota: "/perfil",
    chave_dedupe: `privacidade:${data.id}:${membro.usuario_id}`,
  }).catch(() => undefined)));
  return res.status(201).json({ protocolo: data.id, criado_em: data.criado_em, status: "RECEBIDA" });
});

router.get("/solicitacoes/minhas", async (req, res) => {
  const usuario = (req as any).usuario;
  const { data, error } = await supabase.from("auditoria_seguranca")
    .select("id,detalhes,criado_em")
    .eq("usuario_id", usuario.id).eq("acao", "SOLICITACAO_PRIVACIDADE")
    .order("criado_em", { ascending: false }).limit(50);
  if (error) return res.status(500).json({ message: "Não foi possível carregar as solicitações." });
  return res.json(data ?? []);
});

router.get("/solicitacoes", async (req, res) => {
  const usuario = (req as any).usuario;
  if (!["ADMIN", "GESTOR"].includes(String(usuario?.perfil ?? "")) || String(usuario?.papel_empresa ?? "").startsWith("COLABORADOR_")) {
    return res.status(403).json({ message: "Acesso restrito ao responsável pela empresa." });
  }
  const { data, error } = await supabase.from("auditoria_seguranca")
    .select("id,usuario_id,detalhes,criado_em,usuarios!auditoria_seguranca_usuario_id_fkey(nome,email)")
    .eq("empresa_id", usuario.empresa_id).eq("acao", "SOLICITACAO_PRIVACIDADE")
    .order("criado_em", { ascending: false }).limit(100);
  if (error) return res.status(500).json({ message: "Não foi possível carregar os pedidos." });
  return res.json(data ?? []);
});

export default router;
