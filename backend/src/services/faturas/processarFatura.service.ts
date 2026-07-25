import {
    buscarClientePorUC,
    criarCliente
} from "../../repositories/clientes.repository";

import { extrairTexto } from "./extrairTexto.service";
import { interpretarFatura } from "./interpretarFatura.service";
import { salvarFatura } from "./salvarFatura.service";


export async function processarFatura(
  caminhoPDF: string
) {
    

  const texto =
    await extrairTexto(caminhoPDF);

  const dados =
    interpretarFatura(texto);

let cliente =
  await buscarClientePorUC(dados.uc);
  console.log("2 - Cliente encontrado:", cliente);

if (!cliente) {
     console.log("3 - Criando cliente...");

  cliente =
    await criarCliente({

      nome: dados.cliente,

      uc: dados.uc,

      distribuidora: dados.distribuidora

    });
   console.log("4 - Cliente criado:", cliente);
}

console.log("5 - Salvando fatura...");  


   const fatura = await salvarFatura(
  cliente.id,
  dados
);

 return {

  status: "ok",

  dados,

  fatura

};

}