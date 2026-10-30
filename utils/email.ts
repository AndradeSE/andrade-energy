export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export function normalizarEmail(valor: string) {
  return valor.replace(/\s/g, "").toLowerCase();
}

export function emailValido(valor: string) {
  return EMAIL_REGEX.test(normalizarEmail(valor));
}

export function emailOpcionalValido(valor: string) {
  return !valor.trim() || emailValido(valor);
}
