import { supabase } from "../../config/supabase";
import { asaasRequest } from "../asaas/asaas.client";

const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const isoDate = (value: unknown) => {
  const text = String(value ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text))
    throw new Error("Informe uma data válida.");
  return text;
};

export async function obterPainelComercial() {
  const [
    { data: planos, error: erroPlanos },
    { data: assinaturas, error: erroAssinaturas },
    { data: cobrancas, error: erroCobrancas },
    { data: documentos, error: erroDocumentos },
    { data: geradores, error: erroGeradores },
  ] = await Promise.all([
    supabase.from("planos_geradores").select("*").order("valor_mensal"),
    supabase
      .from("assinaturas_geradores")
      .select(
        "*, plano:planos_geradores!assinaturas_geradores_plano_id_fkey(*), gerador:usuarios!assinaturas_geradores_gerador_id_fkey(id,nome,email,cpf,telefone,ativo,created_at)",
      )
      .order("criado_em", { ascending: false }),
    supabase
      .from("cobrancas_assinaturas_geradores")
      .select("*")
      .order("vencimento", { ascending: false }),
    supabase
      .from("documentos_comerciais")
      .select("id,tipo,titulo,versao,ativo,publicado_em,criado_em")
      .order("criado_em", { ascending: false }),
    supabase
      .from("usuarios")
      .select("id,nome,email,cpf,telefone,ativo,perfil,usina_id,created_at")
      .in("perfil", ["ADMIN", "GESTOR"])
      .eq("ativo", true)
      .order("nome"),
  ]);
  if (erroPlanos) throw erroPlanos;
  if (erroAssinaturas) throw erroAssinaturas;
  if (erroCobrancas) throw erroCobrancas;
  if (erroDocumentos) throw erroDocumentos;
  if (erroGeradores) throw erroGeradores;
  const lista = assinaturas ?? [];
  const usinaIds = [
    ...new Set(
      (geradores ?? []).map((item: any) => item.usina_id).filter(Boolean),
    ),
  ];
  let unidadesPorUsina = new Map<string, number>();
  if (usinaIds.length) {
    const { data: unidades, error: erroUnidades } = await supabase
      .from("unidades_consumidoras")
      .select("usina_id,status,cliente_id")
      .in("usina_id", usinaIds)
      .not("cliente_id", "is", null);
    if (erroUnidades && erroUnidades.code !== "42P01") throw erroUnidades;
    unidadesPorUsina = new Map(
      usinaIds.map((id) => [
        String(id),
        (unidades ?? []).filter(
          (item: any) =>
            String(item.usina_id) === String(id) &&
            ["ATIVA", "ATIVO"].includes(String(item.status ?? "ATIVA")),
        ).length,
      ]),
    );
  }
  const listaGeradores = (geradores ?? []).map((item: any) => ({
    ...item,
    total_usinas: item.usina_id ? 1 : 0,
    total_ucs_ativas: item.usina_id
      ? (unidadesPorUsina.get(String(item.usina_id)) ?? 0)
      : 0,
  }));
  const listaCobrancas = (cobrancas ?? []).map((cobranca: any) => {
    const assinatura = lista.find(
      (item: any) => item.id === cobranca.assinatura_id,
    );
    return {
      ...cobranca,
      assinatura: assinatura
        ? {
            id: assinatura.id,
            ciclo: assinatura.ciclo,
            gerador: assinatura.gerador,
            plano: assinatura.plano,
          }
        : null,
    };
  });
  const competenciaAtual = new Date().toISOString().slice(0, 7);
  const cobrancasDoMes = listaCobrancas.filter(
    (item: any) => item.competencia === competenciaAtual,
  );
  const somar = (items: any[]) =>
    items.reduce(
      (total: number, item: any) => total + Number(item.valor ?? 0),
      0,
    );
  return {
    resumo: {
      total: lista.length,
      ativas: lista.filter((item: any) =>
        ["ATIVA", "TESTE"].includes(item.status),
      ).length,
      inadimplentes: lista.filter((item: any) => item.status === "INADIMPLENTE")
        .length,
      receitaMensalPrevista: lista
        .filter((item: any) => item.status === "ATIVA")
        .reduce(
          (total: number, item: any) =>
            total +
            (item.ciclo === "ANUAL"
              ? Number(item.valor_contratado) / 12
              : Number(item.valor_contratado)),
          0,
        ),
    },
    financeiro: {
      competencia: competenciaAtual,
      recebidoNoMes: somar(
        cobrancasDoMes.filter((item: any) => item.status === "PAGA"),
      ),
      pendenteNoMes: somar(
        cobrancasDoMes.filter((item: any) => item.status === "PENDENTE"),
      ),
      vencidoNoMes: somar(
        cobrancasDoMes.filter((item: any) => item.status === "VENCIDA"),
      ),
      totalRecebido: somar(
        listaCobrancas.filter((item: any) => item.status === "PAGA"),
      ),
      cobrancasPendentes: listaCobrancas.filter(
        (item: any) => item.status === "PENDENTE",
      ).length,
      cobrancasVencidas: listaCobrancas.filter(
        (item: any) => item.status === "VENCIDA",
      ).length,
    },
    planos: planos ?? [],
    assinaturas: lista,
    cobrancas: listaCobrancas,
    documentos: documentos ?? [],
    geradores: listaGeradores,
  };
}

