export function extrairConsumo(texto: string): number {

    const match =
        texto.match(/Energia ElétricakWh\s+(\d+)/);

    return Number(match?.[1] ?? 0);

}