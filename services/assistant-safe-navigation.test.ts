import test from "node:test";
import assert from "node:assert/strict";
import { resolveSafeNavigation, type SafeNavigationContext } from "./assistant-safe-navigation";

const generator: SafeNavigationContext = { generator: true, role: "GESTOR", plantId: "selected-plant" };
const consumer: SafeNavigationContext = { generator: false, role: "LEITURA", unitId: "own-unit" };
test("abre áreas de leitura por pedido explícito, sem gerar ações de escrita", () => {
  for (const [question, route] of [["abra contratos", "/contratos"], ["abra operação 09/2026", "/(tabs)/operacao"], ["abra notificações", "/(tabs)"], ["abra financeiro", "/(tabs)/financeiro"], ["abra novo cliente", "/clientes/novo"]]) {
    assert.equal(resolveSafeNavigation(question, generator)?.action?.route, route);
  }
  assert.deepEqual(resolveSafeNavigation("abra operação 09/2026", generator)?.action?.params, { solarCompetencia: "2026-09" });
  assert.equal(resolveSafeNavigation("abra operação 2026-13", generator)?.action?.params, undefined);
});
test("pesquisa clientes e UCs sem transformar nomes em IDs ou endpoints", () => {
  assert.deepEqual(resolveSafeNavigation("busque cliente Rodrigo", generator)?.action?.params, { solarBusca: "rodrigo" });
  assert.deepEqual(resolveSafeNavigation("procure UC 1204584501840", generator)?.action?.params, { solarBusca: "1204584501840" });
  assert.equal(resolveSafeNavigation("abra contrato da UC 1204584501840", generator)?.action?.route, "/contratos");
});
test("aplica filtros permitidos nas faturas dos dois apps", () => {
  for (const ctx of [generator, consumer]) {
    for (const filter of ["abertas", "vencidas", "pagas"]) assert.equal(resolveSafeNavigation(`mostre faturas ${filter}`, ctx)?.action?.params?.solarFiltro, filter);
  }
});
test("consumidor não abre carteira, clientes nem cadastros do gerador", () => {
  for (const command of ["abra clientes", "abra financeiro", "abra operação", "abra comercial", "abra novo cliente"]) assert.equal(resolveSafeNavigation(command, consumer)?.action, undefined);
  assert.equal(resolveSafeNavigation("abra meu contrato", consumer)?.action?.route, "/(tabs)/contrato");
  assert.equal(resolveSafeNavigation("abra as UCs", consumer)?.action?.route, "/selecionar-unidade");
});
test("não amplia permissões de colaboradores e de seções bloqueadas", () => {
  const collaborator = { ...generator, role: "ADMIN", companyRole: "COLABORADOR_GERADOR", permissions: { clientes: false, contratos: false, unidades: false } };
  for (const command of ["abra clientes", "abra contratos", "abra unidades", "abra financeiro", "abra comercial", "abra colaboradores"]) assert.equal(resolveSafeNavigation(command, collaborator)?.action, undefined);
});
test("preserva a escolha explícita de usina e UC", () => {
  assert.equal(resolveSafeNavigation("abra faturas", { ...generator, plantId: undefined })?.action, undefined);
  assert.equal(resolveSafeNavigation("abra faturas", { ...consumer, unitId: undefined })?.action, undefined);
  assert.equal(resolveSafeNavigation("abra usinas", { ...generator, plantId: undefined })?.action?.route, "/selecionar-unidade");
});
test("perguntas, documentos e operações sensíveis não viram navegação automática", () => {
  for (const command of ["como abrir faturas", "quanto é a última fatura", "mostre o valor da fatura", "abra o PDF da última fatura", "pague minha fatura", "abra faturas e exclua todas", "cancele contrato", "altere meu email para outro@example.com", "assine o contrato", "ative a voz da Solar"]) assert.equal(resolveSafeNavigation(command, generator), undefined);
});
test("não abre links externos nem recursos desativados", () => {
  assert.equal(resolveSafeNavigation("abra https://example.com", generator)?.action, undefined);
  assert.equal(resolveSafeNavigation("abra tutoriais", generator)?.action, undefined);
});
