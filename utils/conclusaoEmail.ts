export type ResultadoConclusaoEmail = {
  pronto?: boolean;
  status?: string;
  message?: string;
  unidade?: { id: string; numero?: string };
};

export function criarConclusorEmail(concluir: (state: string) => Promise<ResultadoConclusaoEmail>) {
  const pendentes = new Map<string, Promise<ResultadoConclusaoEmail>>();
  const concluidos = new Map<string, ResultadoConclusaoEmail>();

  return (state: string): Promise<ResultadoConclusaoEmail> => {
    const resultado = concluidos.get(state);
    if (resultado) return Promise.resolve(resultado);
    const pendente = pendentes.get(state);
    if (pendente) return pendente;

    const promessa = concluir(state).then((resposta) => {
      if (resposta.pronto !== true) throw new Error(resposta.message ?? "A autorização do e-mail não foi concluída.");
      concluidos.set(state, resposta);
      return resposta;
    }).finally(() => pendentes.delete(state));
    pendentes.set(state, promessa);
    return promessa;
  };
}
