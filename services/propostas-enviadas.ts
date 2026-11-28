import * as FS from "expo-file-system/legacy";

export type ArquivoProposta = { uri: string; name: string; mimeType?: string };
export type PropostaEnviada = {
  id: string;
  enviadaEm: number;
  consumo: string;
  desconto: string;
  economia: number;
  nome: string;
  uc: string;
  endereco: string;
  arquivo?: { name: string; mimeType?: string; arquivoLocal: string };
};

const validade = 30 * 24 * 60 * 60 * 1000;
const idValido = /^\d{13}-[a-z0-9]{8,12}$/;
const root = () => {
  if (!FS.documentDirectory) throw new Error("Armazenamento de propostas indisponível.");
  return FS.documentDirectory + "propostas/";
};

function pasta(usuario: string, usina: string) {
  if (!usuario || !usina) throw new Error("Selecione a usina da proposta.");
  return root() + encodeURIComponent(JSON.stringify([usuario, usina])) + "/";
}

async function entradas(uri: string) {
  if (!(await FS.getInfoAsync(uri)).exists) return [];
  return FS.readDirectoryAsync(uri);
}

export async function listarPropostas(usuario: string, usina: string) {
  const base = pasta(usuario, usina);
  const propostas = await Promise.all((await entradas(base)).filter(id => idValido.test(id)).map(async id => {
    try {
      const item: PropostaEnviada = JSON.parse(await FS.readAsStringAsync(base + id + "/proposta.json"));
      return item.id === id && item.enviadaEm > Date.now() - validade ? item : null;
    } catch {
      return null;
    }
  }));
  return propostas.filter((item): item is PropostaEnviada => item !== null).sort((a, b) => b.enviadaEm - a.enviadaEm);
}

export async function limparPropostasVencidas() {
  const base = root();
  for (const escopo of await entradas(base)) {
    const pastaEscopo = base + escopo + "/";
    for (const id of (await entradas(pastaEscopo)).filter(id => idValido.test(id))) {
      const destino = pastaEscopo + id + "/";
      const info = await FS.getInfoAsync(destino);
      if (info.exists && Number(id.slice(0, 13)) <= Date.now() - validade) {
        await FS.deleteAsync(destino, { idempotent: true });
      }
    }
  }
}

export async function salvarProposta(
  usuario: string,
  usina: string,
  dados: Omit<PropostaEnviada, "id" | "enviadaEm" | "arquivo">,
  arquivo?: ArquivoProposta,
) {
  const id = Date.now() + "-" + Math.random().toString(36).slice(2, 12).padEnd(10, "0");
  const destino = pasta(usuario, usina) + id + "/";
  await FS.makeDirectoryAsync(destino, { intermediates: true });
  try {
    const proposta: PropostaEnviada = { ...dados, id, enviadaEm: Date.now() };
    if (arquivo) {
      const extensao = arquivo.mimeType === "image/png" ? "png" : arquivo.mimeType === "image/jpeg" ? "jpg" : "pdf";
      const arquivoLocal = "fatura." + extensao;
      await FS.copyAsync({ from: arquivo.uri, to: destino + arquivoLocal });
      proposta.arquivo = { name: arquivo.name, mimeType: arquivo.mimeType, arquivoLocal };
    }
    await FS.writeAsStringAsync(destino + "proposta.json", JSON.stringify(proposta));
  } catch (erro) {
    await FS.deleteAsync(destino, { idempotent: true }).catch(() => undefined);
    throw erro;
  }
}

export async function arquivoDaProposta(usuario: string, usina: string, proposta: PropostaEnviada) {
  const arquivo = proposta.arquivo;
  if (!arquivo || !idValido.test(proposta.id) || !/^fatura\.(pdf|jpg|png)$/.test(arquivo.arquivoLocal)) return undefined;
  const uri = pasta(usuario, usina) + proposta.id + "/" + arquivo.arquivoLocal;
  return (await FS.getInfoAsync(uri)).exists ? { uri, name: arquivo.name, mimeType: arquivo.mimeType } : undefined;
}
