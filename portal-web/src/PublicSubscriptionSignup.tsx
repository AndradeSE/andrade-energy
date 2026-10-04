import { FormEvent, useEffect, useRef, useState } from "react";
import "./subscription-signup.css";

const digits = (v: string) => v.replace(/\D/g, "");
const money = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const ufs = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

export default function PublicSubscriptionSignup({ apiUrl }: { apiUrl: string }) {
  const [plans,setPlans] = useState<any[]>([]);
  const [config,setConfig] = useState<any>(null);
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  const [cepBusy,setCepBusy] = useState(false);
  const [accepted,setAccepted] = useState(false);
  const [status,setStatus] = useState<any>(null);
  const [key] = useState(() => decodeURIComponent(window.location.hash.slice(1)) || sessionStorage.getItem("andrade_adesao_chave") || crypto.randomUUID());
  const fromCheckout = Boolean(window.location.hash);
  const [form,setForm] = useState({ nome:"", sobrenome:"", cpf:"", email:"", telefone:"", cep:"", rua:"", numero:"", complemento:"", bairro:"", cidade:"", uf:"", planoId:new URLSearchParams(window.location.search).get("plano") ?? "", ciclo:"MENSAL", parcelamentoAnual:false });
  const cepRequest = useRef(0);
  const plan = plans.find(p => p.id === form.planoId);
  const total = plan ? Number(form.ciclo === "ANUAL" ? plan.valor_anual : plan.valor_mensal) : 0;

  useEffect(() => {
    const controller = new AbortController();
    Promise.all(["planos-publicos","adesao/configuracao"].map(async path => {
      const res = await fetch(`${apiUrl}/comercial/${path}`, { signal:controller.signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Não foi possível carregar os planos.");
      return data;
    })).then(([p,c]) => { setPlans(p); setConfig(c); setForm(f=>({...f,planoId:p.some((item:any)=>item.id===f.planoId)?f.planoId:p[0]?.id??""})); })
      .catch(e=>{if(e.name!=="AbortError")setError(e.message);});
    return ()=>controller.abort();
  },[apiUrl]);

  useEffect(() => {
    if (!fromCheckout) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      try {
        const res=await fetch(`${apiUrl}/comercial/adesao/status`,{headers:{"X-Adesao-Chave":key}});
        const data=await res.json();
        if(!res.ok)throw new Error(data.message);
        if(alive){setStatus(data);setError("");}
        if(alive&&!data.conviteEnviado&&!["CANCELADO","CONCLUIDO"].includes(data.status)) timer=setTimeout(()=>void check(),5000);
      } catch(e){if(alive){setError(e instanceof Error?e.message:"Não foi possível atualizar a confirmação.");timer=setTimeout(()=>void check(),15000);}}
    };
    void check();
    return ()=>{alive=false;clearTimeout(timer);};
  },[apiUrl,fromCheckout,key]);

  async function buscarCep() {
    const cep=digits(form.cep);
    if(cep.length!==8)return;
    const request=++cepRequest.current;
    setCepBusy(true);
    try {
      const res=await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if(!res.ok)throw new Error();
      const data=await res.json();
      if(request!==cepRequest.current)return;
      if(data.erro)throw new Error();
      setForm(f=>digits(f.cep)===cep?{...f,rua:data.logradouro??"",bairro:data.bairro??"",cidade:data.localidade??"",uf:data.uf??""}:f);
      setError("");
    }catch{if(request===cepRequest.current)setError("CEP não localizado. Confira o número ou preencha o endereço manualmente.");}
    finally{if(request===cepRequest.current)setCepBusy(false);}
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if(busy||!accepted||!config?.disponivel)return;
    setBusy(true);setError("");
    sessionStorage.setItem("andrade_adesao_chave",key);
    const endereco = `Logradouro: ${form.rua.trim()}\nNúmero: ${form.numero.trim()}\nComplemento: ${form.complemento.trim()}\nBairro: ${form.bairro.trim()}\nCidade: ${form.cidade.trim()}\nUF: ${form.uf}\nCEP: ${digits(form.cep).replace(/(\d{5})(\d{3})/,"$1-$2")}`;
    try {
      const res=await fetch(`${apiUrl}/comercial/adesao/checkout`,{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":key},body:JSON.stringify({...form,endereco,aceitesDocumentoIds:config.documentos.map((d:any)=>d.id)})});
      const data=await res.json();
      if(!res.ok)throw new Error(data.message??"Não foi possível abrir o pagamento.");
      window.location.assign(data.url);
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível continuar.");setBusy(false);}
  }

  const field=(name:keyof typeof form,label:string,props:Record<string,unknown>={})=><label>{label} <span aria-hidden="true">*</span><input required autoComplete="off" {...props} value={String(form[name])} onChange={e=>setForm({...form,[name]:e.target.value})}/></label>;
  return <main className="public-signup"><header><a href="/planos">← Planos Andrade Energy</a><a href="/gerador">Já tenho conta</a></header>
    <section><small>ASSINATURA ANDRADE ENERGY</small><h1>{fromCheckout?"Confirmação da contratação":"Contrate seu plano"}</h1>
      {fromCheckout?<div className="signup-result" role="status"><h2>{status?.conviteEnviado||status?.status==="CONCLUIDO"?"Pagamento confirmado":status?.status==="PAGO"?"Preparando seu convite":status?.status==="CANCELADO"?"Contratação cancelada":"Aguardando confirmação do pagamento"}</h2>
        <p>{status?.conviteEnviado||status?.status==="CONCLUIDO"?"O convite foi enviado ao e-mail informado no cadastro. Abra-o para escolher sua senha e acessar o Gerador.":status?.status==="PAGO"?"Recebemos o pagamento. Seu convite será enviado automaticamente.":status?.status==="CANCELADO"?"O pagamento foi cancelado ou estornado.":"Esta página acompanha a confirmação do provedor. O convite será enviado automaticamente após o pagamento."}</p>
        {status?.url?<a href={status.url}>Continuar pagamento</a>:null}<a href="/gerador">Acessar o Gerador</a>
      </div>:<><p>Informe seus dados, leia os documentos e conclua o pagamento. O convite de acesso será enviado automaticamente ao seu e-mail.</p>
        <form onSubmit={submit}>
          <fieldset disabled={busy}><legend>Plano</legend><div className="signup-grid"><label>Plano <span>*</span><select required value={form.planoId} onChange={e=>setForm({...form,planoId:e.target.value})}>{plans.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></label><label>Ciclo <span>*</span><select value={form.ciclo} onChange={e=>setForm({...form,ciclo:e.target.value,parcelamentoAnual:false})}><option value="MENSAL">Mensal</option><option value="ANUAL">Anual</option></select></label></div>
            <p className="signup-price">{money(total)} <small>{form.ciclo==="ANUAL"?"por ano":"por mês"}</small></p>
            {form.ciclo==="ANUAL"&&config?.parcelamentoAnual?<label className="signup-checkbox"><input type="checkbox" checked={form.parcelamentoAnual} onChange={e=>setForm({...form,parcelamentoAnual:e.target.checked})}/>Parcelar o anual em até 12x de {money(total/12)} no cartão</label>:null}
            <p>{form.parcelamentoAnual?"O parcelamento paga o período anual. Uma nova contratação será necessária ao fim do período.":"Cobrança recorrente no cartão, com renovação automática no ciclo escolhido."}</p>
          </fieldset>
          <fieldset disabled={busy}><legend>Dados do assinante</legend><div className="signup-grid">{field("nome","Nome",{autoComplete:"given-name",maxLength:80})}{field("sobrenome","Sobrenome",{autoComplete:"family-name",maxLength:120})}{field("cpf","CPF",{inputMode:"numeric",maxLength:14,placeholder:"000.000.000-00"})}{field("telefone","Telefone com DDD",{type:"tel",autoComplete:"tel-national",maxLength:16})}{field("email","E-mail",{type:"email",autoComplete:"email",maxLength:254})}</div></fieldset>
          <fieldset disabled={busy}><legend>Endereço</legend><div className="signup-grid">{field("cep",cepBusy?"CEP · buscando...":"CEP",{autoComplete:"postal-code",inputMode:"numeric",maxLength:9,onBlur:buscarCep})}{field("rua","Rua / avenida",{autoComplete:"address-line1",maxLength:140})}{field("numero","Número (ou S/N)",{maxLength:20})}<label>Complemento<input value={form.complemento} maxLength={100} onChange={e=>setForm({...form,complemento:e.target.value})}/></label>{field("bairro","Bairro",{maxLength:100})}{field("cidade","Cidade",{autoComplete:"address-level2",maxLength:100})}<label>Estado <span>*</span><select required value={form.uf} onChange={e=>setForm({...form,uf:e.target.value})}><option value="">Selecione</option>{ufs.map(uf=><option key={uf}>{uf}</option>)}</select></label></div></fieldset>
          <fieldset disabled={busy}><legend>Documentos da assinatura</legend>{config?.documentos?.map((d:any)=><details key={d.id}><summary>{d.titulo} · versão {d.versao}</summary><p className="signup-document">{d.conteudo}</p></details>)}<label className="signup-checkbox"><input required type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/>Li e aceito os documentos vigentes exibidos acima.</label></fieldset>
          {!config?.disponivel?<p role="status">{config?"Contratação indisponível no momento. Tente novamente mais tarde.":"Carregando planos e documentos..."}</p>:null}
          <button className="signup-submit" disabled={busy||!accepted||!config?.disponivel}>{busy?"Abrindo pagamento...":"Continuar para o pagamento seguro"}</button>
        </form></>}
      {error?<p className="signup-error" role="alert">{error}</p>:null}
    </section>
  </main>;
}
