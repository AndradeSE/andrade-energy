import { Request, Response } from "express";

import {
  alterarMinhaSenha,
  atualizarMeuPerfil,
  autenticar,
  cadastrarConta,
  cadastrarConsumidorComFatura,
  excluirMinhaConta,
  obterMeuPerfil,
  reenviarVerificacaoDeCadastro,
  redefinirSenha,
  solicitarRecuperacaoSenha,
  iniciarTesteGerador,
  verificarEmailDeCadastro,
} from "./auth.service";

export async function loginController(
  req: Request,
  res: Response
) {
  try {
    const { email, senha, tipo } = req.body;

    const resultado = await autenticar(
      email,
      senha,
      tipo
    );

    return res.json(resultado);

  } catch (err: any) {

    console.error("Falha no login", { tipo: err?.name ?? "Error" });

    const mensagensEsperadas = new Set([
      "E-mail ou senha inválidos.",
      "Confirme o e-mail enviado para concluir esta etapa do cadastro.",
      "Seu e-mail já foi confirmado. O cadastro agora aguarda a aprovação do gerador.",
      "Esta conta não possui um cadastro de consumidor ativo. Solicite um novo convite ao gerador.",
    ]);

    return res.status(401).json({
      message: mensagensEsperadas.has(err?.message) ? err.message : "Não foi possível entrar nesta conta. Tente novamente ou contate o suporte.",
    });

  }
}

export async function solicitarRecuperacaoSenhaController(req: Request, res: Response) {
  try { return res.json(await solicitarRecuperacaoSenha(req.body?.email, req.body?.tipo)); }
  catch (err: any) { return res.status(400).json({ message: err.message ?? "Não foi possível solicitar a recuperação." }); }
}

export async function redefinirSenhaController(req: Request, res: Response) {
  try { return res.json(await redefinirSenha(req.body?.token, req.body?.novaSenha ?? req.body?.nova_senha)); }
  catch (err: any) { return res.status(400).json({ message: err.message ?? "Não foi possível redefinir a senha." }); }
}

export async function cadastroController(req: Request, res: Response) {
  try {
    return res.status(201).json(await cadastrarConta(req.body));
  } catch (err: any) {
    return res.status(400).json({ message: err.message ?? "Não foi possível criar a conta." });
  }
}

export async function cadastroConsumidorController(req: Request, res: Response) {
  try {
    return res.status(201).json(await cadastrarConsumidorComFatura(req.body ?? {}, req.file));
  } catch (err: any) {
    return res.status(400).json({ message: err.message ?? "Não foi possível receber o cadastro." });
  }
}

export async function verificarEmailDeCadastroController(req: Request, res: Response) {
  try {
    return res.json(await verificarEmailDeCadastro(req.body?.token));
  } catch (err: any) {
    return res.status(400).json({ message: err.message ?? "Não foi possível confirmar este e-mail." });
  }
}

export async function reenviarVerificacaoDeCadastroController(req: Request, res: Response) {
  try {
    return res.json(await reenviarVerificacaoDeCadastro(req.body?.email));
  } catch (err: any) {
    return res.status(400).json({ message: err.message ?? "Não foi possível reenviar a confirmação." });
  }
}

export async function testeGeradorController(req: Request, res: Response) {
  try {
    return res.status(201).json(await iniciarTesteGerador(req.body));
  } catch (err: any) {
    return res.status(400).json({ message: err.message ?? "Não foi possível iniciar o teste gratuito." });
  }
}

function usuarioDaRequisicao(req: Request) {
  return (req as any).usuario;
}

export async function meuPerfilController(req: Request, res: Response) {
  try {
    return res.json(await obterMeuPerfil(usuarioDaRequisicao(req).id));
  } catch (err: any) {
    return res.status(400).json({ message: err.message ?? "Não foi possível carregar o perfil." });
  }
}

export async function atualizarMeuPerfilController(req: Request, res: Response) {
  try {
    return res.json(await atualizarMeuPerfil(usuarioDaRequisicao(req).id, req.body ?? {}));
  } catch (err: any) {
    return res.status(400).json({ message: err.message ?? "Não foi possível atualizar o perfil." });
  }
}

export async function alterarMinhaSenhaController(req: Request, res: Response) {
  try {
    return res.json(await alterarMinhaSenha(
      usuarioDaRequisicao(req).id,
      req.body?.senha_atual ?? req.body?.senhaAtual,
      req.body?.nova_senha ?? req.body?.novaSenha,
    ));
  } catch (err: any) {
    return res.status(400).json({ message: err.message ?? "Não foi possível alterar a senha." });
  }
}

export async function excluirMinhaContaController(req: Request, res: Response) {
  try {
    return res.json(await excluirMinhaConta(
      usuarioDaRequisicao(req).id,
      req.body?.senha_atual ?? req.body?.senhaAtual,
    ));
  } catch (err: any) {
    return res.status(400).json({ message: err.message ?? "Não foi possível excluir a conta." });
  }
}
