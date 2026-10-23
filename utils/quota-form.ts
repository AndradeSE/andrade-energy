export function quotaNumber(value: string) {
  const text = value.trim();
  if (!/^\d+(?:[.,]\d+)?$/.test(text) && !/^[1-9]\d{0,2}(?:\.\d{3})+(?:,\d+)?$/.test(text)) return NaN;
  const normalized = text.includes(",") || /^[1-9]\d{0,2}(?:\.\d{3})+$/.test(text) ? text.replace(/\./g, "").replace(",", ".") : text;
  return Number(normalized);
}
export function quotaValidity(value: string) {
  const parts = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!parts) return "";
  const [, day, month, year] = parts;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return "";
  return `${year}-${month}-${day}T23:59:59-03:00`;
}
