import { normalizeSolarRequest } from "../shared/solar-language";

export function clientDetailsReply(client: any, question: string) {
  const text = normalizeSolarRequest(question);
  const fields = [
    { label: "Nome", value: client.nome, match: /\bnome\b/ },
    { label: "CPF/CNPJ", value: client.cpf ?? client.cnpj, match: /\b(cpf|cnpj)\b/ },
    { label: "E-mail", value: client.email, match: /\be-?mail\b/ },
    { label: "Telefone", value: client.telefone ?? client.whatsapp, match: /\b(telefone|celular)\b/ },
    { label: "WhatsApp", value: client.whatsapp, match: /\bwhatsapp\b/ },
    { label: "Endereço do cliente", value: client.endereco, match: /\bendereco\b/ },
    { label: "Situação do cliente", value: client.status, match: /\b(status|situacao)\b/ },
  ];
  const requested = fields.filter(field => field.match.test(text));
  return [typeof client.nome === "string" ? client.nome : "Cliente cadastrado", ...(requested.length ? requested : fields).map(field => `${field.label}: ${typeof field.value === "string" && field.value.trim() ? field.value.trim() : "não informado"}`)].join("\n");
}
