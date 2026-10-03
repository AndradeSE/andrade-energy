export function validarCadastroCliente(dados: any, parcial = false): string | null {
  if (!parcial || dados.nome !== undefined) {
    const nome = String(dados.nome ?? "").trim();
    if (!/^[\p{L}\s'’.-]+$/u.test(nome) || nome.split(/\s+/).filter(p => /\p{L}{2}/u.test(p)).length < 2) return "Informe nome e sobrenome do cliente.";
  }
  if (!parcial || dados.cpf !== undefined) {
    const valor = String(dados.cpf ?? "");
    const cpf = valor.replace(/\D/g, "");
    if (!/^[\d.\-\s]+$/.test(valor) || !/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return "Informe um CPF válido.";
    for (let tamanho = 9; tamanho <= 10; tamanho++) {
      const soma = [...cpf.slice(0, tamanho)].reduce((total, d, i) => total + Number(d) * (tamanho + 1 - i), 0);
      if ((soma * 10 % 11) % 10 !== Number(cpf[tamanho])) return "CPF com dígitos verificadores inválidos.";
    }
  }
  if (!parcial || dados.endereco !== undefined) {
    const texto = String(dados.endereco ?? "");
    const campo = (nome: string) => texto.match(new RegExp(`^${nome}: (.*)$`, "m"))?.[1]?.trim() ?? "";
    if (!["Logradouro", "Número", "Bairro", "Cidade"].every(nome => campo(nome))) return "Preencha o endereço completo do cliente.";
    if (!/^\d{5}-?\d{3}$/.test(campo("CEP"))) return "Informe um CEP válido.";
    if (!"AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ").includes(campo("UF"))) return "Informe uma UF válida.";
  }
  return null;
}
