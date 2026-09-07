import { Router, Request, Response, NextFunction } from "express";
import { supabase } from "../../config/supabase";

import {
    atualizarContratoController,
    buscarContratoController,
    criarContratoController,
    excluirContratoController,
    cancelarContratoController,
    salvarContratoDaUnidadeController,
    buscarContratoDaUnidadeController,
    gerarContratoDaUnidadeController,
    importarContratoAssinadoDaUnidadeController,
    registrarAceiteEletronicoController,
    solicitarCodigoAssinaturaController,
    importarContratoAssinadoPeloClienteController,
    propostaDaUnidadeController,
    dadosIniciaisContratoController,
} from "./contratos.controller";
import { exigirAutenticacao, exigirGestor } from "../../middlewares/auth.middleware";
import { upload } from "../../config/multer";
import { exigirRegistroDaEmpresa } from "../../utils/empresaScope";
import { enviarContratoEConvite } from "./envioContrato.service";
import { listarAcessoContratos } from "./acessoContrato.service";

const router = Router();
router.use(exigirAutenticacao);
// A empresa pode ter vários consumidores; pertencer à mesma empresa não
// autoriza consultar o contrato ou a proposta de outro cliente.
function exigirTitular(tabela: string, parametro: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const usuario = (req as any).usuario;
    if (usuario?.perfil !== "LEITURA") return next();
    try {
      const { data, error } = await supabase.from(tabela).select("id")
        .eq("id", req.params[parametro]).eq(tabela === "clientes" ? "id" : "cliente_id", usuario.cliente_id)
        .eq("empresa_id", usuario.empresa_id).maybeSingle();
      if (error || !data) return res.status(404).json({ message: "Documento não encontrado para sua conta." });
      return next();
    } catch { return res.status(503).json({ message: "Não foi possível verificar o titular do documento." }); }
  };
}
router.post("/:id/validar-assinatura-externa", exigirGestor, exigirRegistroDaEmpresa("contratos"), async (req, res) => {
  try {
    const { validarAssinaturaExterna } = await import("./validacaoAssinatura.service.js");
    res.json(await validarAssinaturaExterna(req.params.id, (req as any).usuario, req.body?.confirmado === true));
  } catch (erro: any) { res.status(400).json({ message: erro.message }); }
});
router.get("/acesso/minhas-unidades", async (req, res) => {
  try { res.json(await listarAcessoContratos((req as any).usuario)); }
  catch (erro: any) { res.status(500).json({ message: erro.message }); }
});
router.post("/unidade/:unidadeId/enviar", exigirGestor, exigirRegistroDaEmpresa("unidades_consumidoras", "unidadeId"), async (req, res) => {
  try { res.json(await enviarContratoEConvite(req.params.unidadeId, (req as any).usuario)); }
  catch (erro: any) { res.status(400).json({ message: erro.message }); }
});

router.get(
  "/unidade/:unidadeId",
  exigirTitular("unidades_consumidoras", "unidadeId"),
  exigirRegistroDaEmpresa("unidades_consumidoras", "unidadeId"),
  buscarContratoDaUnidadeController
);
router.get("/unidade/:unidadeId/proposta", exigirTitular("unidades_consumidoras", "unidadeId"), exigirRegistroDaEmpresa("unidades_consumidoras", "unidadeId"), propostaDaUnidadeController);
router.get("/unidade/:unidadeId/dados-iniciais", exigirGestor, exigirRegistroDaEmpresa("unidades_consumidoras", "unidadeId"), dadosIniciaisContratoController);

router.get(
  "/:clienteId",
  exigirTitular("clientes", "clienteId"),
  exigirRegistroDaEmpresa("clientes", "clienteId"),
  buscarContratoController
);

router.post(
  "/",
  exigirGestor,
  criarContratoController
);

router.put(
  "/unidade/:unidadeId",
  exigirGestor,
  exigirRegistroDaEmpresa("unidades_consumidoras", "unidadeId"),
  salvarContratoDaUnidadeController
);

router.post(
  "/unidade/:unidadeId/gerar-documento",
  exigirGestor,
  exigirRegistroDaEmpresa("unidades_consumidoras", "unidadeId"),
  gerarContratoDaUnidadeController
);

router.post(
  "/unidade/:unidadeId/contrato-assinado",
  exigirGestor,
  exigirRegistroDaEmpresa("unidades_consumidoras", "unidadeId"),
  upload.single("arquivo"),
  importarContratoAssinadoDaUnidadeController
);

router.post("/:id/codigo-assinatura", exigirRegistroDaEmpresa("contratos"), solicitarCodigoAssinaturaController);
router.post("/:id/aceite-eletronico", exigirRegistroDaEmpresa("contratos"), registrarAceiteEletronicoController);
router.post("/:id/contrato-assinado-cliente", exigirRegistroDaEmpresa("contratos"), upload.single("arquivo"), importarContratoAssinadoPeloClienteController);

router.put(
  "/:id",
  exigirGestor,
  exigirRegistroDaEmpresa("contratos"),
  atualizarContratoController
);

router.post("/:id/cancelar", exigirTitular("contratos", "id"), exigirRegistroDaEmpresa("contratos"), cancelarContratoController);

router.delete(
  "/:id",
  exigirGestor,
  exigirRegistroDaEmpresa("contratos"),
  excluirContratoController
);

export default router;
