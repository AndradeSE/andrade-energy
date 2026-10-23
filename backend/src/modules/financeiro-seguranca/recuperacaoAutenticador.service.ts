import { createHash, createHmac, randomInt, randomUUID } from "node:crypto";
import { supabase } from "../../config/supabase";
import { conferirSenha } from "../../utils/password";
import { enviarEmailTransacional } from "../email/emailTransacional.service";

export function hashCodigoRecuperacao(id: string, usuarioId: string, codigo: string) {
  const chave = process.env.FINANCIAL_DATA_ENCRYPTION_KEY || process.env.OAUTH_TOKEN_ENCRYPTION_KEY;
  if (!chave) throw new Error("Recuperação temporariamente indisponível.");
  return createHmac("sha256", chave).update(`recuperacao-totp:${id}:${usuarioId}:${codigo}`).digest("hex");
}
function emailMascarado(email: string) {
  const [nome, dominio] = email.split("@");
  return `${nome.slice(0, 2)}***@${dominio}`;
}
async function validarSenha(usuario: any, senha: string) {
  if (!senha || !(await conferirSenha(senha, String(usuario.senha ?? "")))) throw new Error("Senha atual incorreta.");
}
export async function solicitarRecuperacaoAutenticador(usuario: any, senha: string) {
  await validarSenha(usuario, senha);
  const { data: atual, error: consulta } = await supabase.from("financeiro_autenticadores")
    .select("segredo_criptografado,confirmado,email_recuperacao").eq("usuario_id", usuario.id).maybeSingle();
  if (consulta) throw new Error("Não foi possível conferir o autenticador.");
  if (!atual?.confirmado) throw new Error("Não há autenticador ativo para recuperar. Inicie um novo cadastro.");
  const email = String(usuario.email ?? "");
  if (atual.email_recuperacao !== email) throw new Error("O e-mail vinculado ao autenticador não coincide com o perfil atual. Contate o suporte para validar sua identidade.");
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new Error("O e-mail da conta precisa ser conferido pelo suporte.");
  const id = randomUUID();
  const codigo = String(randomInt(0, 100_000_000)).padStart(8, "0");
  const { data, error } = await supabase.rpc("iniciar_recuperacao_financeira", {
    p_usuario: usuario.id, p_empresa: usuario.empresa_id, p_id: id, p_email: email,
    p_senha: createHash("sha256").update(usuario.senha).digest("hex"), p_segredo: createHash("sha256").update(atual.segredo_criptografado).digest("hex"),
    p_hash: hashCodigoRecuperacao(id, usuario.id, codigo),
  });
  if (error) throw new Error("Recuperação temporariamente indisponível.");
  if (data !== "OK") throw new Error(data === "AGUARDE" ? "Aguarde 60 segundos antes de solicitar outro código."
    : data === "LIMITE" ? "Limite de recuperação atingido. Aguarde 24 horas ou contate o suporte."
    : "Não foi possível iniciar a recuperação. Atualize a sessão e tente novamente.");
  const enviado = await enviarEmailTransacional({ destinatario: email, empresaId: usuario.empresa_id,
    assunto: "Recuperação do autenticador financeiro — Andrade Energy", idempotencyKey: `totp-recovery-${id}`,
    html: `<p>Foi solicitada a recuperação do seu autenticador financeiro.</p><p>Seu código é <strong>${codigo}</strong>. Ele expira em 10 minutos e permite até 5 tentativas.</p><p>Informe-o somente na tela de recuperação do aplicativo. Não compartilhe o código com terceiros ou com a assistente Solar.</p><p>O autenticador atual permanece ativo até a confirmação. Se não foi você, não confirme a solicitação e altere sua senha.</p>`,
  }).catch(() => false);
  if (!enviado) throw new Error("Não foi possível enviar o código. O autenticador atual foi preservado; tente novamente em 60 segundos.");
  return { solicitacaoId: id, emailMascarado: emailMascarado(email), validadeSegundos: 600 };
}
export async function confirmarRecuperacaoAutenticador(usuario: any, senha: string, id: string, codigo: string) {
  await validarSenha(usuario, senha);
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id) || !/^\d{8}$/.test(codigo)) throw new Error("Informe o código de 8 dígitos recebido por e-mail.");
  const { data, error } = await supabase.rpc("confirmar_recuperacao_financeira", {
    p_usuario: usuario.id, p_empresa: usuario.empresa_id, p_id: id,
    p_hash: hashCodigoRecuperacao(id, usuario.id, codigo),
  });
  if (error) throw new Error("Não foi possível confirmar a recuperação.");
  if (data !== "OK") throw new Error("Código inválido, expirado ou já utilizado. Após 5 erros, solicite um novo código.");
  const avisoEnviado = await enviarEmailTransacional({ destinatario: usuario.email, empresaId: usuario.empresa_id,
    assunto: "Autenticador financeiro redefinido — Andrade Energy", idempotencyKey: `totp-recovery-confirmed-${id}`,
    html: "<p>Seu autenticador financeiro foi redefinido após confirmação da senha e do código de e-mail.</p><p>Cadastre e confirme um novo autenticador no Financeiro. Operações que exigem o código permanecem bloqueadas até esse cadastro.</p><p>Se não foi você, altere sua senha e contate o suporte imediatamente.</p>",
  }).catch(() => false);
  return { ativo: false, novoCadastroObrigatorio: true, avisoEnviado };
}
