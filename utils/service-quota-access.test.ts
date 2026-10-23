import assert from "node:assert/strict";
import { test } from "node:test";
import { canViewServiceQuotas } from "./service-quota-access";
const own = "00000000-0000-4000-8000-000000000001";
test("service quota menu is limited to platform ADM, including promoted ADM; never ordinary collaborators or partner tenants", () => {
  assert.equal(canViewServiceQuotas({ perfil:"ADMIN",papel_empresa:"ADMIN_EMPRESA",empresa_id:own }),true);
  assert.equal(canViewServiceQuotas({ perfil:"GESTOR",papel_empresa:"GESTOR",empresa_id:own }),false);
  assert.equal(canViewServiceQuotas({ perfil:"ADMIN",papel_empresa:"COLABORADOR_COMERCIAL",empresa_id:own }),false);
  assert.equal(canViewServiceQuotas({ perfil:"ADMIN",papel_empresa:"ADMIN_EMPRESA",empresa_id:"other" }),false);
  assert.equal(canViewServiceQuotas(null),false);
});
