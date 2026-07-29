export function extrairVencimento(texto: string): string {

    const match =
        texto.match(
            /Referente aVencimentoValor a pagar \(R\$\)\s*[A-Z]{3}\/\d{4}(\d{2}\/\d{2}\/\d{4})/
        );

    return match?.[1] ?? "";

}