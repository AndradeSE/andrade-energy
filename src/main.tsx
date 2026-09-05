import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./wallet.css";
import mobileStylesUrl from "./mobile.css?url";

// O CSS responsivo precisa ser a última folha da página. Quando importado como
// CSS comum, o extrator do Vite o reposicionava antes do tema principal e as
// regras de desktop venciam no celular.
const mobileStylesheet = document.createElement("link");
mobileStylesheet.rel = "stylesheet";
mobileStylesheet.href = mobileStylesUrl;
document.head.appendChild(mobileStylesheet);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
