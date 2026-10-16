import test from "node:test";
import assert from "node:assert/strict";
process.env.SUPABASE_URL = "http://127.0.0.1:9";
process.env.SUPABASE_SERVICE_KEY = "test-only-not-a-real-key";
test("operação restringe energia, receita e meses à usina da empresa", async () => {
  const { supabase } = await import("../../config/supabase");
  const { obterResumoOperacao, listarFechamentos } = await import("./fechamentos.repository");
  const original = supabase.from;
  const datasets: Record<string, any[]> = {
    usinas: [{ id: "a", empresa_id: "empresa" }, { id: "b", empresa_id: "empresa" }],
    fechamentos: [{ id: "fa", empresa_id: "empresa", usina_id: "a", competencia: "2026-10-01", energia_gerada: 100, energia_alocada: 80 }, { id: "fb", empresa_id: "empresa", usina_id: "b", competencia: "2026-09-01", energia_gerada: 900 }],
    faturas: [{ empresa_id: "empresa", usina_id: "a", referencia: "OUT/2026", valor_total: 70 }, { empresa_id: "empresa", usina_id: "b", referencia: "SET/2026", valor_total: 999 }],
  };
  (supabase as any).from = (table: string) => {
    let rows = datasets[table] ?? [];
    const q: any = { select: () => q, order: () => q,
      eq: (key: string, value: string) => { rows = rows.filter(r => r[key] === value); return q; },
      then: (done: any) => Promise.resolve({ data: rows, error: null }).then(done) };
    return q;
  };
  try {
    const resumo = await obterResumoOperacao("empresa", undefined, "a");
    assert.equal(resumo.energiaGerada, 100);
    assert.equal(resumo.receitaPrevista, 70);
    assert.equal(resumo.totalUsinas, 1);
    assert.deepEqual(resumo.competencias, ["2026-10"]);
    assert.deepEqual((await listarFechamentos("empresa", "a")).map(r => r.id), ["fa"]);
    assert.equal((await obterResumoOperacao("outra", undefined, "a")).totalFaturas, 0);
  } finally { supabase.from = original; }
});
