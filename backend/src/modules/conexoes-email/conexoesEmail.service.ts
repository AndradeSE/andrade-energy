import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

import { supabase } from "../../config/supabase";
import { empresaIdDoUsuario } from "../../config/empresa";

const DURACAO_ESTADO_MS = 15 * 60 * 1000;

export type ProvedorEmail = "OUTLOOK" | "GMAIL";
export type AppOrigem = "CONSUMIDOR" | "GERADOR";

type UsuarioAutenticado = {
  id?: string;
  perfil?: string;
  cpf?: string | null;
  cliente_id?: string | null;
};

type ConfiguracaoOAuth = {
  provedor: ProvedorEmail;
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
};

type TokensOAuth = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
};

function valorAmbiente(chave: string) {
  return String(process.env[chave] ?? "").trim();
}

function normalizarProvedor(valor: unknown): ProvedorEmail {
  const provedor = String(valor ?? "").trim().toUpperCase();
  if (provedor === "OUTLOOK" || provedor === "GMAIL") return provedor;
  throw new Error("Escolha Outlook ou Gmail.");
}

function normalizarApp(valor: unknown): AppOrigem {
  const app = String(valor ?? "").trim().toUpperCase();
  if (app === "CONSUMIDOR" || app === "GERADOR") return app;
  throw new Error("Aplicativo de origem inválido.");
}

function cpfLimpo(valor?: string | null) {
  return String(valor ?? "").replace(/\D/g, "");
}

function dominioRecebimento() {
  return valorAmbiente("INBOUND_EMAIL_DOMAIN").toLowerCase();
}

function enderecoRecebimento(unidade: any) {
  const dominio = dominioRecebimento();
  if (!dominio || !unidade?.recebimento_email_ativo || !unidade?.recebimento_email_token) return null;
  return `fatura-${unidade.recebimento_email_token}@${dominio}`;
}

function urlPublicaBackend() {
  const base = valorAmbiente("OAUTH_PUBLIC_BASE_URL") || valorAmbiente("RENDER_EXTERNAL_URL");
  if (!base) {
    throw new Error("Defina OAUTH_PUBLIC_BASE_URL com a URL HTTPS pública do backend antes de conectar um e-mail.");
  }

  let url: URL;
  try {
    url = new URL(base);
  } catch {
    throw new Error("OAUTH_PUBLIC_BASE_URL não é uma URL válida.");
  }

  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("OAUTH_PUBLIC_BASE_URL deve usar HTTPS fora do ambiente local.");
  }

  return url.toString().replace(/\/$/, "");
}

function callbackOAuth(provedor: ProvedorEmail) {
  return `${urlPublicaBackend()}/api/oauth/email/callback/${provedor.toLowerCase()}`;
}

function configuracaoOAuth(provedor: ProvedorEmail): ConfiguracaoOAuth {
  if (provedor === "GMAIL") {
    const clientId = valorAmbiente("GOOGLE_OAUTH_CLIENT_ID");
    const clientSecret = valorAmbiente("GOOGLE_OAUTH_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      throw new Error("A conexão com Gmail ainda não foi configurada pela Andrade Energy.");
    }

    return {
      provedor,
      clientId,
      clientSecret,
      authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/gmail.readonly",
      ],
    };
  }

  const clientId = valorAmbiente("MICROSOFT_OAUTH_CLIENT_ID") || valorAmbiente("MICROSOFT_CLIENT_ID");
  const clientSecret = valorAmbiente("MICROSOFT_OAUTH_CLIENT_SECRET") || valorAmbiente("MICROSOFT_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("A conexão com Outlook ainda não foi configurada pela Andrade Energy.");
  }

  return {
    provedor,
    clientId,
    clientSecret,
    authorizationUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: [
      "offline_access",
      "User.Read",
      "Mail.Read",
      "MailboxSettings.ReadWrite",
    ],
  };
}

