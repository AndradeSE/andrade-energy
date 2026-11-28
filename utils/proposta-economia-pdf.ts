import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { simularFaturas } from './calculadora-fatura';

export async function gerarPropostaEconomiaPdf(
  resultado: ReturnType<typeof simularFaturas>,
  consumo: string,
  desconto: string,
  modalidadeGd: string,
) {
  const pdf = await PDFDocument.create();
  pdf.setTitle('Proposta de economia | Andrade Energy');
  const pagina = pdf.addPage([595.28, 841.89]);
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const verde = rgb(.03, .31, .22);
  const cinza = rgb(.29, .37, .34);
  const branco = rgb(1, 1, 1);
  const dinheiro = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const escrever = (texto: string, x: number, y: number, tamanho = 12, forte = false, cor = verde) =>
    pagina.drawText(texto, { x, y, size: tamanho, font: forte ? negrito : normal, color: cor });

  pagina.drawRectangle({ x: 0, y: 675, width: pagina.getWidth(), height: 167, color: verde });
  escrever('ANDRADE ENERGY', 44, 784, 13, true, branco);
  escrever('Proposta de economia', 44, 736, 30, true, branco);
  escrever('Simulação de compensação de energia', 44, 703, 14, false, branco);
  escrever(`Consumo mensal: ${consumo} kWh  |  ${modalidadeGd}  |  Desconto oferecido: ${desconto}%`, 44, 635);
  escrever('Comparativo mensal', 44, 586, 19, true);

  const linhas: [string, number][] = [
    ['Cemig sem Andrade', resultado.cemigSemAndrade],
    ['Cemig após compensação', resultado.cemigComAndrade],
    ['Parcela Andrade Energy', resultado.andrade],
    ['Total estimado com Andrade', resultado.totalComAndrade],
  ];
  linhas.forEach(([rotulo, valor], indice) => {
    const y = 541 - indice * 44;
    pagina.drawRectangle({ x: 44, y: y - 12, width: 507, height: 36, color: rgb(.93, .97, .95) });
    escrever(rotulo, 56, y, 13, indice === linhas.length - 1);
    const valorFormatado = dinheiro(valor);
    escrever(valorFormatado, 539 - negrito.widthOfTextAtSize(valorFormatado, 13), y, 13, true);
  });

  pagina.drawRectangle({ x: 44, y: 232, width: 507, height: 126, color: verde });
  escrever(resultado.economia >= 0 ? 'Economia estimada por mês' : 'Diferença mensal a mais', 59, 324, 13, false, branco);
  escrever(dinheiro(Math.abs(resultado.economia)), 59, 284, 30, true, branco);
  escrever(`Projeção em 12 meses: ${dinheiro(resultado.economiaAnual)}`, 59, 251, 13, false, branco);

  escrever('Premissas da simulação', 44, 185, 14, true);
  escrever('Valores estimados com base no consumo, nas tarifas e nas condições informadas.', 44, 159, 11, false, cinza);
  escrever('A taxa de iluminação pública não está incluída. O valor final depende da fatura.', 44, 139, 11, false, cinza);
  return pdf.save();
}