export async function salvarPlano(id: string | undefined, input: any) {
  const nome = String(input?.nome ?? "").trim();
  const valorMensal = Number(input?.valorMensal);
  const valorAnual = Number(input?.valorAnual);
  if (!nome || valorMensal < 0 || valorAnual < 0)
    throw new Error("Informe nome e valores válidos para o plano.");
  const payload = {
    nome,
    descricao: String(input?.descricao ?? "").trim() || null,
    valor_mensal: valorMensal,
    valor_anual: valorAnual,
    limite_usinas: input?.limiteUsinas ? Number(input.limiteUsinas) : null,
    limite_clientes: input?.limiteClientes
      ? Number(input.limiteClientes)
      : null,
    recursos: Array.isArray(input?.recursos) ? input.recursos : [],
    ativo: input?.ativo !== false,
    atualizado_em: new Date().toISOString(),
  };
  const query = id
    ? supabase.from("planos_geradores").update(payload).eq("id", id)
    : supabase.from("planos_geradores").insert(payload);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export async function contratarPlano(input: any, adminId: string) {
  const geradorId = String(input?.geradorId ?? "");
  const planoId = String(input?.planoId ?? "");
  const ciclo = String(input?.ciclo ?? "MENSAL").toUpperCase();
  if (!geradorId || !planoId || !["MENSAL", "ANUAL"].includes(ciclo))
    throw new Error("Informe gerador, plano e ciclo.");
  const [{ data: gerador }, { data: plano }] = await Promise.all([
    supabase
      .from("usuarios")
      .select("id,perfil,cpf")
      .eq("id", geradorId)
      .in("perfil", ["GESTOR", "ADMIN"])
      .maybeSingle(),
    supabase
      .from("planos_geradores")
      .select("*")
      .eq("id", planoId)
      .eq("ativo", true)
      .maybeSingle(),
  ]);
  if (!gerador) throw new Error("Gerador não encontrado.");
  if (!plano) throw new Error("Plano não encontrado ou inativo.");
  const diasTesteSolicitados =
    input?.diasTeste === undefined
      ? 45
      : Math.max(0, Number(input.diasTeste) || 0);
  const cpfGerador = digits(gerador.cpf);
  let testeAnterior = false;
  if (diasTesteSolicitados > 0 && cpfGerador) {
    const { data: usuariosMesmoCpf, error: erroUsuariosCpf } = await supabase
      .from("usuarios")
      .select("id,cpf");
    if (erroUsuariosCpf) throw erroUsuariosCpf;
    const idsMesmoCpf = (usuariosMesmoCpf ?? [])
      .filter((item: any) => digits(item.cpf) === cpfGerador)
      .map((item: any) => item.id);
    if (idsMesmoCpf.length) {
      const { data: testes, error: erroTestes } = await supabase
        .from("assinaturas_geradores")
        .select("id")
        .in("gerador_id", idsMesmoCpf)
        .not("fim_teste_em", "is", null)
        .limit(1);
      if (erroTestes) throw erroTestes;
      testeAnterior = Boolean(testes?.length);
    }
  }
  const diasTeste = testeAnterior ? 0 : diasTesteSolicitados;
  const fimTeste =
    diasTeste > 0
      ? new Date(Date.now() + diasTeste * 86400000).toISOString().slice(0, 10)
      : null;
  const inicioEm = isoDate(input?.inicioEm ?? new Date().toISOString());
  await supabase
    .from("assinaturas_geradores")
    .update({
      status: "CANCELADA",
      cancelada_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    })
    .eq("gerador_id", geradorId)
    .in("status", ["TESTE", "ATIVA", "INADIMPLENTE", "SUSPENSA"]);
  const payload = {
    gerador_id: geradorId,
    plano_id: planoId,
    ciclo,
    status: diasTeste > 0 ? "TESTE" : "ATIVA",
    forma_pagamento: String(input?.formaPagamento ?? "BOLETO").toUpperCase(),
    valor_contratado:
      ciclo === "ANUAL" ? plano.valor_anual : plano.valor_mensal,
    inicio_em: inicioEm,
    proximo_vencimento: isoDate(
      testeAnterior
        ? inicioEm
        : (input?.proximoVencimento ?? fimTeste ?? inicioEm),
    ),
    fim_teste_em: fimTeste,
    observacoes: String(input?.observacoes ?? "").trim() || null,
    criado_por: adminId,
  };
  const { data, error } = await supabase
    .from("assinaturas_geradores")
    .insert(payload)
    .select(
      "*, plano:planos_geradores!assinaturas_geradores_plano_id_fkey(*), gerador:usuarios!assinaturas_geradores_gerador_id_fkey(id,nome,email,cpf,telefone,ativo)",
    )
    .single();
  if (error) throw error;
  return {
    ...data,
    teste_concedido: diasTeste > 0,
    dias_teste_concedidos: diasTeste,
  };
}

export async function alterarStatusAssinatura(id: string, status: string) {
  const normalized = String(status).toUpperCase();
  if (!["ATIVA", "INADIMPLENTE", "SUSPENSA", "CANCELADA"].includes(normalized))
    throw new Error("Status de assinatura inválido.");
  const { data, error } = await supabase
    .from("assinaturas_geradores")
    .update({
      status: normalized,
      cancelada_em:
        normalized === "CANCELADA" ? new Date().toISOString() : null,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function gerarCobrancaAssinatura(id: string) {
  const { data: assinatura, error } = await supabase
    .from("assinaturas_geradores")
    .select("*, gerador:usuarios!assinaturas_geradores_gerador_id_fkey(*)")
    .eq("id", id)
    .single();
  if (error || !assinatura) throw new Error("Assinatura não encontrada.");
  if (["CANCELADA", "SUSPENSA"].includes(assinatura.status))
    throw new Error("Esta assinatura não permite novas cobranças.");
  const gerador: any = Array.isArray(assinatura.gerador)
    ? assinatura.gerador[0]
    : assinatura.gerador;
  if (!digits(gerador?.cpf))
    throw new Error("Cadastre o CPF/CNPJ do gerador antes de cobrar.");
  const customers = await asaasRequest<any>(
    `/customers?cpfCnpj=${digits(gerador.cpf)}`,
  );
  const customer =
    customers.data?.[0] ??
    (await asaasRequest<any>("/customers", {
      method: "POST",
      body: JSON.stringify({
        name: gerador.nome,
        cpfCnpj: digits(gerador.cpf),
        email: gerador.email || undefined,
        mobilePhone: digits(gerador.telefone) || undefined,
        externalReference: gerador.id,
      }),
    }));
  const dueDate = isoDate(
    assinatura.proximo_vencimento ??
      new Date(Date.now() + 7 * 86400000).toISOString(),
  );
  const competencia = dueDate.slice(0, 7);
  const payment = await asaasRequest<any>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: customer.id,
      billingType:
        assinatura.forma_pagamento === "UNDEFINED"
          ? "BOLETO"
          : assinatura.forma_pagamento,
      value: Number(assinatura.valor_contratado),
      dueDate,
      description: `Licença Andrade Energy · ${assinatura.ciclo.toLowerCase()}`,
      externalReference: `assinatura:${assinatura.id}:${competencia}`,
    }),
  });
  const [pix, boleto] = await Promise.all([
    asaasRequest<any>(`/payments/${payment.id}/pixQrCode`).catch(() => null),
    asaasRequest<any>(`/payments/${payment.id}/identificationField`).catch(
      () => null,
    ),
  ]);
  const { data, error: saveError } = await supabase
    .from("cobrancas_assinaturas_geradores")
    .upsert(
      {
        assinatura_id: id,
        competencia,
        vencimento: dueDate,
        valor: assinatura.valor_contratado,
        status: "PENDENTE",
        asaas_payment_id: payment.id,
        invoice_url: payment.invoiceUrl ?? null,
        bank_slip_url: payment.bankSlipUrl ?? payment.invoiceUrl ?? null,
        pix_payload: pix?.payload ?? null,
        linha_digitavel: boleto?.identificationField ?? null,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "assinatura_id,competencia" },
    )
    .select()
    .single();
  if (saveError) throw saveError;
  return data;
}