function chaveCifra() {
  const configurada = valorAmbiente("OAUTH_TOKEN_ENCRYPTION_KEY").replace(/\s/g, "");
  if (!configurada) {
    throw new Error("O armazenamento seguro de e-mail ainda não foi configurado.");
  }

  const chave = /^[a-f\d]{64}$/i.test(configurada)
    ? Buffer.from(configurada, "hex")
    : Buffer.from(configurada, "base64url");

  if (chave.length !== 32) {
    throw new Error("OAUTH_TOKEN_ENCRYPTION_KEY deve ter exatamente 32 bytes em Base64 ou hexadecimal.");
  }
  return chave;
}

/** Criptografa segredos persistidos com AES-256-GCM. Nunca registre o retorno em logs. */
export function criptografarSegredoOAuth(valor: string) {
  const iv = randomBytes(12);
  const cifra = createCipheriv("aes-256-gcm", chaveCifra(), iv);
  const conteudo = Buffer.concat([cifra.update(valor, "utf8"), cifra.final()]);
  const tag = cifra.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), conteudo.toString("base64url")].join(".");
}

function descriptografarSegredoOAuth(valor: string) {
  const [versao, ivBase64, tagBase64, conteudoBase64] = String(valor ?? "").split(".");
  if (versao !== "v1" || !ivBase64 || !tagBase64 || !conteudoBase64) {
    throw new Error("O token armazenado tem um formato inválido.");
  }

  const decifra = createDecipheriv("aes-256-gcm", chaveCifra(), Buffer.from(ivBase64, "base64url"));
  decifra.setAuthTag(Buffer.from(tagBase64, "base64url"));
  return Buffer.concat([
    decifra.update(Buffer.from(conteudoBase64, "base64url")),
    decifra.final(),
  ]).toString("utf8");
}

function hashState(state: string) {
  return createHash("sha256").update(state).digest("hex");
}

