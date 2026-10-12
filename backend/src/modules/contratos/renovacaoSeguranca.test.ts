import assert from "node:assert/strict";
import test from "node:test";
import { supabase } from "../../config/supabase";
import { informarNaoRenovacao, solicitarRenovacaoContrato } from "./renovacaoContrato.service";

test("decisões de renovação rejeitam outro cliente, empresa e vínculo inativo antes de gravar", async () => {
  const original = supabase.from;
  try {
    for (const acao of [informarNaoRenovacao, solicitarRenovacaoContrato]) {
      for (const caso of ["outro-cliente", "outra-empresa", "inativo"]) {
        const filtros: Record<string, unknown> = {};
        let consultas = 0;
        supabase.from = ((tabela: string) => {
          consultas++;
          assert.ok(["contratos", "empresa_usuarios"].includes(tabela), "Não deve gravar nem notificar");
          const consulta: any = {
            select() { return this; },
            eq(coluna: string, valor: unknown) { filtros[`${tabela}.${coluna}`] = valor; return this; },
            async maybeSingle() {
              if (tabela === "contratos") return { data: { id: "contrato", unidade_consumidora_id: "uc", empresa_id: "empresa-dona", cliente_id: "titular", status: "VIGENTE", aceite_cliente_em: "2026-10-01", vigencia_fim: "2099-11-10", dados_documento: {} }, error: null };
              return { data: null, error: null };
            },
          };
          return consulta;
        }) as any;
        await assert.rejects(acao("contrato", { id: caso }), /Somente o cliente/);
        assert.equal(consultas, 2);
        assert.equal(filtros["empresa_usuarios.usuario_id"], caso);
        assert.equal(filtros["empresa_usuarios.empresa_id"], "empresa-dona");
        assert.equal(filtros["empresa_usuarios.cliente_id"], "titular");
        assert.equal(filtros["empresa_usuarios.ativo"], true);
        assert.equal(filtros["empresa_usuarios.papel"], "LEITURA");
      }
    }
  } finally { supabase.from = original; }
});