export async function listarCobrancasAssinatura(id: string) {
  const { data, error } = await supabase
    .from("cobrancas_assinaturas_geradores")
    .select("*")
    .eq("assinatura_id", id)
    .order("vencimento", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function obterMinhaAssinatura(geradorId: string) {
  const { data: assinatura, error } = await supabase
    .from("assinaturas_geradores")
    .select(
      "*, plano:planos_geradores!assinaturas_geradores_plano_id_fkey(*), cobrancas:cobrancas_assinaturas_geradores!cobrancas_assinaturas_geradores_assinatura_id_fkey(*)",
    )
    .eq("gerador_id", geradorId)
    .neq("status", "CANCELADA")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const { data: planos, error: plansError } = await supabase
    .from("planos_geradores")
    .select("*")
    .eq("ativo", true)
    .order("valor_mensal");
  if (plansError) throw plansError;
  return { assinatura: assinatura ?? null, planos: planos ?? [] };
}

export async function criarCheckoutRecorrente(usuario: any, input: any) {
  const { assinatura } = await obterMinhaAssinatura(String(usuario.id));
  if (!assinatura)
    throw new Error("Nenhuma assinatura ativa foi vinculada a esta conta.");
  const billingTypes = Array.isArray(input?.formasPagamento)
    ? input.formasPagamento.filter((item: string) =>
        ["CREDIT_CARD", "PIX"].includes(String(item).toUpperCase()),
      )
    : ["CREDIT_CARD"];
  if (!billingTypes.length)
    throw new Error("Escolha cartão ou Pix para a recorrência.");
  const site = String(
    process.env.PORTAL_WEB_URL ?? "https://andradeenergy.com.br",
  ).replace(/\/$/, "");
  const nextDueDate = isoDate(
    assinatura.proximo_vencimento ??
      new Date(Date.now() + 7 * 86400000).toISOString(),
  );
  const checkout = await asaasRequest<any>("/checkouts", {
    method: "POST",
    body: JSON.stringify({
      billingTypes,
      chargeTypes: ["RECURRENT"],
      minutesToExpire: 1440,
      externalReference: `assinatura:${assinatura.id}`,
      callback: {
        successUrl: `${site}/gerador?assinatura=sucesso`,
        cancelUrl: `${site}/gerador?assinatura=cancelada`,
        expiredUrl: `${site}/gerador?assinatura=expirada`,
      },
      items: [
        {
          name: assinatura.plano?.nome ?? "Licença Andrade Energy",
          description: `Licença Andrade Energy · ciclo ${String(assinatura.ciclo).toLowerCase()}`,
          quantity: 1,
          value: Number(assinatura.valor_contratado),
        },
      ],
      customerData: {
        name: usuario.nome,
        cpfCnpj: digits(usuario.cpf),
        email: usuario.email || undefined,
        phone: digits(usuario.telefone) || undefined,
      },
      subscription: {
        cycle: assinatura.ciclo === "ANUAL" ? "YEARLY" : "MONTHLY",
        nextDueDate: `${nextDueDate} 12:00:00`,
      },
    }),
  });
  const url = checkout.url ?? checkout.checkoutUrl ?? checkout.link;
  if (!url)
    throw new Error(
      "O Asaas criou o checkout, mas não retornou o endereço de pagamento.",
    );
  return { url, checkoutId: checkout.id, assinaturaId: assinatura.id };
}
