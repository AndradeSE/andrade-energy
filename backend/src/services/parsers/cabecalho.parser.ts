export interface CabecalhoFatura {
  cliente: string;
  uc: string;
  competencia: string;
  vencimento: string;
  valorTotal: number;
  consumoKwh: number;
}


export function parseCabecalho(texto: string): CabecalhoFatura {

    function numero(valor: string) {
  return Number(
    valor
      .replace(/\./g, "")
      .replace(",", ".")
  );
}

  const cliente =
  texto.match(/\n([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ ]+)\n(?:BAIRRO|RUA|AVENIDA|AV\.|ESTRADA)/)?.[1]?.trim() ?? "";

  const uc =
    texto.match(/N.º DA UNIDADE CONSUMIDORA\s*([\d.-]+)/)?.[1] ?? "";

 const cabecalho =
  texto.match(
    /Referente aVencimentoValor a pagar \(R\$\)\s*([A-Z]{3}\/\d{4})\s*(\d{2}\/\d{2}\/\d{4})\s*([\d.,]+)/
  );

const competencia = cabecalho?.[1] ?? "";

const vencimento = cabecalho?.[2] ?? "";

const valorTexto = cabecalho?.[3] ?? "0";

  const consumoTexto =
    texto.match(/Energia ElétricakWh\s+(\d+)/)?.[1] ?? "0";

  return {

    cliente,

    uc,

    competencia,

    vencimento,

   valorTotal: numero(valorTexto),

consumoKwh: numero(consumoTexto)
  };

}