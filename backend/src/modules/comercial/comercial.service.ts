import { supabase } from "../../config/supabase";
import { asaasComercialConfigurado, asaasComercialRequest } from "./asaasComercial.client";
import { conferirSenha } from "../../utils/password";
import { criptografarDado, descriptografarDado } from "../../utils/sensitiveData";
import { empresaIdDoUsuario } from "../../config/empresa";
import { mercadoPagoComercialRequest } from "./mercadoPagoComercial.client";
import { provedorPagamentoComercial } from "./provedorPagamento";

const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const isoDate = (value: unknown) => {
  const text = String(value ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text))
    throw new Error("Informe uma data válida.");
  return text;
};

export async function listarPlanosPublicos() {
  const { data, error } = await supabase.from("planos_geradores").select("id,nome,descricao,valor_mensal,valor_anual,limite_usinas,limite_clientes,recursos").eq("ativo", true).order("valor_mensal");
  if (error) throw error;
  return data ?? [];
}

const mascararChave = (value:string) => value.length <= 6 ? "***" : `${value.slice(0,2)}***${value.slice(-4)}`;
const chaveComercial = (carteira:any) => carteira?.pix_chave_criptografada ? descriptografarDado(carteira.pix_chave_criptografada) : "";
async function carteiraComercial(usuario:any) { const existing=await supabase.from("carteira_comercial_assinaturas").select("*").eq("usuario_id",usuario.id).maybeSingle(); if(existing.error)throw existing.error;if(existing.data)return existing.data;const created=await supabase.from("carteira_comercial_assinaturas").insert({usuario_id:usuario.id}).select().single();if(created.error)throw created.error;return created.data; }

export async function obterFinanceiroAssinaturas(usuario:any) {
  const carteira = await carteiraComercial(usuario);
  const { data: transferencias, error } = await supabase.from("asaas_transferencias").select("id,valor,status,destino_mascarado,modalidade,criado_em,atualizado_em").eq("solicitada_por", usuario.id).eq("modalidade", "ASSINATURA").order("criado_em", { ascending:false });
  if (error) throw error;
  const balance = asaasComercialConfigurado() ? await asaasComercialRequest<any>("/finance/balance").catch(() => null) : null;
  return { asaasConectado:asaasComercialConfigurado(), saldoDisponivel:Number(balance?.balance ?? 0), transferenciaAutomatica:Boolean(carteira.transferencia_automatica), pixTipo:carteira.pix_tipo, pixChaveMascarada:chaveComercial(carteira)?mascararChave(chaveComercial(carteira)):null, transferencias:transferencias??[] };
}

export async function atualizarFinanceiroAssinaturas(usuario:any,input:any) {
  if (!(await conferirSenha(String(input.senhaAtual??""),String(usuario.senha??"")))) throw new Error("Confirme sua senha para alterar o financeiro das assinaturas.");
  const carteira=await carteiraComercial(usuario); const pixTipo=String(input.pixTipo??carteira.pix_tipo??"").toUpperCase(); const pix=String(input.pixChave??chaveComercial(carteira)).trim();
  if (pixTipo&&!['CPF','CNPJ','EMAIL','PHONE','EVP'].includes(pixTipo)) throw new Error("Tipo de chave Pix inválido.");
  if (input.transferenciaAutomatica===true&&(!pixTipo||!pix)) throw new Error("Cadastre a chave Pix comercial antes de ativar a transferência automática.");
  const result=await supabase.from("carteira_comercial_assinaturas").update({pix_tipo:pixTipo||null,pix_chave_criptografada:pix?criptografarDado(pix):null,transferencia_automatica:Boolean(input.transferenciaAutomatica),atualizado_em:new Date().toISOString()}).eq("id",carteira.id);if(result.error)throw result.error;
  return obterFinanceiroAssinaturas(usuario);
}

