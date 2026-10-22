import test, { mock } from "node:test";
import assert from "node:assert/strict";
process.env.SUPABASE_URL = "https://test.invalid";
process.env.SUPABASE_SERVICE_KEY = "test-placeholder";
test("ações delegadas recusam permissão ausente antes de consultar banco ou enviar mensagens", async () => {
  const { supabase } = await import("../../config/supabase.js");
  const { editarContatoGerador, enviarDocumentoAprovado, lembrarCobranca } = await import("./delegacaoComercial.service.js");
  let chamadas = 0;
  mock.method(supabase, "from", (()=>{chamadas++;throw new Error("consulta inesperada");}) as any);
  const usuario = { empresa_id:"00000000-0000-4000-8000-000000000001", perfil:"GESTOR", papel_empresa:"COLABORADOR_COMERCIAL", permissoes:{} };
  try {
    await assert.rejects(editarContatoGerador(usuario,"alvo",{nome:"Teste Gerador",telefone:"35999999999"}),/não liberada/);
    await assert.rejects(enviarDocumentoAprovado(usuario,"documento","alvo"),/não liberada/);
    await assert.rejects(lembrarCobranca(usuario,"cobranca"),/não liberada/);
    await assert.rejects(editarContatoGerador({...usuario,permissoes:{geradores_editar:true}},"alvo",{perfil:"ADMIN",nome:"Teste Gerador"}),/Somente nome/);
    assert.equal(chamadas,0);
  } finally {mock.restoreAll();}
});
