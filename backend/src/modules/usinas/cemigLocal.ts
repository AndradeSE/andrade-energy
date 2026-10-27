import {basename} from 'node:path';
import type {Page} from 'playwright-core';
import {conferirCsvSimulacao} from './cemigCloud.policy';
import {AcaoManualCemig,FalhaEtapaCemig,paginaPortalCemig,validarAnexoCemig} from './cemigCloud.portal';

export function prepararRateioLocal(caminho:string,csv:string,uc?:string){
 const arquivo=basename(caminho);
 const numero=uc??arquivo.match(/-(\d{6,20})\.csv$/i)?.[1];
 if(!numero)throw new Error('Informe a UC geradora em --uc.');
 if(!/^cemig-.*\.csv$/i.test(arquivo))throw new Error('Use o CSV no padrão Cemig, gerado e conferido no Preview.');
 const conteudo=csv.replace(/^\uFEFF/,'');
 conferirCsvSimulacao(conteudo,numero);
 return {uc:numero,csv:conteudo,arquivo};
}

export function requisicaoLocalPermitida(host:string|undefined,origin:string|undefined,token:string|undefined,esperados:{origin:string;token:string}){
 return host===new URL(esperados.origin).host && origin===esperados.origin && token===esperados.token;
}

type Estado='AGUARDANDO_LOGIN'|'EXECUTANDO'|'REVISAO_SEM_PROTOCOLO'|'INTERROMPIDO';
/** One run at a time; after a possible upload, require inspection instead of retrying. */
export function criarFluxoLocal(dados:ReturnType<typeof prepararRateioLocal>,executar=validarAnexoCemig){
 let estado:Estado='AGUARDANDO_LOGIN';
 let mensagem='Entre na Cemig e clique em Continuar após o login.';
 return {
  status:()=>({estado,mensagem}),
  async continuar(pages:Page[],inicial:Page){
   if(estado!=='AGUARDANDO_LOGIN')return;
   estado='EXECUTANDO';mensagem='Selecionando a usina e preparando a revisão do CSV…';
   try{
    await executar(paginaPortalCemig(pages,inicial),dados.uc,dados.csv,dados.arquivo,undefined,{selecionarModalidade:true});
    estado='REVISAO_SEM_PROTOCOLO';mensagem='CSV anexado e revisão confirmada. Nenhum protocolo foi solicitado. Confira a aba da Cemig.';
   }catch(error){
    if(error instanceof AcaoManualCemig){
     estado='AGUARDANDO_LOGIN';
     mensagem=error.tipo==='LOGIN'?'Conclua o login na aba da Cemig e clique em Continuar.':
      error.tipo==='VERIFICACAO'?'Conclua a verificação na aba da Cemig e clique em Continuar.':
      'Abra Compensação de Geração Distribuída até a seleção da UC na mesma aba e clique em Continuar.';
    }else{
     estado='INTERROMPIDO';
     mensagem=error instanceof FalhaEtapaCemig?error.message:
      'A execução foi interrompida. Confira a aba da Cemig antes de iniciar outro teste.';
    }
   }
  }
 };
}
