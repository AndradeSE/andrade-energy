import {
  Alert
} from 'react-native';
export type DadosCemig = {
  referencia: string | null;
  valor_total: string | null;
  numero_instalacao: string | null;
  vencimento: string | null;
  nome_cliente: string | null;
  cpf: string | null;
  endereco: string | null;
  cidade: string;
  estado: string | null;
  consumo_kwh: string | null;
};




export function extrairDadosCemig(
  texto: string
): DadosCemig {
  

  const linhas = texto
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

    const textoNormalizado = texto
  .replace(/\r/g, '')
  .replace(/[ ]{2,}/g, ' ')
  .replace(/\n{2,}/g, '\n');


  const indiceInfoTecnica = linhas.findIndex(
    (linha) =>
      linha
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .includes('INFORMACOES TECNICAS')
  );

  console.log(
    'ÍNDICE INFO TÉCNICA:',
    indiceInfoTecnica
  );

  let consumoKwh: string | null = null;

  if (indiceInfoTecnica >= 0) {
    const trecho = linhas.slice(
      indiceInfoTecnica,
      indiceInfoTecnica + 15
    );

    console.log('TRECHO OCR:', trecho);

    const numeros = trecho
      .map((linha) => linha.replace(/\./g, ''))
      .filter((linha) => /^\d{3,6}$/.test(linha))
      .map(Number);

    console.log(
      'NÚMEROS ENCONTRADOS:',
      numeros
    );

    if (numeros.length >= 2) {
      consumoKwh = String(
        Math.max(...numeros) -
        Math.min(...numeros)
      );
    }
  }

  console.log(
    'CONSUMO EXTRAÍDO:',
    consumoKwh
  );

console.log('CONSUMO EXTRAÍDO:', consumoKwh);

console.log(
  'LEITURA ANTERIOR:',
  linhas[indiceInfoTecnica + 2]
);

console.log(
  'LEITURA ATUAL:',
  linhas[indiceInfoTecnica + 3]
);

 let referencia: string | null = null;

for (const linha of linhas) {

  const match =
    linha.match(
      /(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s*\/\s*20\d{2}/i
    );

  if (match) {

    referencia =
      match[0]
        .replace(/\s/g, '');

    break;

  }

}

 let valorTotal: string | null = null;

for (let i = 0; i < linhas.length; i++) {

  const linha =
    linhas[i].toUpperCase();

  if (
    linha.includes('VALOR A PAGAR') ||
    linha.includes('TOTAL A PAGAR')
  ) {

    for (
      let j = i;
      j <= i + 3;
      j++
    ) {

      const numero =
        linhas[j]?.match(
          /\d+[.,]\d{2}/
        );

      if (numero) {

        valorTotal =
          numero[0];

        break;

      }

    }

  }

}

 let instalacao: string | null = null;

for (const linha of linhas) {

  const numeros =
    linha.replace(/\D/g, '');

  if (
    numeros.length >= 10 &&
    numeros.length <= 13
  ) {

    instalacao = numeros;
    break;

  }

}

const cpfExtraido =
  texto.match(
    /CPF[\s\S]{0,30}?(\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2})/i
  )?.[1] || null;

const cpfNumerico =
  cpfExtraido?.replace(/\D/g, '') || '';

const cpf = cpfNumerico.length === 11
  ? cpfNumerico.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      '$1.$2.$3-$4'
    )
  : null;
  const vencimento =
texto.match(
/\d{2}\s*\/\s*\d{2}\s*\/\s*\d{4}/
)?.[0]
.replace(/\s/g,'')
||
null;

const palavrasBloqueadas = [
  'REIMPRESSÃO',
  'REIMPRESSAO',
  'CPF',
  'CEMIG',
  'VENCIMENTO',
  'VALOR A PAGAR',
  'UNIDADE CONSUMIDORA',
  'NOTA FISCAL',
  'CLASSE',
  'SUBCLASSE',
  'TOTAL',
  'MODALIDADE TARIFÁRIA',
];

let nomeCliente = null;

for (const linha of linhas) {
  const linhaLimpa = linha.toUpperCase();

  const nomeValido =
    /^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ\s]+$/.test(linhaLimpa) &&
    linhaLimpa.length > 10 &&
    !palavrasBloqueadas.some((palavra) =>
      linhaLimpa.includes(palavra)
    );

  if (nomeValido) {
    nomeCliente = linha;
    break;
  }
}

 const indiceCep = linhas.findIndex((linha) =>
  /\d{5}-\d{3}/.test(linha)
);

const endereco =
  indiceCep >= 2
    ? [
        linhas[indiceCep - 2],
        linhas[indiceCep - 1],
      ]
        .filter(Boolean)
        .join(', ')
    : null;

    console.log(
  'ENDERECO EXTRAIDO:',
  endereco
);

console.log(
  'LINHAS OCR:',
  linhas
);

 const cidadeUf =
  indiceCep >= 0
    ? linhas[indiceCep]
    : '';

const cidade =
  cidadeUf
    .replace(/\d{5}-\d{3}/, '')
    .replace(',', '')
    .replace(/\b[A-Z]{2}\b$/, '')
    .trim();

const estado =
  cidadeUf.match(
    /,\s*([A-Z]{2})/
  )?.[1] || null;

    console.log('NOME:', nomeCliente);

console.log('==============================');
console.log('REFERÊNCIA:', referencia);
console.log('VALOR:', valorTotal);
console.log('INSTALAÇÃO:', instalacao);
console.log('VENCIMENTO:', vencimento);
console.log('NOME:', nomeCliente);
console.log('CPF:', cpf);
console.log('ENDEREÇO:', endereco);
console.log('CIDADE:', cidade);
console.log('ESTADO:', estado);
console.log('CONSUMO:', consumoKwh);
console.log('==============================');

console.log(
  JSON.stringify(linhas, null, 2)
);

console.log(
  texto.match(/CPF[\s\S]{0,50}/i)?.[0]
);

console.log('DADOS EXTRAÍDOS:', {
  referencia,
  consumoKwh,
  instalacao,
});

Alert.alert(
  'Dados',
  JSON.stringify({
    referencia,
    valorTotal,
    instalacao,
  })
);

console.log('=================================');
console.log('REFERENCIA', referencia);
console.log('VALOR', valorTotal);
console.log('INSTALACAO', instalacao);
console.log('=================================');

return {
  referencia,
  valor_total: valorTotal,
  numero_instalacao: instalacao,
  vencimento,
  nome_cliente: nomeCliente,
  cpf,
  endereco,
  cidade,
  estado,
  consumo_kwh: consumoKwh,
};
}