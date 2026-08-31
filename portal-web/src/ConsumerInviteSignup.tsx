import { FormEvent, useEffect, useMemo, useState } from "react";

import "./convite.css";

type Convite = {
  nome: string;
  email: string;
  cpf?: string;
};

type Props = {
  apiUrl: string;
  convite: string;
};

function somenteNumeros(valor: string) {
  return valor.replace(/\D/g, "").slice(0, 11);
}

export default function ConsumerInviteSignup({ apiUrl, convite }: Props) {
  const [dados, setDados] = useState<Convite | null>(null);
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [fatura, setFatura] = useState<File | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [concluido, setConcluido] = useState("");

  const appUrl = useMemo(
    () => `andradeenergyconsumidor://criar-conta?convite=${encodeURIComponent(convite)}`,
    [convite],
  );

  useEffect(() => {
    let ativo = true;
    if (!convite) {
      setErro("Este convite não possui uma chave válida.");
      setCarregando(false);
      return () => { ativo = false; };
    }
    fetch(`${apiUrl}/convites/${encodeURIComponent(convite)}`)
      .then(async (resposta) => {
        const corpo = await resposta.json().catch(() => ({}));
        if (!resposta.ok) throw new Error(corpo.message ?? "Convite inválido ou expirado.");
        return corpo as Convite;
      })
      .then((resultado) => {
        if (!ativo) return;
        setDados(resultado);
      })
      .catch((motivo: unknown) => {
        if (ativo) setErro(motivo instanceof Error ? motivo.message : "Não foi possível consultar o convite.");
      })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [apiUrl, convite]);

  async function enviarCadastro(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando || !dados) return;
    setErro("");
    if (cpf.length !== 11) return setErro("Informe o CPF completo, com 11 números.");
    if (senha.length < 6) return setErro("A senha deve ter pelo menos 6 caracteres.");
    if (senha !== confirmacao) return setErro("As senhas não coincidem.");
    if (!fatura) return setErro("Envie uma fatura CEMIG em PDF para concluir o cadastro.");
    if (fatura.type && fatura.type !== "application/pdf") return setErro("Envie a fatura no formato PDF.");

    const formulario = new FormData();
    formulario.append("convite", convite);
    formulario.append("cpf", cpf);
    formulario.append("senha", senha);
    formulario.append("fatura", fatura);
    setEnviando(true);
    try {
      const resposta = await fetch(`${apiUrl}/auth/cadastro-consumidor`, { method: "POST", body: formulario });
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(corpo.message ?? "Não foi possível concluir o cadastro.");
      setConcluido(corpo.message ?? "Cadastro recebido. Confirme seu e-mail para encaminhá-lo ao gerador.");
    } catch (motivo) {
      setErro(motivo instanceof Error ? motivo.message : "Não foi possível concluir o cadastro.");
    } finally {
      setEnviando(false);
    }
  }

  return <main className="invite-page">
    <section className="invite-card">
      <div className="invite-brand"><b>AE</b><span>ANDRADE <small>ENERGY</small></span></div>
      <p className="invite-eyebrow">CONVITE PARA CONSUMIDOR</p>
      <h1>Crie sua conta</h1>
      <p className="invite-lead">Seu convite já foi reconhecido. Conclua o cadastro pelo navegador ou abra o aplicativo Andrade Energy Consumidor.</p>

      {carregando ? <p className="invite-state">Validando convite…</p> : null}
      {!carregando && erro && !dados ? <p className="invite-error" role="alert">{erro}</p> : null}
      {!carregando && dados && !concluido ? <>
        <div className="invite-person"><strong>{dados.nome}</strong><span>{dados.email}</span></div>
        <a className="invite-app-link" href={appUrl}>Abrir no aplicativo</a>
        <div className="invite-divider"><span>ou conclua pelo navegador</span></div>
        <form className="invite-form" onSubmit={enviarCadastro}>
          <label>CPF <input inputMode="numeric" autoComplete="off" value={cpf} onChange={(evento) => setCpf(somenteNumeros(evento.target.value))} placeholder="Somente números" required /></label>
          <label>Senha <input type="password" autoComplete="new-password" value={senha} onChange={(evento) => setSenha(evento.target.value)} placeholder="Mínimo de 6 caracteres" required /></label>
          <label>Confirmar senha <input type="password" autoComplete="new-password" value={confirmacao} onChange={(evento) => setConfirmacao(evento.target.value)} placeholder="Repita sua senha" required /></label>
          <label>Fatura CEMIG em PDF <input type="file" accept="application/pdf,.pdf" onChange={(evento) => setFatura(evento.target.files?.[0] ?? null)} required /></label>
          <small className="invite-note">A fatura confirma a unidade consumidora e é usada apenas para finalizar seu cadastro.</small>
          {erro ? <p className="invite-error" role="alert">{erro}</p> : null}
          <button type="submit" disabled={enviando}>{enviando ? "Enviando cadastro…" : "Criar minha conta"}</button>
        </form>
      </> : null}
      {concluido ? <div className="invite-success"><strong>Cadastro recebido</strong><p>{concluido}</p><a href="/">Ir para o portal Andrade Energy</a></div> : null}
    </section>
  </main>;
}
