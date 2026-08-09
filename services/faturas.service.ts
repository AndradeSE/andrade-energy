import * as FileSystem from "expo-file-system/legacy";
import api from "../config/api";

export async function processarFatura(uri: string) {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: "base64",
  });

  const { data } = await api.post("/faturas/importar", {
    arquivo: base64,
  });

  return data;
}

export async function salvarImportacao(uri: string) {
  return processarFatura(uri);
}

export async function listarFaturas(clienteId?: string) {
  const { data } = await api.get("/faturas", {
    params: clienteId
      ? { clienteId }
      : undefined,
  });

  return data;
}

export async function buscarFaturasCliente(
  uc: string
) {
  const { data } = await api.get("/faturas", {
    params: {
      uc,
    },
  });

  return data;
}

export async function buscarFatura(id: string) {
  const { data } = await api.get(`/faturas/${id}`);
  return data;
}

export async function excluirFatura(id: string) {
  const { data } = await api.delete(`/faturas/${id}`);
  return data;
}

export async function atualizarFatura(
  id: string,
  payload: any
) {
  const { data } = await api.put(
    `/faturas/${id}`,
    payload
  );

  return data;
}