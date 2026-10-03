export function cpfValido(valor: string) {
  if (!/^[\d.\-\s]+$/.test(valor)) return false;
  const cpf = valor.replace(/\D/g, "");
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  for (let tamanho = 9; tamanho <= 10; tamanho++) {
    const soma = [...cpf.slice(0, tamanho)].reduce((total, digito, i) => total + Number(digito) * (tamanho + 1 - i), 0);
    const digito = (soma * 10 % 11) % 10;
    if (digito !== Number(cpf[tamanho])) return false;
  }
  return true;
}

export function formatarCpf(valor: string) {
  return valor.replace(/\D/g, "").slice(0, 11).replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3}\.\d{3})(\d)/, "$1.$2").replace(/(\.\d{3})(\d)/, "$1-$2");
}

export function nomeCompletoValido(valor: string) {
  return valor.trim().split(/\s+/).filter(p => /\p{L}{2}/u.test(p)).length >= 2 && /^[\p{L}\s'’.-]+$/u.test(valor.trim());
}

export type EnderecoCliente = { cep: string; logradouro: string; numero: string; complemento: string; bairro: string; cidade: string; uf: string };
export const enderecoVazio: EnderecoCliente = { cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "" };
export const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");
export function erroEndereco(e: EnderecoCliente) {
  if (e.cep.replace(/\D/g, "").length !== 8) return "Informe o CEP com 8 números.";
  if (![e.logradouro, e.numero, e.bairro, e.cidade].every(v => v.trim())) return "Preencha logradouro, número (ou S/N), bairro e cidade.";
  if (!UFS.includes(e.uf.toUpperCase())) return "Informe uma UF válida.";
  return "";
}
// Texto legível para os contratos existentes, sem depender de migração do banco.
export function serializarEndereco(e: EnderecoCliente) {
  return `Logradouro: ${e.logradouro.trim()}\nNúmero: ${e.numero.trim()}\nComplemento: ${e.complemento.trim()}\nBairro: ${e.bairro.trim()}\nCidade: ${e.cidade.trim()}\nUF: ${e.uf.toUpperCase()}\nCEP: ${e.cep.replace(/\D/g, "").replace(/(\d{5})(\d{3})/, "$1-$2")}`;
}
export function lerEndereco(texto: string): EnderecoCliente {
  const campos = { cep: "CEP", logradouro: "Logradouro", numero: "Número", complemento: "Complemento", bairro: "Bairro", cidade: "Cidade", uf: "UF" };
  const e = { ...enderecoVazio };
  for (const chave of Object.keys(campos) as (keyof EnderecoCliente)[]) {
    e[chave] = texto.match(new RegExp(`^${campos[chave]}: (.*)$`, "m"))?.[1] ?? "";
  }
  if (!texto.startsWith("Logradouro:")) e.logradouro = texto;
  return e;
}
