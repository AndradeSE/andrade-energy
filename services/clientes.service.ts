import { useState } from 'react';
import { supabase } from '../supabase';
import { Cliente } from '../types/Cliente';

const [clientes,setClientes]=
useState<Cliente[]>([]);




export async function listarClientes() {

  const { data, error } =
    await supabase
      .from('clientes')
      .select(`
        *,
        usinas (
          nome
        )
      `)
      .order('nome');

  if (error) throw error;

  return data || [];

}

export async function buscarClientePorUC(
  uc: string
) {

  const { data, error } =
    await supabase
      .from("clientes")
      .select("*")
      .eq("uc", uc)
      .single();

  if (error)
    return null;

  return data;

}


export async function buscarCliente(id: string) {

  const { data, error } =
    await supabase
      .from('clientes')
      .select('*')
      .eq('id', id)
      .single();

  if (error) throw error;

  return data;

}

export async function criarCliente(
  cliente: Partial<Cliente>
) {

  const { data, error } =
    await supabase
      .from('clientes')
      .insert(cliente)
      .select()
      .single();

  if (error) throw error;

  return data;

}

export async function editarCliente(

id:string,

cliente:Partial<Cliente>

) {

  const { data, error } =
    await supabase
      .from('clientes')
      .update(cliente)
      .eq('id', id)
      .select()
      .single();

  if (error) throw error;

  return data;

}

export async function excluirCliente(id: string) {

  await supabase
    .from('cobrancas')
    .delete()
    .eq('cliente_id', id);

  await supabase
    .from('faturas')
    .delete()
    .eq('cliente_id', id);

  const { error } =
    await supabase
      .from('clientes')
      .delete()
      .eq('id', id);

  if (error) throw error;

}