function gerarPkce() {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

function clienteDaUnidade(unidade: any) {
  return Array.isArray(unidade?.clientes) ? unidade.clientes[0] : unidade?.clientes;
}

function usinaDaUnidade(unidade: any) {
  return Array.isArray(unidade?.usinas) ? unidade.usinas[0] : unidade?.usinas;
}

function usuarioPodeAcessarUnidade(unidade: any, usuario: UsuarioAutenticado) {
  const perfil = String(usuario?.perfil ?? "").toUpperCase();
  const titularidade = String(usinaDaUnidade(unidade)?.titularidade_ucs_recebedoras ?? "GERADOR").toUpperCase();
  if (perfil === "ADMIN") return true;
  if (perfil === "GESTOR") return titularidade === "GERADOR";
  if (perfil !== "LEITURA") return false;
  if (titularidade !== "CLIENTE") return false;
  if (usuario?.cliente_id && usuario.cliente_id === unidade?.cliente_id) return true;

  const cpfUsuario = cpfLimpo(usuario?.cpf);
  const cpfCliente = cpfLimpo(clienteDaUnidade(unidade)?.cpf);
  return cpfUsuario.length >= 9 && cpfCliente.length >= 9 && cpfUsuario.slice(0, 9) === cpfCliente.slice(0, 9);
}

async function buscarUnidadeAutorizada(unidadeId: string, usuario: UsuarioAutenticado) {
  const { data, error } = await supabase
    .from("unidades_consumidoras")
    .select("id, numero, cliente_id, usina_id, status, recebimento_email_token, recebimento_email_ativo, clientes(id, cpf), usinas(id, titularidade_ucs_recebedoras)")
    .eq("id", unidadeId)
    .eq("empresa_id", empresaIdDoUsuario(usuario))
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Unidade consumidora não encontrada.");
  if (!usuarioPodeAcessarUnidade(data, usuario)) {
    throw new Error("Você não tem acesso a esta unidade consumidora.");
  }
  return data;
}

async function buscarUnidadeInterna(unidadeId: string, empresaId: string) {
  const { data, error } = await supabase
    .from("unidades_consumidoras")
    .select("id, numero, cliente_id, status, recebimento_email_token, recebimento_email_ativo, clientes(id, cpf)")
    .eq("id", unidadeId)
    .eq("empresa_id", empresaId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("A unidade consumidora desta autorização não existe mais.");
  return data;
}

function mensagemDaConexao(conexao: any, endereco: string | null) {
  if (conexao.status === "REGRA_ATIVA") {
    return `O Outlook encaminhará automaticamente as faturas da CEMIG com anexo para ${endereco ?? "o endereço da unidade"}.`;
  }
  if (conexao.status === "CONECTADO_SEM_REGRA") {
    return conexao.regra_erro || "O Outlook foi conectado, mas a regra automática ainda não está ativa.";
  }
  if (conexao.status === "LEITURA_AUTORIZADA") {
    return "O Gmail foi conectado com autorização somente de leitura. O encaminhamento automático não é criado em contas Gmail pessoais; a leitura programada será habilitada em uma próxima etapa.";
  }
  if (conexao.status === "REVOGADA") return "Esta conexão foi removida.";
  return conexao.regra_erro || "Não foi possível concluir a conexão do e-mail.";
}

function serializarConexao(conexao: any, unidade: any) {
  const endereco = enderecoRecebimento(unidade);
  return {
    id: conexao.id,
    provedor: conexao.provedor,
    email: conexao.email_conectado ?? null,
    status: conexao.status,
    erro: conexao.regra_erro ?? null,
    regra: {
      ativa: conexao.regra_status === "ATIVA",
      status: conexao.regra_status,
      erro: conexao.regra_erro ?? null,
    },
    automatico: conexao.status === "REGRA_ATIVA" && conexao.regra_status === "ATIVA",
    mensagem: mensagemDaConexao(conexao, endereco),
    conectadoEm: conexao.conectado_em ?? null,
    atualizadoEm: conexao.updated_at ?? null,
  };
}

function statusRecebimento(unidade: any) {
  const endereco = enderecoRecebimento(unidade);
  return {
    configurado: Boolean(dominioRecebimento()),
    ativo: Boolean(endereco),
    endereco,
    mensagem: endereco
      ? "O endereço exclusivo desta UC está ativo para receber PDFs."
      : "Ative primeiro o recebimento automático por e-mail desta UC para que o Outlook possa encaminhar as faturas.",
  };
}

export async function obterConexoesEmail(unidadeId: string, usuario: UsuarioAutenticado) {
  const unidade = await buscarUnidadeAutorizada(unidadeId, usuario);
  const { data, error } = await supabase
    .from("conexoes_email")
    .select("id, provedor, email_conectado, status, regra_status, regra_erro, conectado_em, updated_at")
    .eq("unidade_consumidora_id", unidade.id)
    .order("updated_at", { ascending: false });
  if (error) throw error;

  return {
    unidade: { id: unidade.id, numero: unidade.numero },
    recebimento: statusRecebimento(unidade),
    conexoes: (data ?? []).map((conexao) => serializarConexao(conexao, unidade)),
  };
}

function criarUrlAutorizacao(
  configuracao: ConfiguracaoOAuth,
  state: string,
  challenge: string,
  callback: string,
) {
  const url = new URL(configuracao.authorizationUrl);
  url.searchParams.set("client_id", configuracao.clientId);
  url.searchParams.set("redirect_uri", callback);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", configuracao.scopes.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");

  if (configuracao.provedor === "GMAIL") {
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("include_granted_scopes", "true");
  } else {
    url.searchParams.set("response_mode", "query");
  }

  return url.toString();
}

export async function iniciarConexaoEmail(
  unidadeId: string,
  usuario: UsuarioAutenticado,
  entrada: { provedor?: unknown; app?: unknown },
) {
  if (!usuario.id) throw new Error("Sessão inválida.");
  const unidade = await buscarUnidadeAutorizada(unidadeId, usuario);
  if (unidade.status !== "ATIVA") throw new Error("A unidade consumidora precisa estar ativa para conectar um e-mail.");

  const provedor = normalizarProvedor(entrada.provedor);
  const app = normalizarApp(entrada.app);
  const configuracao = configuracaoOAuth(provedor);
  // Falha antes de abrir o navegador se o backend não puder guardar o token com segurança.
  chaveCifra();

  const state = randomBytes(32).toString("base64url");
  const { verifier, challenge } = gerarPkce();
  const callback = callbackOAuth(provedor);
  const expiraEm = new Date(Date.now() + DURACAO_ESTADO_MS).toISOString();

  const { error } = await supabase.from("oauth_email_estados").insert({
    empresa_id: empresaIdDoUsuario(usuario),
    state_hash: hashState(state),
    usuario_id: usuario.id,
    unidade_consumidora_id: unidade.id,
    provedor,
    app,
    pkce_verifier: verifier,
    callback_url: callback,
    status: "PENDENTE",
    expira_em: expiraEm,
  });
  if (error) throw error;

  return {
    url: criarUrlAutorizacao(configuracao, state, challenge, callback),
    // O aplicativo guarda este state temporariamente e o devolve somente em /concluir.
    // Ele não é um token de acesso e expira em 15 minutos.
    state,
    expiraEm,
  };
}

async function textoErroResposta(resposta: globalThis.Response, padrao: string) {
  const texto = (await resposta.text()).slice(0, 1_500);
  try {
    const json = JSON.parse(texto);
    const mensagem = json?.error_description ?? json?.error?.message ?? json?.error ?? json?.message;
    if (mensagem) return String(mensagem).slice(0, 500);
  } catch {
    // A mensagem padrão é suficiente quando o provedor não devolve JSON.
  }
  return texto ? `${padrao} (${resposta.status}).` : padrao;
}

async function trocarCodigoPorTokens(
  configuracao: ConfiguracaoOAuth,
  codigo: string,
  verifier: string,
  callback: string,
) {
  const corpo = new URLSearchParams({
    client_id: configuracao.clientId,
    client_secret: configuracao.clientSecret,
    code: codigo,
    grant_type: "authorization_code",
    redirect_uri: callback,
    code_verifier: verifier,
  });

  const resposta = await fetch(configuracao.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: corpo,
  });
  if (!resposta.ok) throw new Error(await textoErroResposta(resposta, "Não foi possível concluir a autorização do e-mail"));

  const tokens = await resposta.json() as TokensOAuth;
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("O provedor não entregou uma autorização permanente. Tente conectar novamente e aceite todas as permissões solicitadas.");
  }
  return tokens;
}

