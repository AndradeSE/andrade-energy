import { useEffect, useRef, useState } from "react";
import { Text } from "react-native";
import FormField from "./FormField";
import { EnderecoCliente } from "../../utils/cadastroCliente";

export default function EnderecoFields({ value, onChange }: { value: EnderecoCliente; onChange: (value: EnderecoCliente) => void }) {
  const atual = useRef(value);
  const alterar = useRef(onChange);
  atual.current = value; alterar.current = onChange;
  const [mensagem, setMensagem] = useState("");
  const cep = value.cep.replace(/\D/g, "");
  useEffect(() => {
    setMensagem("");
    if (cep.length !== 8) return;
    let ativo = true;
    const controller = new AbortController();
    let limite: ReturnType<typeof setTimeout>;
    const timer = setTimeout(async () => {
      setMensagem("Buscando endereço...");
      limite = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controller.signal });
        if (!response.ok) throw new Error();
        const dados = await response.json();
        if (!ativo) return;
        if (dados.erro) { setMensagem("CEP não encontrado. Confira o CEP e preencha o endereço."); return; }
        alterar.current({ ...atual.current, logradouro: dados.logradouro || atual.current.logradouro, bairro: dados.bairro || atual.current.bairro, cidade: dados.localidade || atual.current.cidade, uf: dados.uf || atual.current.uf });
        setMensagem("Confira o endereço e informe o número e o complemento, se houver.");
      } catch { if (ativo) setMensagem("Não foi possível consultar o CEP. Você pode preencher manualmente."); }
      finally { clearTimeout(limite); }
    }, 450);
    return () => { ativo = false; clearTimeout(timer); clearTimeout(limite); controller.abort(); };
  }, [cep]);
  const campo = (chave: keyof EnderecoCliente, texto: string) => onChange({ ...value, [chave]: texto });
  return <>
    <FormField label="CEP" required value={value.cep} keyboardType="number-pad" maxLength={9} onChangeText={v => campo("cep", v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2"))} />
    {mensagem ? <Text accessibilityLiveRegion="polite" style={{ marginBottom: 12 }}>{mensagem}</Text> : null}
    <FormField label="Rua / avenida" required value={value.logradouro} onChangeText={v => campo("logradouro", v)} />
    <FormField label="Número (ou S/N)" required value={value.numero} onChangeText={v => campo("numero", v)} />
    <FormField label="Complemento (opcional)" value={value.complemento} onChangeText={v => campo("complemento", v)} />
    <FormField label="Bairro" required value={value.bairro} onChangeText={v => campo("bairro", v)} />
    <FormField label="Cidade" required value={value.cidade} onChangeText={v => campo("cidade", v)} />
    <FormField label="UF" required value={value.uf} maxLength={2} autoCapitalize="characters" onChangeText={v => campo("uf", v.replace(/[^a-z]/gi, "").toUpperCase())} />
  </>;
}
