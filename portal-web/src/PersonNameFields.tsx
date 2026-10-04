export default function PersonNameFields({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [first = "", ...rest] = value.split(" ");
  return <div className="record-editor-grid"><label>Nome <span style={{color:"#b42318"}}>*</span><input required autoComplete="given-name" value={first} onChange={e => onChange(`${e.target.value.replace(/\s/g, "")} ${rest.join(" ")}`)}/></label><label>Sobrenome <span style={{color:"#b42318"}}>*</span><input required autoComplete="family-name" value={rest.join(" ")} onChange={e => onChange(`${first} ${e.target.value}`)}/></label></div>;
}
