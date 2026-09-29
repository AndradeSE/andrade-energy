import { renderizarModeloContrato } from "./modeloContrato";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

import { supabase } from "../../config/supabase";

const BUCKET = "contratos";

function exigirCadastroCompletoParaMinuta(unidade: any) {
  const cliente = Array.isArray(unidade?.clientes) ? unidade.clientes[0] : unidade?.clientes;
  if (![cliente?.nome, cliente?.cpf, cliente?.endereco].every((valor) => String(valor ?? "").trim())) {
    throw new Error("Complete nome, CPF/CNPJ e endereço do cliente no cadastro antes de gerar a minuta.");
  }
  if (!String(unidade?.numero ?? "").trim()) {
    throw new Error("Informe o número da unidade consumidora antes de gerar a minuta.");
  }
}

export async function validarCadastroParaMinuta(unidadeId: string) {
  const { data: unidade, error } = await supabase.from("unidades_consumidoras")
    .select("numero, clientes(nome,cpf,endereco)")
    .eq("id", unidadeId).single();
  if (error) throw error;
  exigirCadastroCompletoParaMinuta(unidade);
}

/** Gera a versão integral do modelo fornecido, sem alterar PDFs assinados. */
export async function gerarMinutaContrato(unidadeId: string, contrato: any) {
  if (contrato.aceite_cliente_em || contrato.contrato_assinado_url) {
    throw new Error("Contrato assinado não pode ser regenerado. Crie uma nova versão.");
  }
  const { data: unidade, error } = await supabase.from("unidades_consumidoras")
    .select("*, clientes(nome,cpf,endereco), usinas(*)")
    .eq("id", unidadeId).single();
  if (error) throw error;
  exigirCadastroCompletoParaMinuta(unidade);
  return renderizarModeloContrato(unidade, contrato);
}

export async function salvarDocumentoContrato(caminho: string, conteudo: Buffer) {
  // Cada revisão tem endereço imutável, inclusive em gravações concorrentes.
  caminho = caminho.replace(/\.pdf$/i, `-${randomUUID()}.pdf`);
  const { error } = await supabase.storage.from(BUCKET).upload(caminho, conteudo, { contentType: "application/pdf", upsert: false });
  if (error) throw error;
  return caminho;
}

export async function armazenarContratoAssinado(unidadeId: string, contratoId: string, arquivo: string) {
  const conteudo = await readFile(arquivo);
  return salvarDocumentoContrato(`unidades/${unidadeId}/${contratoId}/contrato-assinado.pdf`, conteudo);
}

export async function criarLinkContrato(caminho?: string | null) {
  if (!caminho) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(caminho, 300);
  if (error) throw error;
  return data.signedUrl;
}
