import assert from "node:assert/strict";
import { test } from "node:test";
import { erroRegraAutomaticaOutlook } from "./outlookRegra.policy";

test("login Microsoft concluído não confirma faturamento sem regra", () => {
  assert.ok(erroRegraAutomaticaOutlook({ status: "CONECTADO_SEM_REGRA", regra_status: "NAO_CONFIGURADA" }));
  assert.equal(erroRegraAutomaticaOutlook({ status: "CONECTADO_SEM_REGRA", regra_status: "ERRO", regra_erro: "Permissão negada" }), "Permissão negada");
});

test("somente regra ativa sem erro confirma faturamento Outlook", () => {
  assert.equal(erroRegraAutomaticaOutlook({ status: "REGRA_ATIVA", regra_status: "ATIVA", regra_erro: null }), null);
  assert.ok(erroRegraAutomaticaOutlook({ status: "REGRA_ATIVA", regra_status: "ERRO" }));
  assert.equal(erroRegraAutomaticaOutlook({ status: "REGRA_ATIVA", regra_status: "ATIVA", regra_erro: "Falha de validação" }), "Falha de validação");
});
