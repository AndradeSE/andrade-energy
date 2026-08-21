import api from "../config/api";
import { IS_GERADOR_APP } from "../config/appVariant";

export type ProvedorEmail = "GMAIL" | "OUTLOOK";

export type ConexaoEmail = {
  id: string;
  provedor: ProvedorEmail | string;
  status: string;
  email: string | null;
  erro?: string | null;
  mensagem?: string | null;
  regra?: {
    ativa: boolean;
    status: string | null;
    erro: string | null;
  };
  conectadoEm: string | null;
};

type ResultadoConclusaoEmail = {
  pronto?: boolean;
  status?: string;
  message?: string;
  unidade?: {
    id: string;
    numero?: string;
  };
};

export async function listarConexoesEmail(unidadeId: string) {
  const { data } = await api.get<{ conexoes: ConexaoEmail[] }>(
    `/conexoes-email/unidades/${unidadeId}`,
  );

  return data.conexoes ?? [];
}

export async function iniciarConexaoEmail(
  unidadeId: string,
  provedor: ProvedorEmail,
) {
  const { data } = await api.post<{ url: string }>(
    `/conexoes-email/unidades/${unidadeId}/iniciar`,
    { provedor, app: IS_GERADOR_APP ? "GERADOR" : "CONSUMIDOR" },
  );

  return data;
}

export async function concluirConexaoEmail(state: string) {
  const { data } = await api.post<ResultadoConclusaoEmail>("/conexoes-email/concluir", { state });
  if (data.pronto === false) {
    throw new Error(data.message ?? "A autorização do e-mail não foi concluída.");
  }
  return data;
}

// O retorno OAuth pode chegar tanto pelo resultado do WebBrowser quanto pelo
// deep link do Expo Router. Mantemos a confirmação idempotente no app para não
// enviar duas solicitações concorrentes para o mesmo `state`.
const conclusoesEmAndamento = new Map<string, Promise<ResultadoConclusaoEmail>>();
const estadosConcluidos = new Set<string>();

export function concluirConexaoEmailUmaVez(state: string): Promise<ResultadoConclusaoEmail> {
  if (estadosConcluidos.has(state)) return Promise.resolve<ResultadoConclusaoEmail>({ pronto: true });

  const emAndamento = conclusoesEmAndamento.get(state);
  if (emAndamento) return emAndamento;

  const conclusao = concluirConexaoEmail(state)
    .then((resultado) => {
      estadosConcluidos.add(state);
      return resultado;
    })
    .finally(() => {
      conclusoesEmAndamento.delete(state);
    });

  conclusoesEmAndamento.set(state, conclusao);
  return conclusao;
}

export async function desconectarConexaoEmail(id: string) {
  await api.delete(`/conexoes-email/${id}`);
}
