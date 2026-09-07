import PDFDocument from "pdfkit";
import modelo from "./modeloContrato.json";

const valor = (v: unknown, falta = "[não informado]") => String(v ?? "").trim() || falta;
const unico = (v: any) => Array.isArray(v) ? v[0] : v;
const numero = (v: unknown) => Number(String(v ?? 0).replace(",", "."));
const formatar = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const data = (v: unknown) => /^\d{4}-\d{2}-\d{2}/.test(String(v)) ? String(v).slice(0, 10).split("-").reverse().join("/") : "[não informada]";

/** Texto integral do modelo do usuário. Não contém dados das partes do exemplo. */
export function preencherModeloContrato(unidade: any, contrato: any) {
  const d = contrato.dados_documento ?? {};
  const assinaturaEmPapel = d.forma_assinatura === "PAPEL";
  const c = unico(unidade.clientes) ?? {};
  const u = unico(unidade.usinas) ?? {};
  const cfg = contrato.configuracao_uc_snapshot ?? d.configuracao_uc ?? unidade;
  const desconto = numero(cfg.desconto_percentual ?? contrato.desconto ?? unidade.desconto_percentual);
  if (!Number.isFinite(desconto) || desconto < 0 || desconto > 100) throw new Error("Desconto inválido para o contrato.");
  const injecao = String(cfg.modalidade_faturamento ?? unidade.modalidade_faturamento).toUpperCase() === "INJECAO";
  const somente = cfg.fatura_somente_andrade === true;
  const consumidorTitular = ["CLIENTE", "CONSUMIDOR"].includes(String(cfg.titularidade_ucs ?? d.titularidade_ucs ?? u.titularidade_ucs_recebedoras).toUpperCase());
  const gd2 = String(u.tipo_gd ?? cfg.tipo_gd).toUpperCase() === "GD2";
  const devolveDisponibilidade = (gd2 ? cfg.repassar_disponibilidade_gd2 : cfg.repassar_disponibilidade_gd1) === false;
  const devolveFio = gd2 && cfg.repassar_diferenca_fio_b_gd2 === false;
  const devolucoes = [devolveDisponibilidade ? "custo de disponibilidade" : "", devolveFio ? "Fio B" : ""].filter(Boolean);
  const locador = valor(d.locador_nome);
  const locatario = valor(c.nome);
  const endereco = valor(unidade.endereco);
  const distribuidora = valor(unidade.distribuidora, "concessionária");
  const energia = injecao ? "Energia Injetada" : "Energia Compensada";
  const responsabilidade = somente
    ? "O LOCATÁRIO pagará diretamente a fatura da concessionária, separadamente da remuneração do LOCADOR."
    : "O valor integral da fatura da concessionária será incluído na cobrança unificada como reembolso ao LOCADOR, que ficará responsável pela sua quitação perante a concessionária.";
  const prazo = numero(d.prazo_anos ?? 10);
  if (!Number.isFinite(prazo) || prazo <= 0) throw new Error("Prazo inválido para o contrato.");
  const potencia = valor(d.potencia_kwp ?? u.potencia_kwp);
  const geracao = valor(d.geracao_estimada ?? u.producao_media_12_meses ?? u.geracao_media);
  const tokens: Record<string, string> = {
    PARTES: `LOCATÁRIO: ${locatario}, inscrito no CPF/CNPJ sob nº ${valor(c.cpf)}, com endereço em ${valor(c.endereco)}, doravante denominado simplesmente LOCATÁRIO.\nLOCADOR: ${locador}, inscrito no CPF/CNPJ sob nº ${valor(d.locador_documento)}, com endereço em ${valor(d.locador_endereco)}, doravante denominado simplesmente LOCADOR.\nAs partes declaram possuir plena capacidade civil para celebrar o presente contrato.`,
    CONCESSIONARIA: distribuidora,
    POTENCIA: /kwp/i.test(potencia) ? potencia : `${potencia} kWp`,
    GERACAO: /kwh/i.test(geracao) ? geracao : `${geracao} kWh/mês`,
    FORO: valor(d.foro, "Itajubá/MG"),
    OBJETO_TITULARIDADE: `A unidade consumidora, instalação ${distribuidora} nº ${valor(unidade.numero)}, localizada em ${endereco}, terá titularidade ${consumidorTitular ? "do LOCATÁRIO" : "do LOCADOR"}, conforme a configuração da usina. ${consumidorTitular ? "A titularidade do consumidor será mantida." : "A alteração da titularidade destina-se exclusivamente à viabilização da execução deste contrato e ao atendimento das exigências operacionais e regulatórias aplicáveis."}`,
    DECLARACAO_TITULARIDADE: consumidorTitular ? "a titularidade das UCs permanecerá com o consumidor, observadas as exigências da concessionária" : "a alteração da titularidade da unidade consumidora perante a concessionária constitui procedimento necessário para a execução deste contrato",
    TITULARIDADE: consumidorTitular ? `A titularidade das UCs será mantida em nome do LOCATÁRIO. O LOCATÁRIO fornecerá a documentação necessária aos procedimentos perante a ${distribuidora}, no prazo de até 10 (dez) dias úteis contados da solicitação do LOCADOR.` : `O LOCATÁRIO fornecerá toda a documentação necessária para a alteração da titularidade da unidade consumidora perante a ${distribuidora}, comprometendo-se a assinar os documentos exigidos pela concessionária no prazo de até 10 (dez) dias úteis, contados da solicitação do LOCADOR.`,
    PRAZO: `O presente contrato vigorará pelo prazo de ${formatar(prazo)} ano(s), ${contrato.vigencia_inicio ? `com início em ${data(contrato.vigencia_inicio)} e término em ${data(contrato.vigencia_fim)}` : "contados da data de sua assinatura"}, encerrando-se automaticamente ao término desse período, salvo se as partes acordarem, por escrito, sua prorrogação.`,
    ENERGIA: energia,
    APURACAO_ENERGIA: injecao ? "efetivamente injetada" : "efetivamente compensada",
    ENERGIA_MINUSCULA: injecao ? "energia elétrica injetada" : "energia elétrica compensada",
    DESCONTO: formatar(desconto),
    PERCENTUAL_PAGO: formatar(100 - desconto),
    FORMULA: `Valor devido ao LOCADOR = ${energia} (kWh) × Tarifa Integral ${distribuidora} × ${formatar(100 - desconto)}%${devolucoes.length ? ` - devolução de ${devolucoes.join(" e ")}` : ""}. ${devolucoes.length ? "As devoluções serão abatidas da remuneração da energia, conforme os valores apurados na memória de cálculo da UC." : "Não há devolução de disponibilidade ou Fio B pelo LOCADOR nesta configuração."}`,
    COMPOSICAO: somente ? "A memória de cálculo da remuneração mensal conterá apenas o valor da energia apurado na forma deste contrato, deduzidas as devoluções previstas no item 9.2. A fatura da concessionária não integra a cobrança do LOCADOR e deverá ser paga separadamente pelo LOCATÁRIO." : "A memória de cálculo da remuneração mensal será composta pela soma: I - do valor da energia apurado na forma deste contrato, deduzidas as devoluções previstas no item 9.2; e II - do valor integral da fatura de energia elétrica emitida pela concessionária para a unidade consumidora objeto deste contrato, compreendendo o custo de disponibilidade, encargos, tributos, tarifas e demais cobranças incidentes.",
    PAGAMENTO_CONCESSIONARIA: responsabilidade,
    RESPONSABILIDADE: `${responsabilidade} A titularidade cadastral das UCs será ${consumidorTitular ? "do LOCATÁRIO" : "do LOCADOR"}, conforme a Cláusula Sétima.`,
  };
  const substituir = (s: string) => s.replace(/\{\{([A-Z_]+)\}\}/g, (_, chave) => {
    if (!(chave in tokens)) throw new Error(`Campo de modelo desconhecido: ${chave}`);
    return tokens[chave];
  });
  const paragrafos = (s: string) => s
    .replace(/(?<!item) (?=\d+\.\d+\.)/g, "\n\n")
    .replace(/ (?=(?:I{1,3} - |Parágrafo único\.|Valor devido =))/g, "\n\n")
    .replace(/ (?=(?:Usina Fotovoltaica|Unidade Geradora|Unidade Consumidora|Energia Injetada|Energia Compensada|Tarifa de Referência|Titularidade|Propriedade|O&M|Geração Projetada|Autoconsumo Remoto|Alteração Regulatória):)/g, "\n")
    .replace(/ (?=O LOCATÁRIO declara|Decorridos 15|Permanecendo a inadimplência|Persistindo o inadimplemento|E, por estarem)/g, "\n\n");
  return { locador, locatario, assinaturaEmPapel, foro: tokens.FORO, clausulas: modelo.map(c => ({ title: substituir(c.title), text: paragrafos(substituir(assinaturaEmPapel ? c.text : c.text.replace(/E, por estarem justos e contratados,[\s\S]*$/, "E, por estarem justos e contratados, as Partes firmam o presente Contrato de Locação de Usina Fotovoltaica por meio eletrônico. Cada parte terá acesso à cópia do instrumento e aos respectivos registros de assinatura após a conclusão do procedimento."))) })) };
}

