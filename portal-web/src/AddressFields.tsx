import { useRef, useState } from "react";
import { lerEnderecoFatura, serializarEndereco, UFS } from "../../utils/cadastroCliente";

/** Keeps the existing API address format while exposing structured inputs. */
export default function AddressFields({ value, onChange, title = "Endereço", required = true }: {
  value: string; onChange: (value: string) => void; title?: string; required?: boolean;
}) {
  const address = lerEnderecoFatura(value);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const request = useRef(0);
  const latest = useRef(value);
  latest.current = value;
  function update(key: keyof typeof address, text: string) {
    if (key === "cep") { request.current++; setBusy(false); }
    const next = serializarEndereco({ ...address, [key]: text });
    latest.current = next;
    onChange(next);
  }
  async function lookup() {
    const cep = address.cep.replace(/\D/g, "");
    if (cep.length !== 8) return;
    const id = ++request.current;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (id !== request.current) return;
      if (data.erro) throw new Error();
      const current = lerEnderecoFatura(latest.current);
      const next = serializarEndereco({ ...current,
        logradouro: current.logradouro !== address.logradouro ? current.logradouro : data.logradouro || current.logradouro,
        bairro: current.bairro !== address.bairro ? current.bairro : data.bairro || current.bairro,
        cidade: current.cidade !== address.cidade ? current.cidade : data.localidade || current.cidade,
        uf: current.uf !== address.uf ? current.uf : data.uf || current.uf });
      latest.current = next; onChange(next);
    } catch { if (id === request.current) setMessage("CEP não localizado. Confira ou preencha manualmente."); }
    finally { if (id === request.current) setBusy(false); }
  }
  const labels = { cep: "CEP", logradouro: "Rua / avenida", numero: "Número (ou S/N)", complemento: "Complemento", bairro: "Bairro", cidade: "Cidade" };
  return <fieldset className="structured-address"><legend>{title}</legend><div className="record-editor-grid">
    {(Object.keys(labels) as (keyof typeof labels)[]).map(key => <label key={key}>{labels[key]} {required && key !== "complemento" && <span style={{ color: "#b42318" }}>*</span>}
      <input required={required && key !== "complemento"} value={address[key]} inputMode={key === "cep" ? "numeric" : undefined}
        maxLength={key === "cep" ? 9 : 160} pattern={key === "cep" ? "[0-9]{5}-?[0-9]{3}" : undefined}
        onBlur={key === "cep" ? () => void lookup() : undefined}
        onChange={e => update(key, key === "cep" ? e.target.value.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2") : e.target.value)}/></label>)}
    <label>Estado {required && <span style={{ color: "#b42318" }}>*</span>}<select required={required} value={address.uf} onChange={e => update("uf", e.target.value)}><option value="">Selecione</option>{UFS.map(uf => <option key={uf}>{uf}</option>)}</select></label>
  </div>{busy && <small role="status">Buscando CEP…</small>}{message && <small role="status">{message}</small>}</fieldset>;
}
