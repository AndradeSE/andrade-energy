import { PDFDict, PDFDocument, PDFName, PDFInvalidObject } from "@cantoo/pdf-lib";

/** Remove somente a proteção de abertura; nunca reescreve um PDF assinado. */
export async function prepararPdfParaDownload(original: Buffer, senhas: string[] = []) {
  const opcoes = { updateMetadata: false, preserveXFA: true };
  const inspecao = await PDFDocument.load(original, { ...opcoes, ignoreEncryption: true });
  if (!inspecao.isEncrypted) return original;
  const temAssinatura = inspecao.context.enumerateIndirectObjects().some(([, objeto]) =>
    objeto instanceof PDFDict && objeto.has(PDFName.of("ByteRange")));
  if (temAssinatura) return original;
  for (const senha of [...new Set(["", ...senhas])]) {
    let documento: PDFDocument;
    try {
      documento = await PDFDocument.load(original, { ...opcoes, password: senha });
    } catch {
      continue;
    }
    // PDFs com tabelas xref em streams podem conservar um trailer antigo.
    // Retire apenas a referência à criptografia já desbloqueada, inclusive nele.
    delete documento.context.trailerInfo.Encrypt;
    for (const [referencia, objeto] of documento.context.enumerateIndirectObjects()) {
      if (objeto instanceof PDFInvalidObject) {
        const bytes = Buffer.alloc(objeto.sizeInBytes());
        objeto.copyBytesInto(bytes, 0);
        if (/\/Type\s*\/XRef\b/.test(bytes.toString("latin1"))) {
          // A gravação completa produz uma nova tabela xref.
          documento.context.delete(referencia);
          continue;
        }
        throw new Error("PDF possui um objeto inválido; original preservado.");
      }
      const dicionario = objeto instanceof PDFDict ? objeto : (objeto as any).dict;
      if (dicionario instanceof PDFDict && dicionario.get(PDFName.of("Type")) === PDFName.of("XRef")) {
        dicionario.delete(PDFName.of("Encrypt"));
      }
    }
    // Não achata formulários nem redesenha páginas: conserva os objetos originais.
    const copia = Buffer.from(await documento.save({ useObjectStreams: false, updateFieldAppearances: false }));
    const verificada = await PDFDocument.load(copia, opcoes);
    if (verificada.isEncrypted || verificada.getPageCount() !== documento.getPageCount()) {
      throw new Error("Não foi possível validar a cópia da concessionária sem senha.");
    }
    return copia;
  }
  // Sem a senha correta não é possível remover a proteção; mantém o original.
  return original;
}
