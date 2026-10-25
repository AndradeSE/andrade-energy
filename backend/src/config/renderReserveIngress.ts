import express, {type RequestHandler} from 'express';
import {contingencyExecutor,renderReserveEnvironment} from './contingencyExecutor';
import {isProviderIngress,isOAuthIngress,forwardProviderIngress,forwardOAuthIngress} from './contingencyIngress';

/** Only provider callbacks may relay. Ordinary app requests always use ownership fencing. */
export function createRenderReserveIngress(store:any,env:NodeJS.ProcessEnv=process.env,request:typeof fetch=fetch):RequestHandler {
 return async(req,res,next)=>{
  if(contingencyExecutor(env)!=='RENDER_RESERVA' ||
    (!isProviderIngress(req.method,req.path)&&!isOAuthIngress(req.method,req.path))) return next();
  try {
    const {data,error}=await store.from('contingencia_controle').select('executor').eq('id',true).single();
    if(error||!data) throw new Error('control unavailable');
    if(data.executor==='RENDER_RESERVA') return next();
    if(!['RENDER','NETLIFY'].includes(data.executor)) return res.status(503).json({message:'Callback aguardando conferência do servidor ativo.'});
    const event={httpMethod:req.method,path:req.path,headers:req.headers,queryStringParameters:req.query};
    const reply=async(body?:Buffer)=>{
      const result=isOAuthIngress(req.method,req.path)?await forwardOAuthIngress(event,renderReserveEnvironment(env),request,data.executor):
        await forwardProviderIngress({...event,body:body?.toString('base64')??'',isBase64Encoded:true},renderReserveEnvironment(env),request,data.executor);
      res.status(result.statusCode).set(result.headers).send(result.body);
    };
    if(isOAuthIngress(req.method,req.path)) {await reply();return;}
    // Consume raw signed bytes only when relaying. Local routes retain their existing parsers.
    express.raw({type:()=>true,limit:'11mb'})(req,res,(parseError)=>{
      if(parseError) return res.status(413).json({message:'Callback excede o limite permitido.'});
      void reply(Buffer.isBuffer(req.body)?req.body:Buffer.alloc(0)).catch(()=>{
        if(!res.headersSent) res.status(503).json({message:'Callback não confirmado. Nenhuma repetição foi iniciada.'});
      });
    });
    return;
  } catch { return res.status(503).json({message:'Não foi possível confirmar o destino do callback.'}); }
 };
}
