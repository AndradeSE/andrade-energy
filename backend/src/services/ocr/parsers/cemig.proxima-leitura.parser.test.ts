import { describe, expect, it } from "vitest";

import { parseCemigConvencional } from "./cemig.convencional.parser";
import { parseCemigGD } from "./cemig.gd.parser";

describe("próxima leitura CEMIG", () => {
  it("extrai quando a data vem depois do rótulo", () => {
    const dados = parseCemigConvencional("Próxima leitura: 16/10/2026");
    expect(dados.proximaLeitura).toBe("16/10/2026");
  });

  it("extrai quando a data vem antes do rótulo no texto do PDF", () => {
    const dados = parseCemigGD("17/10/2026  Próxima Leitura");
    expect(dados.proximaLeitura).toBe("17/10/2026");
  });
});