export async function transferirFinanceiroAssinaturas(usuario:any,input:any,idempotencyKey="") {
  if (!asaasComercialConfigurado()) throw new Error("A conta Asaas comercial ainda não está conectada.");
  if (String(input.confirmacao??"")!=="TRANSFERIR") throw new Error("Confirme a transferência para continuar.");
  if (!(await conferirSenha(String(input.senhaAtual??""),String(usuario.senha??"")))) throw new Error("Senha atual incorreta.");
  const carteira=await carteiraComercial(usuario); const pix=chaveComercial(carteira); const valor=Math.round(Number(input.valor??0)*100)/100;
  if (!pix||!carteira.pix_tipo) throw new Error("Cadastre a chave Pix do financeiro das assinaturas.");
  const resumo=await obterFinanceiroAssinaturas(usuario); if (!(valor>0)||valor>resumo.saldoDisponivel) throw new Error("Valor indisponível para transferência.");
  const key=String(idempotencyKey).trim().slice(0,200)||crypto.randomUUID();
  const { data:existing }=await supabase.from("asaas_transferencias").select("*").eq("idempotency_key",key).maybeSingle(); if(existing)return existing;
  const { data:intent,error }=await supabase.from("asaas_transferencias").insert({empresa_id:empresaIdDoUsuario(usuario),gerador_carteira_id:null,solicitada_por:usuario.id,asaas_transfer_id:`intent:${crypto.randomUUID()}`,valor,status:"AUTHORIZING",destino_mascarado:`${carteira.pix_tipo}:${mascararChave(pix)}`,modalidade:"ASSINATURA",idempotency_key:key}).select().single(); if(error)throw error;
  try { const transfer=await asaasComercialRequest<any>("/transfers",{method:"POST",body:JSON.stringify({value:valor,pixAddressKey:pix,pixAddressKeyType:carteira.pix_tipo,operationType:"PIX",description:"Transferência de recebimentos das assinaturas Andrade Energy",externalReference:String(intent.id)})}); const result=await supabase.from("asaas_transferencias").update({asaas_transfer_id:transfer.id,status:transfer.status,atualizado_em:new Date().toISOString()}).eq("id",intent.id).select().single(); if(result.error)throw result.error; return result.data; } catch(error){await supabase.from("asaas_transferencias").update({status:"REFUSED",atualizado_em:new Date().toISOString()}).eq("id",intent.id);throw error;}
}

export async function transferirAutomaticamenteAssinatura(payment:any) {
  if (!asaasComercialConfigurado()) return null;
  const { data:carteira }=await supabase.from("carteira_comercial_assinaturas").select("*").eq("transferencia_automatica",true).limit(1).maybeSingle();
  const pix=chaveComercial(carteira); const valor=Math.round(Number(payment?.netValue??payment?.value??0)*100)/100;
  if(!carteira||!pix||!carteira.pix_tipo||!(valor>0))return null;
  const eventKey=`assinatura:${payment.id}`; const {data:existing}=await supabase.from("asaas_transferencias").select("*").eq("idempotency_key",eventKey).maybeSingle();if(existing)return existing;
  const {data:usuario}=await supabase.from("usuarios").select("id,empresa_id").eq("id",carteira.usuario_id).single();if(!usuario)return null;
  const {data:intent,error}=await supabase.from("asaas_transferencias").insert({empresa_id:empresaIdDoUsuario(usuario),gerador_carteira_id:null,solicitada_por:usuario.id,asaas_transfer_id:`intent:${crypto.randomUUID()}`,valor,status:"AUTHORIZING",destino_mascarado:`${carteira.pix_tipo}:${mascararChave(pix)}`,modalidade:"ASSINATURA",idempotency_key:eventKey}).select().single();if(error)throw error;
  try{const transfer=await asaasComercialRequest<any>("/transfers",{method:"POST",body:JSON.stringify({value:valor,pixAddressKey:pix,pixAddressKeyType:carteira.pix_tipo,operationType:"PIX",description:"Transferência automática de assinatura Andrade Energy",externalReference:String(intent.id)})});return (await supabase.from("asaas_transferencias").update({asaas_transfer_id:transfer.id,status:transfer.status,atualizado_em:new Date().toISOString()}).eq("id",intent.id).select().single()).data;}catch(error){await supabase.from("asaas_transferencias").update({status:"REFUSED",atualizado_em:new Date().toISOString()}).eq("id",intent.id);throw error;}
}

