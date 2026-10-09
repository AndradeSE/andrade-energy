import { apiFetch as fetch } from "./apiClient";
import { FormEvent, useEffect, useState } from "react";
import "./convite.css";

export default function GeneratorInviteSignup({ apiUrl, convite }: { apiUrl:string; convite:string }) {
  const [dados,setDados]=useState<any>(null);
  const [senha,setSenha]=useState("");const [confirmacao,setConfirmacao]=useState("");
  const [mostrar,setMostrar]=useState(false);const [busy,setBusy]=useState(false);
  const [erro,setErro]=useState("");const [concluido,setConcluido]=useState(false);
  useEffect(()=>{
    setDados(null); setErro(""); setConcluido(false); setSenha(""); setConfirmacao("");
    const controller=new AbortController();
    fetch(`${apiUrl}/convites/geradores/${encodeURIComponent(convite)}`,{signal:controller.signal})
      .then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.message);return d;})
      .then(setDados).catch(e=>{if(e.name!=="AbortError")setErro(e.message);});
    return()=>controller.abort();
  },[apiUrl,convite]);
  async function submit(e:FormEvent){
    e.preventDefault();if(busy||!dados)return;
    if(senha.length<6)return setErro("A senha deve ter pelo menos 6 caracteres.");
    if(senha!==confirmacao)return setErro("As senhas não coincidem.");
    setBusy(true);setErro("");
    try{const r=await fetch(`${apiUrl}/auth/cadastro`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({convite,tipo:"GERADOR",nome:dados.nome,cpf:dados.cpf,email:dados.email,senha})});const d=await r.json();if(!r.ok)throw new Error(d.message);setConcluido(true);setSenha("");setConfirmacao("");}
    catch(e){setErro(e instanceof Error?e.message:"Não foi possível criar a conta.");}finally{setBusy(false);}
  }
  const partes=String(dados?.nome??"").trim().split(/\s+/);
  return <main className="invite-page"><section className="invite-card"><div className="invite-brand"><b>AE</b><span>ANDRADE <small>ENERGY</small></span></div><h1>{concluido?"Sua conta está pronta":"Crie sua conta geradora"}</h1>
    {concluido?<><p>Use seu e-mail e a senha que acabou de cadastrar para entrar. Seu plano já está vinculado à conta.</p><a className="invite-app-link" href="/gerador">Entrar no Gerador</a></>:dados?<form className="invite-form" onSubmit={submit}><p>Confira os dados do convite e escolha sua senha.</p><label>Nome<input readOnly value={partes[0]??""}/></label><label>Sobrenome<input readOnly value={partes.slice(1).join(" ")}/></label><label>E-mail<input readOnly value={dados.email}/></label><label>Endereço<textarea readOnly value={dados.endereco??""}/></label><label>Senha<input required minLength={6} type={mostrar?"text":"password"} autoComplete="new-password" value={senha} onChange={e=>setSenha(e.target.value)}/></label><label>Confirmar senha<input required minLength={6} type={mostrar?"text":"password"} autoComplete="new-password" value={confirmacao} onChange={e=>setConfirmacao(e.target.value)}/></label><button type="button" aria-label={mostrar?"Ocultar senha":"Mostrar senha"} onClick={()=>setMostrar(!mostrar)}>◉</button><button disabled={busy}>{busy?"Criando conta...":"Criar conta"}</button></form>:<p>{erro?"":"Carregando convite..."}</p>}
    {erro?<p className="invite-error" role="alert">{erro}</p>:null}
  </section></main>;
}
