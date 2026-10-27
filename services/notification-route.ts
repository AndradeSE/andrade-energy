export function notificationRoute(url: unknown, tipo?: unknown): string | undefined {
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//')) return undefined;
  if (tipo === 'PRODUCAO_IMPORTADA' && url.startsWith('/operacao/rateio?')) {
    const params = new URLSearchParams(url.split('?')[1]);
    const mes = params.get('competencia');
    const usina = params.get('usinaId');
    if (mes && /^20\d{2}-(0[1-9]|1[0-2])$/.test(mes) && usina && /^[a-zA-Z0-9_-]{1,128}$/.test(usina))
      return `/operacao?solarCompetencia=${mes}&usinaId=${encodeURIComponent(usina)}`;
    return '/operacao';
  }
  return url;
}
