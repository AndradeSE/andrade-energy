type Connection={status?:string;erro?:string|null;automatico?:boolean;regra?:{ativa?:boolean;erro?:string|null}};
export function emailConnectionState(connection?:Connection){
 if(!connection)return 'DESCONECTADO' as const;
 const status=String(connection.status).toUpperCase();
 const erro=[connection.erro,connection.regra?.erro].filter(Boolean).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const autorizacaoInvalida=['REVOGADA','EXPIRADO'].includes(status)||/invalid_grant|oauth_reautorizacao|gmail_leitura_nao_autorizada|sem permissao|sem leitura autorizada|nao autorizad|insufficient.*(scope|permission)|autorize.*leitura|autorizacao.*(expirou|revogada)/.test(erro);
 if(autorizacaoInvalida)return 'REAUTORIZAR' as const;
 // Network, executor and processing failures do not revoke Google's consent.
 if(erro||status==='ERRO')return 'VALIDANDO' as const;
 if(connection.automatico===true||connection.regra?.ativa===true)return 'CONECTADO' as const;
 return 'VALIDANDO' as const;
}
export function gmailConnectionLabel(connection?:Connection){
 const estado=emailConnectionState(connection);
 return estado==='CONECTADO'?'Gmail conectado':estado==='REAUTORIZAR'?'Reconectar Gmail e autorizar leitura':estado==='VALIDANDO'?'Gmail autorizado · validando leitura':'Conectar Gmail';
}
