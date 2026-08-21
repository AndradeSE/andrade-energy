import PDFDocument from "pdfkit";
import { readFile } from "node:fs/promises";

import { supabase } from "../../config/supabase";

const BUCKET = "contratos";
const MARGEM = 54;

function texto(valor: unknown, fallback = "Não informado") {
  const resultado = String(valor ?? "").trim();
  return resultado || fallback;
}

function dataExtenso() {
  return new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function paragrafo(pdf: PDFKit.PDFDocument, conteudo: string) {
  pdf.font("Helvetica").fontSize(10).fillColor("#1F2937").text(conteudo, MARGEM, pdf.y, { width: 487, align: "justify", lineGap: 3 });
  pdf.moveDown(0.8);
}

function clausula(pdf: PDFKit.PDFDocument, titulo: string, conteudo: string[]) {
  if (pdf.y > 695) pdf.addPage();
  pdf.font("Helvetica-Bold").fontSize(10).fillColor("#0B5E46").text(titulo, MARGEM, pdf.y, { width: 487 });
  pdf.moveDown(0.45);
  conteudo.forEach((item) => paragrafo(pdf, item));
}

/** Minuta parametrizada a partir do modelo de locação para autoconsumo remoto. */
export async function gerarMinutaContrato(unidadeId: string, contrato: any) {
  const { data: unidade, error } = await supabase
    .from("unidades_consumidoras")
    .select("id,numero,endereco,distribuidora,modalidade_faturamento,desconto_percentual, clientes(nome,cpf,endereco), usinas(nome,endereco,potencia_kwp,modalidade)")
    .eq("id", unidadeId)
    .single();
  if (error) throw error;

  const dados = contrato.dados_documento ?? {};
  const cliente = unidade.clientes as any;
  const usina = unidade.usinas as any;
  const locadorNome = texto(dados.locador_nome, "Andrade Energy");
  const locadorDocumento = texto(dados.locador_documento);
  const locadorEndereco = texto(dados.locador_endereco);
  const locatarioNome = texto(dados.locatario_nome, cliente?.nome);
  const locatarioDocumento = texto(dados.locatario_documento, cliente?.cpf);
  const enderecoUc = texto(dados.endereco_uc, unidade.endereco ?? cliente?.endereco);
  const prazo = texto(dados.prazo_anos, "10");
  const foro = texto(dados.foro, "Itajubá/MG");
  const potencia = texto(dados.potencia_kwp, usina?.potencia_kwp ? `${usina.potencia_kwp} kWp` : "Não informada");
  const geracao = texto(dados.geracao_estimada, "Não informada");
  const modalidade = String(unidade.modalidade_faturamento ?? usina?.modalidade ?? "COMPENSACAO").toUpperCase();
  const modalidadeNome = modalidade === "INJECAO" ? "Injeção de energia" : "Autoconsumo remoto por compensação";
  const desconto = Number(contrato.desconto ?? unidade.desconto_percentual ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 });

  return await new Promise<Buffer>((resolve, reject) => {
    const pdf = new PDFDocument({ size: "A4", margin: MARGEM, info: { Title: `Minuta de contrato - UC ${unidade.numero}` } });
    const partes: Buffer[] = [];
    pdf.on("data", (parte) => partes.push(parte));
    pdf.on("end", () => resolve(Buffer.concat(partes)));
    pdf.on("error", reject);

    pdf.font("Helvetica-Bold").fontSize(16).fillColor("#0B5E46").text("CONTRATO PARTICULAR DE LOCAÇÃO", { align: "center" });
    pdf.font("Helvetica-Bold").fontSize(13).text("DE USINA FOTOVOLTAICA PARA AUTOCONSUMO REMOTO", { align: "center" });
    pdf.moveDown(1.3);
    pdf.font("Helvetica").fontSize(9).fillColor("#6B7280").text(`MINUTA GERADA PELO SISTEMA - ${dataExtenso()}`, { align: "center" });
    pdf.moveDown(1.5);

    clausula(pdf, "CLÁUSULA PRIMEIRA - DAS PARTES", [
      `LOCADOR: ${locadorNome}, inscrito no CPF/CNPJ sob nº ${locadorDocumento}, com endereço em ${locadorEndereco}, doravante denominado LOCADOR.`,
      `LOCATÁRIO: ${locatarioNome}, inscrito no CPF/CNPJ sob nº ${locatarioDocumento}, titular da unidade consumidora descrita abaixo, doravante denominado LOCATÁRIO.`,
    ]);
    clausula(pdf, "CLÁUSULA SEGUNDA - DO OBJETO", [
      `O presente contrato tem por objeto a locação da usina fotovoltaica ${texto(usina?.nome, "vinculada")} para atendimento da UC CEMIG nº ${unidade.numero}, localizada em ${enderecoUc}, na modalidade ${modalidadeNome}.`,
      `A unidade consumidora permanece identificada perante a ${texto(unidade.distribuidora, "distribuidora")} e é vinculada a esta contratação exclusivamente para fins de compensação ou apuração da energia, conforme a modalidade escolhida.`,
    ]);
    clausula(pdf, "CLÁUSULA TERCEIRA - DAS CARACTERÍSTICAS TÉCNICAS", [
      `Usina: ${texto(usina?.nome)}. Potência instalada: ${potencia}. Geração média estimada: ${geracao}. Distribuidora: ${texto(unidade.distribuidora)}.`,
      "A geração efetiva é apurada pela medição da distribuidora e pode variar por condições climáticas, indisponibilidade da rede, manutenção e demais eventos fora do controle do LOCADOR.",
    ]);
    clausula(pdf, "CLÁUSULA QUARTA - DA REMUNERAÇÃO E FATURAMENTO", [
      `O desconto comercial contratado é de ${desconto}% sobre a energia elegível à modalidade contratada. A cobrança mensal observará a medição constante na fatura da distribuidora e a memória de cálculo disponibilizada pela Andrade Energy.`,
      modalidade === "INJECAO"
        ? "Na modalidade de injeção, a remuneração considera a energia injetada apurada pela distribuidora, a tarifa de referência vigente e o desconto contratado."
        : "Na modalidade de compensação, a remuneração considera a energia efetivamente compensada. Custos de disponibilidade, encargos, tributos e componentes regulatórios eventualmente mantidos pela distribuidora permanecem destacados na fatura original.",
      "Até o quinto dia útil após o recebimento da fatura da distribuidora, o LOCADOR disponibilizará a cobrança com o valor sem benefício, o valor devido, a energia considerada e o desconto real apurado.",
    ]);
    clausula(pdf, "CLÁUSULA QUINTA - DO PRAZO E PAGAMENTO", [
      `Este contrato vigorará por ${prazo} ano(s), contados da assinatura, salvo renovação ou rescisão na forma prevista. O pagamento seguirá o vencimento indicado na fatura mensal disponibilizada ao LOCATÁRIO.`,
      "O atraso poderá acarretar os encargos previstos no instrumento comercial e a suspensão ou encerramento da vinculação da unidade, observadas as normas aplicáveis e as notificações cabíveis.",
    ]);
    clausula(pdf, "CLÁUSULA SEXTA - DAS OBRIGAÇÕES", [
      "Compete ao LOCADOR operar e manter a usina, realizar monitoramento, limpeza e manutenção quando necessários. Compete ao LOCATÁRIO manter seus dados atualizados, pagar as cobranças no prazo e colaborar com os procedimentos exigidos pela distribuidora.",
      "As partes concordam com o tratamento dos dados estritamente necessários à execução deste contrato, ao faturamento, à comunicação e ao atendimento das exigências da distribuidora, nos termos da legislação aplicável.",
    ]);
    clausula(pdf, "CLÁUSULA SÉTIMA - DA RESCISÃO E DO FORO", [
      "O contrato poderá ser rescindido por acordo entre as partes, término da vigência, inadimplemento, descumprimento contratual ou inviabilidade operacional/regulatória, preservados os valores já apurados.",
      `Fica eleito o foro de ${foro} para dirimir controvérsias decorrentes deste contrato, salvo disposição legal diversa.`,
    ]);

    if (pdf.y > 610) pdf.addPage();
    pdf.moveDown(1.5);
    pdf.font("Helvetica").fontSize(10).fillColor("#1F2937").text(`${foro}, ${dataExtenso()}.`, { align: "center" });
    pdf.moveDown(4);
    pdf.font("Helvetica-Bold").fontSize(9).text("LOCADOR", 62, pdf.y, { width: 190, align: "center" });
    pdf.text("LOCATÁRIO", 344, pdf.y - 11, { width: 190, align: "center" });
    pdf.font("Helvetica").fontSize(8).fillColor("#6B7280").text(locadorNome, 62, pdf.y + 5, { width: 190, align: "center" });
    pdf.text(locatarioNome, 344, pdf.y - 10, { width: 190, align: "center" });
    pdf.moveDown(3);
    pdf.font("Helvetica").fontSize(7.5).fillColor("#6B7280").text("Minuta automática baseada no modelo de locação enviado. Revise o conteúdo jurídico e os dados das partes antes da assinatura.", MARGEM, pdf.y, { width: 487, align: "center" });
    pdf.end();
  });
}

export async function salvarDocumentoContrato(caminho: string, conteudo: Buffer) {
  const { error } = await supabase.storage.from(BUCKET).upload(caminho, conteudo, { contentType: "application/pdf", upsert: true });
  if (error) throw error;
  return caminho;
}

export async function armazenarContratoAssinado(unidadeId: string, contratoId: string, arquivo: string) {
  const conteudo = await readFile(arquivo);
  return salvarDocumentoContrato(`unidades/${unidadeId}/${contratoId}/contrato-assinado.pdf`, conteudo);
}

export async function criarLinkContrato(caminho?: string | null) {
  if (!caminho) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(caminho, 300);
  if (error) throw error;
  return data.signedUrl;
}