async function trocarRefreshPorAccessToken(configuracao: ConfiguracaoOAuth, refreshToken: string) {
  const corpo = new URLSearchParams({
    client_id: configuracao.clientId,
    client_secret: configuracao.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  if (configuracao.provedor === "OUTLOOK") corpo.set("scope", configuracao.scopes.join(" "));

  const resposta = await fetch(configuracao.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: corpo,
  });
  if (!resposta.ok) throw new Error("Não foi possível renovar a autorização do e-mail.");
  const tokens = await resposta.json() as TokensOAuth;
  if (!tokens.access_token) throw new Error("O provedor não retornou um token de acesso.");
  return tokens;
}

async function obterEmailDaConta(provedor: ProvedorEmail, accessToken: string) {
  const url = provedor === "GMAIL"
    ? "https://www.googleapis.com/oauth2/v3/userinfo"
    : "https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName";
  const resposta = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!resposta.ok) throw new Error("Não foi possível identificar a conta de e-mail autorizada.");
  const dados = await resposta.json() as Record<string, unknown>;
  const email = String(dados.email ?? dados.mail ?? dados.userPrincipalName ?? "").trim().toLowerCase();
  return email || null;
}

async function removerRegraOutlook(accessToken: string, regraId: string) {
  const resposta = await fetch(
    `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messageRules/${encodeURIComponent(regraId)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!resposta.ok && resposta.status !== 404) {
    throw new Error("Não foi possível remover a regra anterior do Outlook.");
  }
}

async function criarRegraOutlook(accessToken: string, unidade: any, destinatario: string) {
  const resposta = await fetch("https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messageRules", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      displayName: `Andrade Energy · UC ${unidade.numero}`,
      sequence: 1,
      isEnabled: true,
      // Apenas o remetente oficial de faturas: há outros e-mails da CEMIG
      // com PDF que não correspondem a contas de energia.
      conditions: {
        hasAttachments: true,
        senderContains: ["fatura@cemig"],
      },
      actions: {
        forwardTo: [{ emailAddress: { address: destinatario } }],
        stopProcessingRules: false,
      },
    }),
  });
  if (!resposta.ok) throw new Error(await textoErroResposta(resposta, "O Outlook foi conectado, mas não foi possível criar a regra automática"));
  const regra = await resposta.json() as { id?: string };
  if (!regra.id) throw new Error("O Outlook não retornou o identificador da regra criada.");
  return regra.id;
}

async function revogarAcessoGmail(refreshToken: string) {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

function callbackDoAplicativo(app: AppOrigem, state: string, status: string) {
  const padrao = app === "GERADOR"
    ? "andradeenergygerador://email-conectado"
    : "andradeenergyconsumidor://email-conectado";
  const configurada = app === "GERADOR"
    ? valorAmbiente("OAUTH_APP_CALLBACK_GERADOR")
    : valorAmbiente("OAUTH_APP_CALLBACK_CONSUMIDOR");
  const url = new URL(configurada || padrao);
  url.searchParams.set("state", state);
  url.searchParams.set("status", status);
  if (!["SUCESSO", "AUTORIZADO", "CONCLUIDO"].includes(status)) {
    // O aplicativo usa esse marcador para não tratar uma autorização negada
    // como uma conexão concluída. Nenhum detalhe ou token do provedor é enviado.
    url.searchParams.set("error", "oauth_email");
  }
  return url.toString();
}

async function atualizarEstado(id: string, dados: Record<string, unknown>) {
  const { error } = await supabase
    .from("oauth_email_estados")
    .update({ ...dados, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

async function buscarEstado(state: string) {
  const { data, error } = await supabase
    .from("oauth_email_estados")
    .select("*")
    .eq("state_hash", hashState(state))
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function buscarConexaoPorUnidade(unidadeId: string, provedor: ProvedorEmail) {
  const { data, error } = await supabase
    .from("conexoes_email")
    .select("*")
    .eq("unidade_consumidora_id", unidadeId)
    .eq("provedor", provedor)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function salvarConexao(input: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("conexoes_email")
    .upsert(input, { onConflict: "unidade_consumidora_id,provedor" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function atualizarConexao(id: string, dados: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("conexoes_email")
    .update({ ...dados, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function concluirAutorizacaoOutlook(
  conexao: any,
  anterior: any,
  accessToken: string,
  unidade: any,
) {
  const destino = enderecoRecebimento(unidade);
  if (!destino) {
    return atualizarConexao(conexao.id, {
      status: "CONECTADO_SEM_REGRA",
      regra_id: null,
      regra_status: "NAO_CONFIGURADA",
      regra_erro: "Ative o endereço exclusivo de recebimento desta UC antes de criar a regra automática no Outlook.",
    });
  }

  try {
    if (anterior?.regra_id) await removerRegraOutlook(accessToken, anterior.regra_id);
    const regraId = await criarRegraOutlook(accessToken, unidade, destino);
    return atualizarConexao(conexao.id, {
      status: "REGRA_ATIVA",
      regra_id: regraId,
      regra_status: "ATIVA",
      regra_erro: null,
    });
  } catch (erro: any) {
    return atualizarConexao(conexao.id, {
      status: "CONECTADO_SEM_REGRA",
      regra_id: null,
      regra_status: "ERRO",
      regra_erro: String(erro?.message ?? "Não foi possível criar a regra automática no Outlook.").slice(0, 500),
    });
  }
}

export async function processarCallbackOAuth(input: {
  provedor?: unknown;
  state?: unknown;
  code?: unknown;
  error?: unknown;
}) {
  const state = String(input.state ?? "").trim();
  if (state.length < 32 || state.length > 300) throw new Error("Autorização inválida ou expirada.");
  const estado = await buscarEstado(state);
  if (!estado) throw new Error("Autorização inválida ou expirada.");

  const provedor = normalizarProvedor(input.provedor);
  if (estado.provedor !== provedor) throw new Error("O provedor não corresponde à autorização iniciada.");

  const redirecionar = (status: string) => callbackDoAplicativo(estado.app as AppOrigem, state, status);
  if (new Date(estado.expira_em).getTime() <= Date.now()) {
    await atualizarEstado(estado.id, { status: "EXPIRADO", erro: "A autorização expirou antes da confirmação." });
    return { redirecionamento: redirecionar("EXPIRADO"), status: "EXPIRADO" };
  }

  if (estado.status === "AUTORIZADO" || estado.status === "CONCLUIDO") {
    return { redirecionamento: redirecionar("SUCESSO"), status: estado.status };
  }
  if (estado.status !== "PENDENTE") {
    return { redirecionamento: redirecionar("ERRO"), status: estado.status };
  }

  if (input.error || !input.code) {
    await atualizarEstado(estado.id, {
      status: "ERRO",
      erro: "A autorização do e-mail foi cancelada ou negada pelo provedor.",
    });
    return { redirecionamento: redirecionar("ERRO"), status: "ERRO" };
  }

  try {
    const configuracao = configuracaoOAuth(provedor);
    const tokens = await trocarCodigoPorTokens(
      configuracao,
      String(input.code),
      estado.pkce_verifier,
      estado.callback_url,
    );
    const unidade = await buscarUnidadeInterna(estado.unidade_consumidora_id, estado.empresa_id);
    if (unidade.status !== "ATIVA") throw new Error("A unidade consumidora não está ativa.");

    const email = await obterEmailDaConta(provedor, tokens.access_token!);
    const anterior = await buscarConexaoPorUnidade(unidade.id, provedor);
    let conexao = await salvarConexao({
      empresa_id: estado.empresa_id,
      usuario_id: estado.usuario_id,
      unidade_consumidora_id: unidade.id,
      provedor,
      email_conectado: email,
      refresh_token_criptografado: criptografarSegredoOAuth(tokens.refresh_token!),
      token_acesso_expira_em: tokens.expires_in
        ? new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString()
        : null,
      escopos: (tokens.scope ? tokens.scope.split(/\s+/) : configuracao.scopes),
      status: provedor === "OUTLOOK" ? "CONECTADO_SEM_REGRA" : "LEITURA_AUTORIZADA",
      regra_id: null,
      regra_status: provedor === "OUTLOOK" ? "NAO_CONFIGURADA" : "NAO_APLICAVEL",
      regra_erro: provedor === "GMAIL"
        ? "O Gmail pessoal não permite que o aplicativo crie uma regra de encaminhamento sem confirmação do usuário. A autorização de leitura foi salva para a futura importação programada."
        : null,
      conectado_em: new Date().toISOString(),
      ultima_validacao_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (provedor === "OUTLOOK") {
      conexao = await concluirAutorizacaoOutlook(conexao, anterior, tokens.access_token!, unidade);
    }

    await atualizarEstado(estado.id, {
      status: "AUTORIZADO",
      conexao_email_id: conexao.id,
      autorizado_em: new Date().toISOString(),
      erro: null,
    });
    return { redirecionamento: redirecionar("SUCESSO"), status: "AUTORIZADO" };
  } catch (erro: any) {
    await atualizarEstado(estado.id, {
      status: "ERRO",
      erro: String(erro?.message ?? "Não foi possível concluir a conexão do e-mail.").slice(0, 500),
    });
    return { redirecionamento: redirecionar("ERRO"), status: "ERRO" };
  }
}

export async function concluirConexaoEmail(usuario: UsuarioAutenticado, stateRecebido: unknown) {
  if (!usuario.id) throw new Error("Sessão inválida.");
  const state = String(stateRecebido ?? "").trim();
  if (state.length < 32 || state.length > 300) throw new Error("Autorização inválida ou expirada.");
  const estado = await buscarEstado(state);
  if (!estado || estado.usuario_id !== usuario.id) {
    throw new Error("Esta autorização não pertence à sua conta.");
  }

  if (new Date(estado.expira_em).getTime() <= Date.now() && estado.status === "PENDENTE") {
    await atualizarEstado(estado.id, { status: "EXPIRADO", erro: "A autorização expirou antes da confirmação." });
    return { status: "EXPIRADO", pronto: false, message: "A autorização expirou. Inicie novamente." };
  }
  if (estado.status === "PENDENTE") {
    return { status: "PENDENTE", pronto: false, message: "Conclua a autorização no navegador para continuar." };
  }
  if (estado.status === "ERRO" || estado.status === "EXPIRADO") {
    return { status: estado.status, pronto: false, message: estado.erro ?? "Não foi possível conectar este e-mail." };
  }
  if (!estado.conexao_email_id) {
    return { status: "ERRO", pronto: false, message: "A autorização foi concluída sem uma conexão válida." };
  }

  const unidade = await buscarUnidadeAutorizada(estado.unidade_consumidora_id, usuario);
  const { data: conexao, error } = await supabase
    .from("conexoes_email")
    .select("id, provedor, email_conectado, status, regra_status, regra_erro, conectado_em, updated_at")
    .eq("id", estado.conexao_email_id)
    .maybeSingle();
  if (error) throw error;
  if (!conexao) return { status: "ERRO", pronto: false, message: "A conexão foi removida antes da confirmação." };

  if (estado.status === "AUTORIZADO") {
    await atualizarEstado(estado.id, { status: "CONCLUIDO", consumido_em: new Date().toISOString() });
  }
  return {
    status: "CONCLUIDO",
    pronto: true,
    conexao: serializarConexao(conexao, unidade),
    unidade: { id: unidade.id, numero: unidade.numero },
  };
}

export async function excluirConexaoEmail(conexaoId: string, usuario: UsuarioAutenticado) {
  if (!usuario.id) throw new Error("Sessão inválida.");
  const { data: conexao, error } = await supabase
    .from("conexoes_email")
    .select("*")
    .eq("id", conexaoId)
    .maybeSingle();
  if (error) throw error;
  if (!conexao) throw new Error("Conexão de e-mail não encontrada.");

  const unidade = await buscarUnidadeAutorizada(conexao.unidade_consumidora_id, usuario);
  let aviso: string | null = null;
  try {
    const configuracao = configuracaoOAuth(conexao.provedor as ProvedorEmail);
    const refreshToken = descriptografarSegredoOAuth(conexao.refresh_token_criptografado);
    const tokens = await trocarRefreshPorAccessToken(configuracao, refreshToken);
    if (conexao.provedor === "OUTLOOK" && conexao.regra_id) {
      await removerRegraOutlook(tokens.access_token!, conexao.regra_id);
    }
    if (conexao.provedor === "GMAIL") await revogarAcessoGmail(refreshToken);
  } catch {
    aviso = conexao.provedor === "OUTLOOK" && conexao.regra_id
      ? "A conexão local foi removida, mas não foi possível remover a regra no Outlook. Revise-a diretamente na caixa de entrada."
      : "A conexão local foi removida. Caso queira, revogue também o acesso diretamente no provedor de e-mail.";
  }

  const { error: erroExcluir } = await supabase
    .from("conexoes_email")
    .delete()
    .eq("id", conexao.id);
  if (erroExcluir) throw erroExcluir;

  return {
    message: "Conexão de e-mail removida.",
    unidade: { id: unidade.id, numero: unidade.numero },
    aviso,
  };
}
