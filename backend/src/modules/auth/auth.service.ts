import {
  buscarUsuario,
  criarConta,
  listarUsuarios,
  login,
  vincularClientePorCpf,
} from "./auth.repository";
import { enviarEmailTransacional } from "../email/emailTransacional.service";

export async function autenticar(
  email: string,
  senha: string
) {
  const usuario = await login(email, senha);

  if (!usuario) {
    throw new Error("E-mail ou senha inválidos.");
  }

  const clienteId = await vincularClientePorCpf(usuario);

  return {
    token: "MVP_TOKEN",
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      cpf: usuario.cpf ?? null,
      perfil: usuario.perfil,
      cliente_id: clienteId ?? usuario.cliente_id,
      usina_id: usuario.usina_id,
    },
  };
}

export async function cadastrarConta(input: { nome: string; cpf: string; email: string; senha: string; tipo: "CONSUMIDOR" | "GERADOR" }) {
  if (!input.nome?.trim()) throw new Error("Informe seu nome.");
  if (String(input.cpf ?? "").replace(/\D/g, "").length !== 11) throw new Error("Informe um CPF válido.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email?.trim() ?? "")) throw new Error("Informe um e-mail válido.");
  if ((input.senha?.length ?? 0) < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");
  if (!(["CONSUMIDOR", "GERADOR"] as const).includes(input.tipo)) throw new Error("Escolha consumidor ou gerador.");
  const usuario = await criarConta(input);
  await vincularClientePorCpf(usuario);
  let emailEnviado = false;
  try {
    emailEnviado = await enviarEmailTransacional({
      destinatario: input.email.trim().toLowerCase(),
      assunto: "Confirmação de cadastro — Andrade Energy",
      html: `<div style="font-family:Arial,sans-serif;color:#252925;line-height:1.6"><h2 style="color:#39804a">Sua conta foi criada</h2><p>Olá, <strong>${input.nome.trim()}</strong>.</p><p>Seu cadastro na Andrade Energy foi concluído e o acesso já está disponível.</p><p>Use seu e-mail e a senha cadastrada para entrar no aplicativo.</p><p style="color:#6b706b;font-size:13px">Se você não realizou este cadastro, entre em contato com a Andrade Energy.</p></div>`,
    });
  } catch {
    emailEnviado = false;
  }
  return { message: "Conta criada com sucesso.", emailEnviado };
}

export {
  buscarUsuario,
  listarUsuarios
};

