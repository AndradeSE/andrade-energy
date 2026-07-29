export function extrairUC(texto: string): string {

    return (
        texto.match(
            /N\.º DA UNIDADE CONSUMIDORA\s*([\d.-]+)/
        )?.[1] ?? ""
    );

}