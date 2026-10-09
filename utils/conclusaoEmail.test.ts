import assert from "node:assert/strict";
import test from "node:test";
import { criarConclusorEmail } from "./conclusaoEmail";

test("retorno OAuth concorrente e repetido preserva a UC autorizada", async () => {
  let chamadas = 0;
  const concluir = criarConclusorEmail(async () => {
    chamadas++;
    return { pronto: true, unidade: { id: "segunda-uc", numero: "854652001898" } };
  });
  const [navegador, deepLink] = await Promise.all([concluir("estado"), concluir("estado")]);
  const repetido = await concluir("estado");
  assert.equal(chamadas, 1);
  assert.deepEqual(deepLink, navegador);
  assert.equal(repetido.unidade?.id, "segunda-uc");
});

test("autorizações de UCs diferentes não compartilham resultado", async () => {
  const concluir = criarConclusorEmail(async (state) => ({ pronto: true, unidade: { id: state } }));
  assert.equal((await concluir("uc-a")).unidade?.id, "uc-a");
  assert.equal((await concluir("uc-b")).unidade?.id, "uc-b");
  assert.equal((await concluir("uc-a")).unidade?.id, "uc-a");
});

test("falha de rede permite tentar a autorização novamente", async () => {
  let chamadas = 0;
  const concluir = criarConclusorEmail(async () => {
    if (++chamadas === 1) throw new Error("rede indisponível");
    return { pronto: true, unidade: { id: "uc" } };
  });
  await assert.rejects(concluir("estado"), /rede indisponível/);
  assert.equal((await concluir("estado")).unidade?.id, "uc");
  assert.equal(chamadas, 2);
});

test("autorização pendente nunca vira sucesso em um retorno posterior", async () => {
  let chamadas = 0;
  const concluir = criarConclusorEmail(async () => ++chamadas === 1
    ? { pronto: false, message: "Conclua a autorização" }
    : { pronto: true, unidade: { id: "uc" } });
  await assert.rejects(concluir("estado"), /Conclua a autorização/);
  assert.equal((await concluir("estado")).unidade?.id, "uc");
});
