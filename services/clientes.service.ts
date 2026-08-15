import api from "../config/api";

export async function listarClientes() {
  const { data } = await api.get("/clientes");
  return data;
}

export async function buscarCliente(id: string) {
  const { data } = await api.get(`/clientes/${id}`);
  return data;
}

export async function criarCliente(payload: any) {
  const { data } = await api.post("/clientes", payload);
  return data;
}

export async function editarCliente(id: string, payload: any) {
  const { data } = await api.put(`/clientes/${id}`, payload);
  return data;
}

export async function excluirCliente(id: string) {
  await api.delete(`/clientes/${id}`);
}

export async function listarUnidadesCliente(id: string) {
  const { data } = await api.get(`/clientes/${id}/unidades`);
  return data;
}
