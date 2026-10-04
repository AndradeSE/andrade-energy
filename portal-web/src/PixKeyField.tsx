import { detectPixKeyType } from "../../utils/detectPixKeyType";
const names = { CPF:"CPF", CNPJ:"CNPJ", EMAIL:"E-mail", PHONE:"Telefone", EVP:"Chave aleatória" };
export default function PixKeyField({ value, placeholder, onChange }: { value: string; placeholder?: string; onChange:(value:string,type:string|null)=>void }) {
  const type = detectPixKeyType(value);
  return <label>Chave Pix<input value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value,detectPixKeyType(e.target.value))}/>{type && <small>{names[type]}</small>}</label>;
}
