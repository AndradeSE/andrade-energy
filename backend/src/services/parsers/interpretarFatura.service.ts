import { extrairCliente } from "./parsers/cliente.parser";
import { extrairCompetencia } from "./parsers/competencia.parser";
import { extrairConsumo } from "./parsers/consumo.parser";
import { extrairValor } from "./parsers/tarifa.parser";
import { extrairUC } from "./parsers/uc.parser";
import { extrairVencimento } from "./parsers/vencimento.parser";

export function interpretarFatura(texto: string) {

    return {

        distribuidora: "CEMIG",

        cliente: extrairCliente(texto),

        uc: extrairUC(texto),

        competencia: extrairCompetencia(texto),

        vencimento: extrairVencimento(texto),

        consumo: extrairConsumo(texto),

        valorTotal: extrairValor(texto)

    };

}