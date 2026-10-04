import { useState } from "react";
import { createRoot } from "react-dom/client";
import AddressFields from "../src/AddressFields";
import PersonNameFields from "../src/PersonNameFields";
import "../src/styles.css";

function Check() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saved, setSaved] = useState(false);
  return <main style={{maxWidth:740,margin:"24px auto",padding:20}}><h1>Validação local de formulários</h1><p>Esta tela não cria contas, contratos ou cobranças. Verifica somente os componentes.</p><form className="commercial-form" onSubmit={e=>{e.preventDefault();setSaved(true);}}><PersonNameFields value={name} onChange={setName}/><AddressFields value={address} onChange={setAddress}/><button>Validar formulário local</button></form>{saved && <p role="status">Campos obrigatórios preenchidos.</p>}</main>;
}
createRoot(document.getElementById("root")!).render(<Check/>);
