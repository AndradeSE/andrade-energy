const ouvintes = new Set<() => void>();

export function avisarMovimentoDaTela() {
  for (const ouvinte of ouvintes) ouvinte();
}

export function observarMovimentoDaTela(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}
