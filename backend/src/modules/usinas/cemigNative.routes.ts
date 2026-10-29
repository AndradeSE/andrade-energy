import {Router} from 'express';
import {exigirGestor} from '../../middlewares/auth.middleware';
import {empresaIdDaRequisicao} from '../../utils/empresaScope';
import {apiRateLimit} from '../../config/distributedRateLimit';
import {statusCofreNativo,salvarCofreNativo,removerCofreNativo,lerCofreNativo} from './cemigNative.vault';
import {envelopeAcessoNativo} from './cemigNative.envelope';
import {iniciarCaptchaNativo,consultarCaptchaNativo} from './cemigNative.captcha';
import {podeUsarCofreNativo} from './cemigNative.policy';
const router=Router();
router.use('/:id/cemig-acesso',exigirGestor,(req,res,next)=>{
 res.setHeader('Cache-Control','private, no-store');
 if(!podeUsarCofreNativo((req as any).usuario))return res.status(403).json({message:'O acesso da Cemig é exclusivo do titular ou ADM.'});
 next();
});
router.get('/:id/cemig-acesso',async(req,res)=>{
 try{return res.json(await statusCofreNativo(req.params.id,empresaIdDaRequisicao(req),(req as any).usuario.id));}
 catch{return res.status(503).json({message:'Não foi possível consultar o cofre da Cemig.'});}
});
router.put('/:id/cemig-acesso',apiRateLimit('cemig-vault-save',{windowMs:60000,limit:3}),async(req,res)=>{
 try{return res.json(await salvarCofreNativo(req.params.id,empresaIdDaRequisicao(req),(req as any).usuario.id,req.body));}
 catch{return res.status(400).json({message:'Não foi possível salvar o acesso da Cemig.'});}
});
router.delete('/:id/cemig-acesso',async(req,res)=>{
 try{return res.json(await removerCofreNativo(req.params.id,empresaIdDaRequisicao(req),(req as any).usuario.id));}
 catch{return res.status(400).json({message:'Não foi possível remover o acesso da Cemig.'});}
});
router.post('/:id/cemig-acesso/nativo',apiRateLimit('cemig-native-vault',{windowMs:60000,limit:3}),async(req,res)=>{
 try{
  if(req.body?.autorizaLoginNativo!==true)throw new Error();
  const acesso=await lerCofreNativo(req.params.id,empresaIdDaRequisicao(req),(req as any).usuario.id);
  return res.json(envelopeAcessoNativo(acesso,{publicKey:req.body.publicKey,nonce:req.body.nonce,usina:req.params.id}));
 }catch{return res.status(400).json({message:'Confira o acesso da Cemig cadastrado no aplicativo.'});}
});
router.post('/:id/cemig-acesso/nativo/captcha',apiRateLimit('cemig-native-captcha',{windowMs:60000,limit:2}),async(req,res)=>{
 try{return res.json(await iniciarCaptchaNativo(req.params.id,empresaIdDaRequisicao(req),(req as any).usuario.id,req.body));}
 catch{return res.status(400).json({message:'A verificação automática não pôde continuar. Nenhuma tarefa será repetida automaticamente.'});}
});
router.get('/:id/cemig-acesso/nativo/captcha/:captcha',async(req,res)=>{
 try{return res.json(await consultarCaptchaNativo(req.params.id,empresaIdDaRequisicao(req),(req as any).usuario.id,req.params.captcha));}
 catch{return res.status(400).json({message:'Verificação indisponível ou encerrada. Continue na mesma sessão.'});}
});
export default router;
