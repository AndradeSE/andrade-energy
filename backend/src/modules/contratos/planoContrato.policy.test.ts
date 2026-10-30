import assert from "node:assert/strict";
import test from "node:test";
import { descontoInicialSemFidelidade, normalizarPlanoContrato } from "./planoContrato.policy";
import { validarConfirmacaoDesligamento, fimAvisoPrevio } from "./desligamentoContrato.policy";
import { preencherModeloContrato, renderizarModeloContrato } from "./modeloContrato";

test("descontos iniciais dependem da usina; regime desconhecido não é adivinhado", () => {
  assert.equal(descontoInicialSemFidelidade("GD1"), 20);
  assert.equal(descontoInicialSemFidelidade("GD2"), 30);
  assert.equal(descontoInicialSemFidelidade("MISTA"), null);
  assert.equal(normalizarPlanoContrato(undefined), "COM_FIDELIDADE");
  assert.throws(() => normalizarPlanoContrato("outro"));
});

const unidade = { numero: "UC-TESTE", distribuidora: "CEMIG", clientes: { nome: "Cliente teste" }, usinas: { tipo_gd: "GD2" } };
const contrato = { vigencia_inicio: "2026-10-11", vigencia_fim: "2036-10-11", desconto: 27, dados_documento: { locador_nome: "Empresa teste", prazo_anos: 10 } };

test("plano sem fidelidade tem desconto escolhido, prazo indeterminado e nenhuma multa de permanência", async () => {
  const sem = { ...contrato, vigencia_fim: null, configuracao_uc_snapshot: { plano_contrato: "SEM_FIDELIDADE", desconto_percentual: 27 } };
  const clausulas = preencherModeloContrato(unidade, sem).clausulas;
  const prazo = clausulas.find(c => c.title.includes("DO PRAZO"))!.text;
  const multa = clausulas.find(c => c.title.includes("DA MULTA RESCISÓRIA"))!.text;
  assert.match(prazo, /prazo indeterminado/);
  assert.match(prazo, /90/);
  assert.doesNotMatch(prazo, /10 ano/);
  assert.doesNotMatch(multa, /equivalente à média/);
  assert.match(multa, /Não será cobrada multa/);
  assert.match(multa, /efetivo consumo/);
  assert.match(clausulas.map(c => c.text).join("\n"), /27/);
  const pdf = await renderizarModeloContrato(unidade, sem);
  assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
});

test("contrato legado mantém prazo e multa originais", () => {
  const clausulas = preencherModeloContrato(unidade, contrato).clausulas;
  assert.match(clausulas.find(c => c.title.includes("DO PRAZO"))!.text, /10 ano/);
  assert.match(clausulas.find(c => c.title.includes("DA MULTA RESCISÓRIA"))!.text, /equivalente à média/);
});

test("encerramento exige aceite anterior e confirmação real da distribuidora", () => {
  const dados = { confirmado: true, data: "2026-10-10", protocolo: "CEMIG-TESTE" };
  assert.throws(() => validarConfirmacaoDesligamento({}, dados));
  assert.throws(() => validarConfirmacaoDesligamento({ aceito_em: "2026-10-01" }, { ...dados, confirmado: false }));
  assert.throws(() => validarConfirmacaoDesligamento({ aceito_em: "2026-10-01" }, { ...dados, data: "2026-02-30" }));
  assert.throws(() => validarConfirmacaoDesligamento({ aceito_em: "2026-10-01" }, { ...dados, data: "2099-01-01" }));
  assert.equal(validarConfirmacaoDesligamento({ aceito_em: "2026-10-01" }, dados, "2026-10-11").protocolo_desligamento, "CEMIG-TESTE");
  assert.equal(fimAvisoPrevio("2026-10-11T12:00:00Z"), "2027-01-09");
});
