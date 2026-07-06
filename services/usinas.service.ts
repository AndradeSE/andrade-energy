import { supabase } from '../supabase';
import { Usina } from '../types/Usina';

export async function listarUsinas() {

  const { data, error } =
    await supabase
      .from('usinas')
      .select('*')
      .order('nome');

  if (error) throw error;

  return data || [];

}

export async function buscarUsina(id: string) {

  const { data, error } =
    await supabase
      .from('usinas')
      .select('*')
      .eq('id', id)
      .single();

  if (error) throw error;

  return data;

}

export async function criarUsina(
  usina: Partial<Usina>
) {

  const { data, error } =
    await supabase
      .from('usinas')
      .insert(usina)
      .select()
      .single();

  if (error) throw error;

  return data;

}

export async function editarUsina(
  id: string,
  usina: Partial<Usina>
) {

  const { data, error } =
    await supabase
      .from('usinas')
      .update(usina)
      .eq('id', id)
      .select()
      .single();

  if (error) throw error;

  return data;

}

export async function excluirUsina(id: string) {

  const { error } =
    await supabase
      .from('usinas')
      .delete()
      .eq('id', id);

  if (error) throw error;

}
console.log('USINAS SERVICE', {
  listarUsinas,
  buscarUsina,
});