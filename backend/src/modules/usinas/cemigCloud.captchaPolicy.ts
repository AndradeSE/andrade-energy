export const CAPTCHA_MINIMUM_REMAINING_MS=180_000;
export class RecusaTesteCaptcha extends Error {}
export function motivoBloqueioCaptcha(input:{disponivel:boolean;estado:string;captchaEstado?:string|null;expiraEm:string},agora=Date.now()):string|null {
 if(!input.disponivel)return 'O teste CapMonster não está habilitado neste ambiente. Nenhuma tarefa foi criada.';
 if(input.estado!=='AGUARDANDO_LOGIN')return 'O navegador precisa estar aguardando o login para testar o CAPTCHA. Nenhuma tarefa foi criada.';
 if(input.captchaEstado&&input.captchaEstado!=='NAO_SOLICITADO')return 'Esta sessão já solicitou uma tentativa de CAPTCHA. Não repita a tarefa.';
 const restante=Date.parse(input.expiraEm)-agora;
 if(!Number.isFinite(restante)||restante<CAPTCHA_MINIMUM_REMAINING_MS)return 'Restam menos de três minutos nesta sessão. O teste não foi enviado ao CapMonster e não consumiu crédito. Não abra outra sessão sem conferir a cota.';
 return null;
}
