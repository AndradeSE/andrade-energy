type Connection={status?:string;erro?:string|null;automatico?:boolean;regra?:{ativa?:boolean;erro?:string|null}};
export function emailConnectionState(connection?:Connection){
 if(!connection)return 'DESCONECTADO' as const;
 if(connection.erro||connection.regra?.erro||['ERRO','REVOGADA','EXPIRADO'].includes(String(connection.status).toUpperCase()))return 'REAUTORIZAR' as const;
 if(connection.automatico===true||connection.regra?.ativa===true)return 'CONECTADO' as const;
 return 'VALIDANDO' as const;
}
export function gmailConnectionLabel(connection?:Connection){
 const estado=emailConnectionState(connection);
 return estado==='CONECTADO'?'Gmail conectado':estado==='REAUTORIZAR'?'Reconectar Gmail e autorizar leitura':estado==='VALIDANDO'?'Gmail autorizado · validando leitura':'Conectar Gmail';
}
