import { Request, Response } from "express";
import { PDFiumLibrary } from "@hyzyla/pdfium";
import { PNG } from "pngjs";
import { supabase } from "../../config/supabase";
import { empresaIdDaRequisicao } from "../../utils/empresaScope";
import { caminhoDocumentoPrivado } from "../../utils/documentoPrivado";
import { buscarFaturaPorId } from "./faturas.repository";
import { incluirLinksTemporarios, obterRelatorioCalculoDaFatura } from "./documentosFatura.service";

let emUso = false;

export async function visualizarPaginaFatura(req: Request, res: Response) {
  res.setHeader("Cache-Control", "private, no-store");
  const pagina = Number(req.query.pagina ?? 0);
  const tipos: Record<string, string> = { cemig: "pdf_cemig_url", andrade: "pdf_unificada_url", boleto: "pdf_boleto_url", calculo: "calculo" };
  const campo = tipos[String(req.query.tipo ?? "cemig")];
  if (!campo || !Number.isInteger(pagina) || pagina < 0 || pagina > 5) {
    return res.status(400).json({ message: "Página ou documento inválido." });
  }
  const usuario = (req as any).usuario;
  const fatura = await buscarFaturaPorId(req.params.id, empresaIdDaRequisicao(req));
  if (!fatura || (usuario?.perfil === "LEITURA" && fatura.cliente_id !== usuario.cliente_id)) {
    return res.status(404).json({ message: "Fatura não encontrada." });
  }
  if (emUso) return res.status(503).json({ message: "O leitor está ocupado. Tente novamente em instantes." });
  emUso = true;
  let library: Awaited<ReturnType<typeof PDFiumLibrary.init>> | undefined;
  let documento: any;
  let folha: any;
  try {
    const links = await incluirLinksTemporarios(fatura, usuario?.perfil === "LEITURA");
    if (campo === "calculo") links.calculo = await obterRelatorioCalculoDaFatura(fatura);
    if (!links[campo]) return res.status(404).json({ message: "Documento indisponível." });
    const caminho = caminhoDocumentoPrivado(links[campo], "faturas", String(process.env.SUPABASE_URL ?? ""));
    const { data, error } = await supabase.storage.from("faturas").download(caminho);
    if (error || !data || data.size > 10 * 1024 * 1024) {
      return res.status(422).json({ message: "Não foi possível preparar esta fatura." });
    }
    library = await PDFiumLibrary.init();
    documento = await library.loadDocument(Buffer.from(await data.arrayBuffer()));
    const total = documento.getPageCount();
    if (total < 1 || total > 6 || pagina >= total) return res.status(422).json({ message: "Página indisponível." });
    folha = documento.getPage(pagina);
    const { originalWidth: largura, originalHeight: altura } = folha.getOriginalSize();
    if (largura < 1 || altura < 1 || largura > 1500 || altura > 2000 || largura * altura * 4 > 8_000_000) {
      return res.status(422).json({ message: "Dimensões da fatura não suportadas." });
    }
    const imagem = await folha.render({ scale: 2, render: async (options: any) => options.data });
    const png = new PNG({ width: imagem.width, height: imagem.height });
    png.data = Buffer.from(imagem.data);
    return res.json({ pagina, total, largura: imagem.width, altura: imagem.height, imagem: "data:image/png;base64," + PNG.sync.write(png, { colorType: 2 }).toString("base64") });
  } catch {
    return res.status(422).json({ message: "Não foi possível abrir esta fatura. Tente novamente." });
  } finally {
    folha?.close();
    documento?.destroy();
    library?.destroy();
    emUso = false;
  }
}
