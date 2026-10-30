/** Quadros CEMIG cujo cabeçalho é uma imagem, não texto extraível. */
export function extrairProximaLeituraDoQuadro(texto: string, referencia?: string) {
  const quadro = texto.match(/(?:Datas\s+de\s+Leitura[\s\S]{0,180}?|(?:mono|bi|tri)f[aá]sico[\s\S]{0,100}?)(\d{2}[\/.-]\d{2})\s*(\d{2}[\/.-]\d{2})\s*(\d{1,2})\s*(\d{2}[\/.-]\d{2})/i);
  const meses = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  const competencia = referencia?.toUpperCase().match(/^([A-Z]{3})\/(20\d{2})$/);
  if (!quadro || !competencia) return undefined;
  const mesReferencia = meses.indexOf(competencia[1]) + 1;
  if (!mesReferencia) return undefined;
  const ano = Number(competencia[2]);
  const data = (valor: string, anoData: number) => {
    const [dia, mes] = valor.split(/[\/.-]/).map(Number);
    const resultado = new Date(Date.UTC(anoData, mes - 1, dia));
    return resultado.getUTCFullYear() === anoData && resultado.getUTCMonth() === mes - 1 && resultado.getUTCDate() === dia ? resultado : null;
  };
  const mesAtual = Number(quadro[2].slice(-2));
  const anoAtual = ano + (mesReferencia === 12 && mesAtual === 1 ? 1 : 0);
  const atual = data(quadro[2], anoAtual);
  const anterior = data(quadro[1], anoAtual - (Number(quadro[1].slice(-2)) > mesAtual ? 1 : 0));
  const proxima = data(quadro[4], anoAtual + (Number(quadro[4].slice(-2)) < mesAtual ? 1 : 0));
  if (!atual || !anterior || !proxima) return undefined;
  const dias = (atual.getTime() - anterior.getTime()) / 86400000;
  const intervalo = (proxima.getTime() - atual.getTime()) / 86400000;
  if (dias !== Number(quadro[3]) || dias < 1 || dias > 62 || intervalo < 1 || intervalo > 62) return undefined;
  return `${quadro[4].replace(/[.-]/g, "/")}/${proxima.getUTCFullYear()}`;
}
