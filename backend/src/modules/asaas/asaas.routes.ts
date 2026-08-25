import { Router } from "express";
import { exigirAutenticacao, exigirGestor } from "../../middlewares/auth.middleware";
import { criarCobrancaAsaas, processarWebhookAsaas, validarSaqueAsaas } from "./asaas.service";
export const asaasRouter=Router();
asaasRouter.post("/cobrancas/:faturaId",exigirAutenticacao,exigirGestor,async(req,res)=>{try{return res.json(await criarCobrancaAsaas(req.params.faturaId));}catch(error:any){return res.status(400).json({message:error.message});}});
export const asaasWebhookRouter=Router();
asaasWebhookRouter.post("/",async(req,res)=>{try{return res.json(await processarWebhookAsaas(req.body,req.header("asaas-access-token")??undefined));}catch(error:any){return res.status(error.message.includes("autorizado")?401:400).json({message:error.message});}});
asaasWebhookRouter.post("/saques",async(req,res)=>{try{return res.json(await validarSaqueAsaas(req.body,req.header("asaas-access-token")??undefined));}catch(error:any){return res.status(error.message.includes("autorizado")?401:400).json({message:error.message});}});
