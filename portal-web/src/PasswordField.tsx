import { useState } from "react";
export default function PasswordField({value,onChange,required=false}:{value:string;onChange:(value:string)=>void;required?:boolean}) {
  const [visible,setVisible]=useState(false);
  return <label>Senha atual<div style={{display:"flex",alignItems:"center",gap:8}}><input required={required} type={visible?"text":"password"} autoComplete="current-password" value={value} onChange={e=>onChange(e.target.value)}/><button type="button" aria-label={visible?"Ocultar senha":"Mostrar senha"} aria-pressed={visible} onClick={()=>setVisible(!visible)} style={{background:"transparent",color:"inherit",padding:8,border:0}}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>{visible && <path d="m3 3 18 18"/>}</svg></button></div></label>;
}
