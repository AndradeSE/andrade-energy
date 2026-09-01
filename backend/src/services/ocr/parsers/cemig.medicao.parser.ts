function paraNumeroMedicao(valor: string) {
  const limpo = valor.trim();
  if (!limpo) return undefined;
  const normalizado = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo.replace(/\.(?=\d{3}(?:\D|$))/g, "");
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : undefined;
}

export interface MedicaoExtraida {
  leituraAnterior?: number;
  leituraAtual?: number;
  fatorMultiplicacao: number;
  medicoes: MedicaoCemig[];
  producaoMensal: number;
}

export interface MedicaoCemig {
  tipo: "CONSUMO" | "INJECAO";
  medidor: string;
  leituraAnterior: number;
  leituraAtual: number;
  fatorMultiplicacao: number;
  energiaKwh: number;
}

function medicaoValida(tipo: MedicaoCemig["tipo"], medidor: string, anterior: number, atual: number, fator: number, energiaInformada?: number): MedicaoCemig | null {
  if (![anterior, atual, fator].every(Number.isFinite) || fator <= 0 || atual < anterior) return null;
  const calculada = (atual - anterior) * fator;
  const energiaKwh = Number.isFinite(energiaInformada) ? Number(energiaInformada) : calculada;
  if (Math.abs(calculada - energiaKwh) > 1) return null;
  return { tipo, medidor, leituraAnterior: anterior, leituraAtual: atual, fatorMultiplicacao: fator, energiaKwh };
}

function decomporCaudaCompactada(cauda: string) {
  const fatoresPreferenciais = [1, 10, 20, 30, 40, 50, 80, 100, 200, 400, 800, 1000];
  const candidatos: Array<{ anterior: number; atual: number; fator: number; energia: number; pontuacao: number }> = [];

  for (let a = 1; a <= cauda.length - 3; a += 1) {
    for (let b = a + 1; b <= cauda.length - 2; b += 1) {
      for (let c = b + 1; c <= cauda.length - 1; c += 1) {
        const anterior = paraNumeroMedicao(cauda.slice(0, a));
        const atual = paraNumeroMedicao(cauda.slice(a, b));
        const fator = Number(cauda.slice(b, c));
        const energia = Number(cauda.slice(c));
        if (anterior === undefined || atual === undefined || !fatoresPreferenciais.includes(fator)) continue;
        if (atual < anterior || Math.abs((atual - anterior) * fator - energia) > 1) continue;
        const pontuacao = (fator === 1 ? 3 : 0) + (a === b - a ? 2 : 0) + Math.min(a, b - a);
        candidatos.push({ anterior, atual, fator, energia, pontuacao });
      }
    }
  }

  return candidatos.sort((x, y) => y.pontuacao - x.pontuacao)[0] ?? null;
}

export function extrairMedicoesCemig(texto: string): MedicaoCemig[] {
  const medicoes: MedicaoCemig[] = [];
  const linhas = texto.match(/Energia(?:\s+Injetada|\s+kWh)[A-Z]{2,4}\d{9}[^\r\n]*/gi) ?? [];

  for (const linha of linhas) {
    const cabecalho = linha.match(/Energia(\s+Injetada|\s+kWh)([A-Z]{2,4}\d{9})(.*)/i);
    if (!cabecalho) continue;
    const tipo = /Injetada/i.test(cabecalho[1]) ? "INJECAO" : "CONSUMO";
    const medidor = cabecalho[2].toUpperCase();
    const cauda = cabecalho[3].replace(/\s+/g, "").trim();
    // A saída textual não separa as quatro últimas colunas. A decomposição
    // valida todas as divisões possíveis pela identidade
    // (atual - anterior) x constante = energia informada.
    let partes = decomporCaudaCompactada(cauda);

    // Caso degenerado comum após troca do medidor: 0, 0, constante 40, 0
    // chega do PDF como "00400" e possui várias decomposições matemáticas.
    const zerosComFator = cauda.match(/^00(1000|800|400|200|100|80|50|40|30|20|10|1)0$/);
    if (zerosComFator) partes = { anterior: 0, atual: 0, fator: Number(zerosComFator[1]), energia: 0, pontuacao: 999 };

    if (!partes) continue;
    const medicao = medicaoValida(tipo, medidor, partes.anterior, partes.atual, partes.fator, partes.energia);
    if (medicao) medicoes.push(medicao);
  }

  return medicoes;
}

