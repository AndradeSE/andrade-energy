import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../supabase';
import { buscarClientePorUC } from "./clientes.service";
import { extrairTextoPDF } from "./ocr/ocr.service";
import { interpretarFatura } from "./ocr/parser.service";
import { validarFatura } from "./validacao.service";

import { criarCobranca } from "./cobrancas.service";
import { inserirFatura } from "./fatura.repository";
import { mapFaturaExtraidaParaBanco } from "./faturas/mapper";

import { ImportacaoFatura } from "../types/ImportacaoFatura";

export async function salvarImportacao(
  importacao: ImportacaoFatura
) {

  const validacao =
    await validarFatura(importacao.dados);

  if (!validacao.valido)
    return validacao;

  const cliente =
    await buscarClientePorUC(
      importacao.dados.uc
    );

  if (!cliente)
    throw new Error(
      "Cliente não encontrado."
    );

  const dadosBanco =
    mapFaturaExtraidaParaBanco(

      importacao.dados,

      cliente.id,

      importacao.pdfUrl

    );

  const fatura =
    await inserirFatura(
      dadosBanco
    );

  await criarCobranca({

    clienteId: cliente.id,

    faturaId: fatura.id,

    valor: dadosBanco.valor_total,

    vencimento: dadosBanco.vencimento,

  });

 return {

    valido:true,

    erros:[],

    fatura,

};

}

export async function listarFaturas() {

  const { data, error } =
    await supabase
      .from('faturas')
      .select('*')
      .order('referencia', {
        ascending: false,
      });

  if (error) throw error;

  return data || [];

}

export async function buscarFaturasCliente(
  uc: string
) {

  const { data, error } =
    await supabase
      .from('faturas')
      .select('*')
      .eq(
        'numero_instalacao',
        uc.replace(/\D/g, '')
      );

  if (error) throw error;

  return data || [];

}

export async function importarFatura() {

  const resultado =
    await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
    });

  if (resultado.canceled) return null;

  const arquivo = resultado.assets[0];

  const pdfUrl =
    await uploadPDF(arquivo);

  const texto =
    await extrairTextoPDF(pdfUrl);

  const dados =
    interpretarFatura(texto);

  return {
    pdfUrl,
    dados,
  };

}


async function uploadPDF(
  arquivo:any
){

  const base64 =
    await FileSystem.readAsStringAsync(
      arquivo.uri,
      {
        encoding:'base64' as any,
      }
    );

  const bytes =
    Uint8Array.from(
      atob(base64),
      c=>c.charCodeAt(0)
    );

  const nomeArquivo =
    Date.now()+'-'+arquivo.name;

  const { error } =
    await supabase.storage
      .from('faturas')
      .upload(
        nomeArquivo,
        bytes,
        {
          contentType:'application/pdf'
        }
      );

  if(error)
    throw error;

  const { data } =
    supabase.storage
      .from('faturas')
      .getPublicUrl(nomeArquivo);

  return data.publicUrl;

}

export async function gerarCobranca() {}

export async function calcularEconomia() {}