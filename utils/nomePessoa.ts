import { nomeCompletoValido } from "./cadastroCliente";

export function separarNomePessoa(valor: string) {
  const partes = valor.trim().split(/\s+/).filter(Boolean);
  return { nome: partes.shift() ?? "", sobrenome: partes.join(" ") };
}

export function juntarNomePessoa(nome: string, sobrenome: string) {
  return [nome.trim(), sobrenome.trim()].filter(Boolean).join(" ");
}

export function nomePessoaValido(nome: string, sobrenome: string) {
  return Boolean(nome.trim() && sobrenome.trim()) && nomeCompletoValido(juntarNomePessoa(nome, sobrenome));
}
