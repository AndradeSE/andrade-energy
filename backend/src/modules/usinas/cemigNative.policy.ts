export function podeUsarCofreNativo(usuario:any){
 return ['ADMIN','GESTOR'].includes(String(usuario?.perfil??''))&&!String(usuario?.papel_empresa??'').startsWith('COLABORADOR_');
}
