import test from "node:test";
import assert from "node:assert/strict";
import { collaboratorRedirect, generatorTabAllowed } from "./collaborator-navigation";
test("acesso aos ambientes não libera financeiro nem gestão de equipe", () => {
  const permissoes = { ambientes_gerador: true };
  assert.equal(collaboratorRedirect("COLABORADOR_COMERCIAL", "/selecionar-unidade", permissoes), undefined);
  assert.equal(collaboratorRedirect("COLABORADOR_COMERCIAL", "/admin/escolher-area", permissoes), undefined);
  assert.equal(generatorTabAllowed("index", "COLABORADOR_COMERCIAL", permissoes), true);
  assert.equal(generatorTabAllowed("clientes", "COLABORADOR_COMERCIAL", permissoes), false);
  assert.equal(generatorTabAllowed("clientes", "COLABORADOR_COMERCIAL", {...permissoes, gerador_clientes:true}), true);
  for (const aba of ["equipe", "financeiro"]) assert.equal(generatorTabAllowed(aba, "COLABORADOR_COMERCIAL", permissoes), false);
  for (const rota of ["/financeiro", "/financeiro/extrato", "/colaboradores", "/admin/empresas"]) assert.equal(collaboratorRedirect("COLABORADOR_COMERCIAL", rota, permissoes), "/admin/comercial");
});
test("convidados não abrem gestão de equipe por link direto ou aba", () => {
  for (const role of ["COLABORADOR_GERADOR", "COLABORADOR_COMERCIAL"]) {
    for (const path of ["/colaboradores", "/colaboradores/", "/colaboradores/index", "/equipe", "/(tabs)/equipe"]) {
      assert.equal(collaboratorRedirect(role, path), role === "COLABORADOR_COMERCIAL" ? "/admin/comercial" : "/");
    }
  }
  assert.equal(collaboratorRedirect("ADMIN_EMPRESA", "/colaboradores"), undefined);
});
test("colaborador comercial usa Comercial mesmo com rota operacional restaurada", () => {
  for (const rota of ["/", "/selecionar-unidade", "/faturas/123", "/clientes", "/(tabs)", "/colaboradores"])
    assert.equal(collaboratorRedirect("COLABORADOR_COMERCIAL", rota), "/admin/comercial");
  for (const rota of ["/admin/comercial", "/geradores/gestao", "/geradores/monitoramento", "/perfil", "/assistente", "/configuracoes-assistente"])
    assert.equal(collaboratorRedirect("COLABORADOR_COMERCIAL", rota), undefined);
});
test("abas do colaborador gerador respeitam permissões sem ferramentas do titular", () => {
  for (const aba of ["equipe", "financeiro"]) assert.equal(generatorTabAllowed(aba, "COLABORADOR_GERADOR"), false);
  assert.equal(generatorTabAllowed("clientes", "COLABORADOR_GERADOR", { clientes: false }), false);
  assert.equal(generatorTabAllowed("index", "COLABORADOR_GERADOR"), true);
  assert.equal(generatorTabAllowed("faturamento", "COLABORADOR_GERADOR", { faturas: true }), true);
  assert.equal(generatorTabAllowed("index", "COLABORADOR_COMERCIAL"), false);
  assert.equal(generatorTabAllowed("equipe", "ADMIN_EMPRESA"), true);
});
