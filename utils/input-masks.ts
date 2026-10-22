export function mascaraDocumento(valor: string) {
  const d=valor.replace(/\D/g,"").slice(0,14);
  return d.length<=11 ? d.replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d{1,2})$/,"$1-$2")
    : d.replace(/(\d{2})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1/$2").replace(/(\d{4})(\d{1,2})$/,"$1-$2");
}

/** Entrada de centavos: digitar 123456 exibe R$ 1.234,56. */
export function mascaraMoeda(valor: string) {
  const digitos=valor.replace(/\D/g,"").slice(0,14);
  return digitos ? (Number(digitos)/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}) : "";
}
export function valorMoedaMascarada(valor: string) {
  const digitos=valor.replace(/\D/g,"");
  return digitos.length<=14 ? Number(digitos||0)/100 : NaN;
}