/** Mantém capa, ordem das 26 cláusulas e página própria de assinaturas. */
export async function renderizarModeloContrato(unidade: any, contrato: any): Promise<Buffer> {
  const preenchido = preencherModeloContrato(unidade, contrato);
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: "A4", margins: { top: 58, left: 68, right: 68, bottom: 54 }, info: { Title: `Contrato - UC ${valor(unidade.numero)}` } });
    const chunks: Buffer[] = [];
    pdf.on("data", c => chunks.push(c)); pdf.on("end", () => resolve(Buffer.concat(chunks))); pdf.on("error", reject);
    pdf.font("Times-Bold").fontSize(23).fillColor("#171717").text("CONTRATO PARTICULAR DE LOCAÇÃO DE USINA FOTOVOLTAICA PARA AUTOCONSUMO REMOTO");
    pdf.moveDown().fontSize(13).text("MINUTA - PARTE I\nEstrutura Completa e Definições");
    pdf.moveDown().fontSize(12).text("ÍNDICE");
    preenchido.clausulas.forEach((c, i) => pdf.font("Times-Roman").fontSize(10.5).text(`${i + 1}. ${c.title.split(/ - /).slice(1).join(" - ") || c.title}`, { lineGap: 2 }));
    const grupos = [[0, 2], [2, 8], [8, 12], [12, 17], [17, 24], [24, 26]];
    for (const [inicio, fim] of grupos) {
      pdf.addPage();
      const clausulas = preenchido.clausulas.slice(inicio, fim);
      let tamanho = 11;
      const largura = pdf.page.width - 136;
      const altura = () => clausulas.reduce((total, c) => total + pdf.font("Times-Bold").fontSize(tamanho + 0.5).heightOfString(c.title, { width: largura }) + pdf.font("Times-Roman").fontSize(tamanho).heightOfString(c.text, { width: largura, lineGap: 2 }) + 20, 0);
      while (altura() > pdf.page.height - 120 && tamanho > 9) tamanho -= 0.25;
      if (altura() > pdf.page.height - 120) { pdf.end(); reject(new Error("Os dados excedem o espaço do modelo; revise os campos antes de gerar.")); return; }
      for (const c of clausulas) {
        pdf.font("Times-Bold").fontSize(tamanho + 0.5).fillColor("#4472A4").text(c.title, { width: largura });
        pdf.moveDown(0.4).font("Times-Roman").fontSize(tamanho).fillColor("#171717").text(c.text, { width: largura, align: "justify", lineGap: 2 });
        pdf.moveDown(1);
      }
    }
    pdf.addPage().font("Times-Bold").fontSize(14).fillColor("#171717").text("PÁGINA DE ASSINATURAS", { align: "center" });
    pdf.moveDown().fontSize(11).text("CONTRATO PARTICULAR DE LOCAÇÃO DE USINA FOTOVOLTAICA\nMODALIDADE DE AUTOCONSUMO REMOTO", { align: "center" });
    pdf.moveDown(2).font("Times-Roman").text(`Firmado entre:\nLOCADOR: ${preenchido.locador}\ne\nLOCATÁRIO: ${preenchido.locatario}`, { align: "center", lineGap: 6 });
    pdf.moveDown(2).text(preenchido.assinaturaEmPapel ? `${preenchido.foro}, ____ de _________________ de ______.` : "MINUTA PARA ASSINATURA ELETRÔNICA\nEste documento ainda não comprova a assinatura das partes.", { align: "center" });
    const y = pdf.y + 65;
    for (const [x, nome] of [[68, "LOCADOR"], [325, "LOCATÁRIO"]] as const) pdf.text(`________________________\n${nome}`, x, y, { width: 200, align: "center", lineGap: 10 });
    if (preenchido.assinaturaEmPapel) {
      pdf.text("TESTEMUNHAS", 68, y + 90, { width: 459, align: "center" });
      for (const x of [68, 325]) pdf.text("________________________\nNome:\nCPF:", x, y + 140, { width: 200, lineGap: 10 });
    }
    pdf.end();
  });
}
