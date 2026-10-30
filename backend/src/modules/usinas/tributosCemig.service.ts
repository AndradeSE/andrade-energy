import { read, utils } from 'xlsx';

export const FONTE_TRIBUTOS = 'https://www.cemig.com.br/valores-e-tarifas/pis-cofins-e-pasep/';
const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
export type TributosCemig = { referencia: string; pis: number; cofins: number; icmsPadrao: number | null; fonte: string };

export function lerTributosCemig(bytes: Buffer): TributosCemig[] {
  if (bytes.length > 5_000_000) throw new Error('Planilha excede o limite.');
  const workbook = read(bytes, {type: 'buffer', sheetRows: 12});
  const valores: TributosCemig[] = [];
  for (const nome of workbook.SheetNames) {
    const mes = /^(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)(\d{2})$/i.exec(nome);
    if (!mes) continue;
    const linhas = utils.sheet_to_json<unknown[]>(workbook.Sheets[nome], {header: 1, range: 'A1:F12'});
    function aoLado(rotulo: string) {
      for (const linha of linhas) {
        const index = linha.findIndex(v => String(v ?? '').trim().toUpperCase() === rotulo);
        if (index >= 0) return typeof linha[index + 1] === 'number' ? linha[index + 1] as number : NaN;
      }
      return NaN;
    }
    const pis = aoLado('PASEP') * 100, cofins = aoLado('COFINS') * 100;
    if (![pis, cofins].every(v => Number.isFinite(v) && v >= 0 && v < 20)) continue;
    // A própria tabela publica o fator sem ICMS e o fator combinado padrão.
    const semIcms = aoLado('SEM ICMS'), combinado = aoLado('PASEP/COFINS + ICMS  TOTAL');
    const icms = 100 * (1 - semIcms / combinado);
    const icmsPadrao = Number.isFinite(icms) && icms >= 0 && icms < 40 ? Number(icms.toFixed(4)) : null;
    valores.push({referencia: `20${mes[2]}-${String(MESES.indexOf(mes[1].toLowerCase()) + 1).padStart(2,'0')}`, pis, cofins, icmsPadrao, fonte: FONTE_TRIBUTOS});
  }
  if (!valores.length) throw new Error('Tabela de tributos não reconhecida.');
  return valores.sort((a,b) => b.referencia.localeCompare(a.referencia));
}

let cache: { expira: number; valores: TributosCemig[] } | undefined;
let consulta: Promise<TributosCemig[]> | undefined;
export async function consultarTributosCemig(referencia: string) {
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(referencia)) throw new Error('Competência inválida.');
  if (!cache || cache.expira < Date.now()) {
    consulta ??= (async () => {
      const pagina = await fetch(FONTE_TRIBUTOS, {signal: AbortSignal.timeout(15000)});
      if (!pagina.ok) throw new Error('Fonte indisponível.');
      const html = await pagina.text();
      const link = html.match(/https:\/\/www\.cemig\.com\.br\/wp-content\/uploads\/[^"'<>\s]*PASEP[^"'<>\s]*\.xls\b/i)?.[0];
      if (!link) throw new Error('Anexo não localizado.');
      const resposta = await fetch(link, {signal: AbortSignal.timeout(15000)});
      if (!resposta.ok) throw new Error('Planilha indisponível.');
      const valores = lerTributosCemig(Buffer.from(await resposta.arrayBuffer()));
      cache = {valores, expira: Date.now() + 3600_000};
      return valores;
    })().finally(() => { consulta = undefined; });
    await consulta;
  }
  const valores = cache!.valores;
  const exato = valores.find(item => item.referencia === referencia);
  return { solicitado: referencia, vigente: Boolean(exato), tributos: exato ?? valores.find(item => item.referencia <= referencia) ?? null, consultadoEm: new Date().toISOString() };
}
