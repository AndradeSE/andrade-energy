import { Request, Response } from "express";
import { buscarFatura } from "../services/faturas/buscarFatura.service";
import { listarFaturas } from "../services/faturas/listarFaturas.service";
import { processarFatura } from "../services/faturas/processarFatura.service";



type Params = {
  clienteId: string;
};

export async function buscarFaturaController(
  req: Request<{ id: string }>,
  res: Response
) {
  try {

    const fatura =
      await buscarFatura(req.params.id);

    return res.json(fatura);

  } catch (error: any) {

    return res.status(500).json({
      message: error.message,
    });

  }
}

export async function processarFaturaController(
  req: Request,
  res: Response
) {
  try {

    if (!req.file) {
      return res.status(400).json({
        erro: "Nenhum PDF enviado."
      });
    }

    const resultado =
      await processarFatura(req.file.path);

    return res.json(resultado);

  } catch (error: any) {
  console.error(error);

  return res.status(500).json({
    message: error.message,
    stack: error.stack
  });
}
}
export async function listarFaturasController(
  req: Request<Params>,
  res: Response
) {

  console.log("ENTROU NO CONTROLLER");
  console.log(req.params);
  try {
    const { clienteId } = req.params;

    const dados = await listarFaturas(clienteId);

    return res.json(dados);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Erro ao listar faturas"
    });
  }
}