export async function obterPainelComercial(usuario?: any) {
  if (String(usuario?.papel_empresa ?? "") === "COLABORADOR_COMERCIAL") {
    const [{ data: geradores, error }, { data: documentos, error: documentosError }] = await Promise.all([
      supabase.from("usuarios").select("id,nome,email,cpf,telefone,ativo,perfil,created_at").in("perfil", ["ADMIN", "GESTOR"]).eq("ativo", true).order("nome"),
      supabase.from("documentos_comerciais").select("id,tipo,titulo,versao,ativo,publicado_em,criado_em").order("criado_em", { ascending: false }),
    ]);
    if (error) throw error;
    if (documentosError) throw documentosError;
    return { resumo: { total: geradores?.length ?? 0, ativas: 0, inadimplentes: 0, receitaMensalPrevista: 0 }, financeiro: null, planos: [], assinaturas: [], cobrancas: [], documentos: documentos ?? [], geradores: geradores ?? [], acessoColaborador: true };
  }
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

export async function arquivarAssinatura(id: string, arquivada: boolean) {
  const { data: atual, error: erroBusca } = await supabase
    .from("assinaturas_geradores")
    .select("id,status")
    .eq("id", id)
    .single();
  if (erroBusca || !atual) throw new Error("Assinatura não encontrada.");
  if (arquivada && atual.status !== "CANCELADA")
    throw new Error("Cancele a assinatura antes de arquivá-la.");
  const { data, error } = await supabase
    .from("assinaturas_geradores")
    .update({
      arquivada_em: arquivada ? new Date().toISOString() : null,
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
  const customers = await asaasComercialRequest<any>(
    `/customers?cpfCnpj=${digits(gerador.cpf)}`,
  );
  const dadosClienteAsaas = {
    name: gerador.nome,
    cpfCnpj: digits(gerador.cpf),
    email: gerador.email || undefined,
    mobilePhone: digits(gerador.telefone) || undefined,
    externalReference: gerador.id,
    notificationDisabled: true,
  };
  const clienteExistente = customers.data?.[0];
  const customer = clienteExistente?.id
    ? await asaasComercialRequest<any>(`/customers/${clienteExistente.id}`, {
        method: "PUT",
        body: JSON.stringify(dadosClienteAsaas),
      })
    : await asaasComercialRequest<any>("/customers", {
        method: "POST",
        body: JSON.stringify(dadosClienteAsaas),
      });
  const dueDate = isoDate(
    assinatura.proximo_vencimento ??
      new Date(Date.now() + 7 * 86400000).toISOString(),
  );
  const competencia = dueDate.slice(0, 7);
  const payment = await asaasComercialRequest<any>("/payments", {
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
    asaasComercialRequest<any>(`/payments/${payment.id}/pixQrCode`).catch(() => null),
    asaasComercialRequest<any>(`/payments/${payment.id}/identificationField`).catch(
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

const tiposTermosAssinatura = ["TERMOS_USO", "POLITICA_PRIVACIDADE", "POLITICA_CANCELAMENTO"] as const;

export async function obterTermosAssinatura() {
  const { data, error } = await supabase
    .from("documentos_comerciais")
    .select("id,tipo,titulo,versao,conteudo,publicado_em")
    .in("tipo", [...tiposTermosAssinatura])
    .eq("ativo", true)
    .not("publicado_em", "is", null)
    .order("publicado_em", { ascending: false });
  if (error) throw error;
  const documentos = tiposTermosAssinatura.map((tipo) =>
    (data ?? []).find((documento: any) => documento.tipo === tipo),
  ).filter(Boolean);
  const prontos = documentos.length === tiposTermosAssinatura.length &&
    documentos.every((documento: any) =>
      !/deve ser revisad|revis[aã]o jur[ií]dica|antes da comercializa|vers[aã]o definitiva/i.test(String(documento.conteudo)),
    );
  return {
    pronto: prontos,
    documentos: prontos ? documentos : [],
    mensagem: prontos ? null : "Os termos da assinatura ainda não foram publicados em versão definitiva.",
  };
}

export async function criarCheckoutRecorrente(usuario: any, input: any, origem: { ip?: string; userAgent?: string } = {}) {
  const { assinatura } = await obterMinhaAssinatura(String(usuario.id));
  if (!assinatura)
    throw new Error("Nenhuma assinatura ativa foi vinculada a esta conta.");
  if (["CANCELADA", "SUSPENSA"].includes(String(assinatura.status)))
    throw new Error("Esta assinatura não permite iniciar um pagamento recorrente.");
  if (!digits(usuario.cpf))
    throw new Error("Cadastre o CPF/CNPJ do gerador antes de ativar a cobrança.");
  const termos = await obterTermosAssinatura();
  if (!termos.pronto)
    throw new Error(termos.mensagem ?? "Termos da assinatura indisponíveis.");
  const aceites = Array.isArray(input?.aceitesDocumentoIds) ? input.aceitesDocumentoIds : [];
  if (termos.documentos.some((documento: any) => !aceites.includes(documento.id)))
    throw new Error("Leia e aceite os termos da assinatura antes de continuar.");
  const { error: aceiteError } = await supabase.from("aceites_documentos_comerciais").upsert(
    termos.documentos.map((documento: any) => ({
      documento_id: documento.id,
      usuario_id: usuario.id,
      assinatura_id: assinatura.id,
      ip: origem.ip ?? null,
      user_agent: origem.userAgent ?? null,
    })),
    { onConflict: "documento_id,usuario_id", ignoreDuplicates: true },
  );
  if (aceiteError) throw aceiteError;
  const billingTypes = Array.isArray(input?.formasPagamento)
    ? input.formasPagamento.filter((item: string) =>
        ["CREDIT_CARD", "PIX"].includes(String(item).toUpperCase()),
      )
    : ["CREDIT_CARD"];
  if (!billingTypes.length)
    throw new Error("Escolha cartão para a recorrência.");
  const parcelamentoAnual = assinatura.ciclo === "ANUAL" && input?.parcelamentoAnual === true;
  const parcelas = parcelamentoAnual
    ? Math.min(12, Math.max(2, Number(input?.parcelas) || 12))
    : 1;
  const site = String(
    process.env.PORTAL_WEB_URL ?? "https://andradeenergy.com.br",
  ).replace(/\/$/, "");
  const nextDueDate = isoDate(
    assinatura.proximo_vencimento ??
      new Date(Date.now() + 7 * 86400000).toISOString(),
  );
  const provedor = provedorPagamentoComercial();
  // A API de recorrência do Mercado Pago não parcela uma anuidade como o
  // checkout avulso. Enquanto esse segundo fluxo não for homologado, o anual
  // parcelado permanece no Asaas para não prometer parcelas inexistentes.
  if (provedor === "MERCADO_PAGO" && !parcelamentoAnual) {
    const preapproval = await mercadoPagoComercialRequest<any>("/preapproval", {
      method: "POST",
      headers: { "X-Idempotency-Key": `assinatura-${assinatura.id}` },
      body: JSON.stringify({
        reason: `${assinatura.plano?.nome ?? "Licença Andrade Energy"} · ciclo ${String(assinatura.ciclo).toLowerCase()}`,
        external_reference: `assinatura:${assinatura.id}`,
        payer_email: usuario.email,
        auto_recurring: {
          frequency: assinatura.ciclo === "ANUAL" ? 12 : 1,
          frequency_type: "months",
          start_date: new Date(`${nextDueDate}T12:00:00-03:00`).toISOString(),
          transaction_amount: Number(assinatura.valor_contratado),
          currency_id: "BRL",
        },
        back_url: `${site}/gerador?assinatura=retorno`,
        status: "pending",
      }),
    });
    const url = preapproval.init_point ?? preapproval.sandbox_init_point;
    if (!url) throw new Error("O Mercado Pago criou a assinatura, mas não retornou o endereço do checkout.");
    const { error: saveError } = await supabase
      .from("assinaturas_geradores")
      .update({
        provedor_pagamento: "MERCADO_PAGO",
        mercado_pago_preapproval_id: preapproval.id,
        forma_pagamento: "CREDIT_CARD",
        parcelas_cartao: parcelas,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", assinatura.id);
    if (saveError) throw saveError;
    return {
      url,
      checkoutId: preapproval.id,
      assinaturaId: assinatura.id,
      provedor: "MERCADO_PAGO",
      modalidade: parcelamentoAnual ? "ANUAL_PARCELADO" : "RECORRENTE",
      parcelas,
    };
  }
  if (provedor === "MERCADO_PAGO" && parcelamentoAnual && !asaasComercialConfigurado()) {
    throw new Error("O parcelamento anual ainda depende do Asaas até a homologação do checkout avulso do Mercado Pago.");
  }
  const checkout = await asaasComercialRequest<any>("/checkouts", {
    method: "POST",
    body: JSON.stringify({
      // O Checkout Asaas aceita apenas cartão em cobranças RECURRENT.
      // PIX exige uma cobrança avulsa e não renova a assinatura.
      billingTypes: ["CREDIT_CARD"],
      chargeTypes: parcelamentoAnual ? ["DETACHED", "INSTALLMENT"] : ["RECURRENT"],
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
      ...(parcelamentoAnual
        ? { installment: { maxInstallmentCount: parcelas } }
        : {
            subscription: {
              cycle: assinatura.ciclo === "ANUAL" ? "YEARLY" : "MONTHLY",
              nextDueDate: `${nextDueDate} 12:00:00`,
            },
          }),
    }),
  });
  const url = checkout.url ?? checkout.checkoutUrl ?? checkout.link;
  if (!url)
    throw new Error(
      "O Asaas criou o checkout, mas não retornou o endereço de pagamento.",
    );
  const { error: saveError } = await supabase
    .from("assinaturas_geradores")
    .update({
      provedor_pagamento: "ASAAS",
      asaas_checkout_id: checkout.id,
      forma_pagamento: parcelamentoAnual ? "CREDIT_CARD" : assinatura.forma_pagamento,
      parcelas_cartao: parcelas,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", assinatura.id);
  if (saveError) throw saveError;
  return {
    url,
    checkoutId: checkout.id,
    assinaturaId: assinatura.id,
    provedor: "ASAAS",
    modalidade: parcelamentoAnual ? "ANUAL_PARCELADO" : "RECORRENTE",
    parcelas,
  };
}
