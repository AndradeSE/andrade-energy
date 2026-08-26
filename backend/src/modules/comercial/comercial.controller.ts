import { Request, Response } from "express";
import * as service from "./comercial.service";

const respond = (res: Response, work: Promise<any>, status = 200) => work.then((data) => res.status(status).json(data)).catch((error) => res.status(400).json({ message: error?.message ?? "Operação comercial não concluída." }));
export const painel = (_: Request, res: Response) => respond(res, service.obterPainelComercial());
export const criarPlano = (req: Request, res: Response) => respond(res, service.salvarPlano(undefined, req.body), 201);
export const atualizarPlano = (req: Request, res: Response) => respond(res, service.salvarPlano(req.params.id, req.body));
export const contratar = (req: Request, res: Response) => respond(res, service.contratarPlano(req.body, (req as any).usuario.id), 201);
export const status = (req: Request, res: Response) => respond(res, service.alterarStatusAssinatura(req.params.id, req.body?.status));
export const cobrar = (req: Request, res: Response) => respond(res, service.gerarCobrancaAssinatura(req.params.id), 201);
export const cobrancas = (req: Request, res: Response) => respond(res, service.listarCobrancasAssinatura(req.params.id));
export const minhaAssinatura = (req: Request, res: Response) => respond(res, service.obterMinhaAssinatura((req as any).usuario.id));
export const checkoutMinhaAssinatura = (req: Request, res: Response) => respond(res, service.criarCheckoutRecorrente((req as any).usuario, req.body), 201);
