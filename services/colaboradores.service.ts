import api from "../config/api";

export const listarColaboradores = async () => (await api.get("/colaboradores")).data;
export const convidarColaborador = async (payload: any) => (await api.post("/colaboradores/convites", payload)).data;
export const reenviarConviteColaborador = async (id: string) => (await api.post(`/colaboradores/convites/${id}/reenviar`)).data;
export const cancelarConviteColaborador = async (id: string) => (await api.delete(`/colaboradores/convites/${id}`)).data;
export const atualizarColaborador = async (id: string, payload: any) => (await api.patch(`/colaboradores/${id}`, payload)).data;