export function extrairMedicaoCemig(texto: string): MedicaoExtraida {
  const medicoes = extrairMedicoesCemig(texto);
  const producaoMensal = medicoes
    .filter((item) => item.tipo === "INJECAO")
    .reduce((total, item) => total + item.energiaKwh, 0);
  const medicaoPrincipal = medicoes.find((item) => item.tipo === "CONSUMO") ?? medicoes[0];
  if (medicaoPrincipal) return {
    leituraAnterior: medicaoPrincipal.leituraAnterior,
    leituraAtual: medicaoPrincipal.leituraAtual,
    fatorMultiplicacao: medicaoPrincipal.fatorMultiplicacao,
    medicoes,
    producaoMensal,
  };
  const trecho = texto.match(/(?:LEITURA|DADOS DA MEDI[CÇ][AÃ]O).{0,700}/i)?.[0] ?? texto;
  const anterior = trecho.match(/LEITURA ANTERIOR\s*[:\-]?\s*([\d.,]+)/i)?.[1];
  const atual = trecho.match(/LEITURA ATUAL\s*[:\-]?\s*([\d.,]+)/i)?.[1];
  const fator = trecho.match(/(?:FATOR|CONSTANTE)(?: DE)? MULTIPLICA[CÇ][AÃ]O\s*[:\-]?\s*([\d.,]+)/i)?.[1];

  if (anterior && atual) return {
    leituraAnterior: paraNumeroMedicao(anterior),
    leituraAtual: paraNumeroMedicao(atual),
    fatorMultiplicacao: paraNumeroMedicao(fator ?? "1") ?? 1,
    medicoes: [],
    producaoMensal: 0,
  };

  // Formato extraído dos PDFs atuais da CEMIG, que concatena toda a linha:
  // Energia kWh + medidor + leitura anterior + leitura atual + fator + consumo.
  // Nos PDFs atuais, a primeira ocorrência de "Leitura" pode estar no
  // cabeçalho de datas e a linha real do medidor fica depois do recorte da
  // seção. Por isso a tabela compactada deve ser procurada no documento todo.
  const linhaCemig = texto.match(/Energia kWh[A-Z]{2,4}\d{9}(\d{1,3}(?:\.\d{3})+)(\d{1,3}(?:\.\d{3})+)(\d+)/i);
  if (linhaCemig) {
    const leituraAnterior = paraNumeroMedicao(linhaCemig[1]);
    const leituraAtual = paraNumeroMedicao(linhaCemig[2]);
    const cauda = linhaCemig[3];
    let fatorMultiplicacao = 1;
    if (leituraAnterior !== undefined && leituraAtual !== undefined) {
      const diferenca = leituraAtual - leituraAnterior;
      for (let tamanho = 1; tamanho < cauda.length; tamanho += 1) {
        const fatorCandidato = Number(cauda.slice(0, tamanho));
        const consumoInformado = Number(cauda.slice(tamanho));
        if (fatorCandidato > 0 && Math.abs(diferenca * fatorCandidato - consumoInformado) < 1) {
          fatorMultiplicacao = fatorCandidato;
          break;
        }
      }
    }
    return { leituraAnterior, leituraAtual, fatorMultiplicacao, medicoes: [], producaoMensal: 0 };
  }

  const tabela = texto.match(/(?:N[ÚU]MERO|N[º°])(?: DO)? MEDIDOR.*?LEITURA ANTERIOR.*?LEITURA ATUAL.*?(?:FATOR|CONSTANTE)(?: DE)? MULTIPLICA[CÇ][AÃ]O.*?\b\d{5,}\b\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/i);
  return {
    leituraAnterior: paraNumeroMedicao(tabela?.[1] ?? ""),
    leituraAtual: paraNumeroMedicao(tabela?.[2] ?? ""),
    fatorMultiplicacao: paraNumeroMedicao(tabela?.[3] ?? "1") ?? 1,
    medicoes: [],
    producaoMensal: 0,
  };
}
