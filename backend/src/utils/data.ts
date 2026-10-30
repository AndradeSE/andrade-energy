export function paraISO(data: string): string {

  const [dia, mes, ano] = data.split("/");

  return `${ano}-${mes}-${dia}`;

}