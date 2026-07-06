import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from '../supabase';


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
      type: 'application/pdf',
    });

  if (resultado.canceled) return;

  const arquivo =
    resultado.assets[0];

  const url =
      await uploadPDF(
         arquivo
      );

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