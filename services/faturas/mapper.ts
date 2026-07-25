import { FaturaExtraida } from "../../types/FaturaExtraida";

export function mapFaturaExtraidaParaBanco(
    dados:FaturaExtraida,
    clienteId:string,
    pdfUrl:string
){

    return {

        cliente_id:clienteId,

        numero_instalacao:dados.uc,

        referencia:dados.referencia,

        valor_total:dados.valorTotal,

        vencimento:dados.vencimento,

        arquivo_url:pdfUrl,

        economia:dados.economia,

    };

}