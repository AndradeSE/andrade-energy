export function contractUnitDigits(text: string) {
  return text.match(/\b(?:uc|unidade(?: consumidora)?|instalacao)\s*(?:(?:com\s+)?(?:final|terminad[ao] em|numero|n[º°])\s*)?[:#-]?\s*(\d[\d. -]*)/)?.[1]?.replace(/\D/g, "");
}

export function matchesContractUnit(contract: any, digits: string) {
  const uc = Array.isArray(contract.unidades_consumidoras) ? contract.unidades_consumidoras[0] : contract.unidades_consumidoras;
  const doc = contract.dados_documento;
  return Boolean(digits) && [uc?.numero, doc?.numero_uc, doc?.uc_numero, doc?.numero_instalacao]
    .some(value => String(value ?? "").replace(/\D/g, "").endsWith(digits));
}
