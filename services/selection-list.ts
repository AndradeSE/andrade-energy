import AsyncStorage from "@react-native-async-storage/async-storage";
import { listarMinhasUnidades, listarUnidadesGestor } from "./clientes.service";
import { listarAcessoContratos } from "./contratos.service";
import { consultarAlocacao, listarUsinas } from "./usinas.service";

export const selectionListKey = (generator: boolean, userId: unknown, companyId: unknown) => ["selection-list", generator, String(userId ?? ""), String(companyId ?? "")] as const;

export async function loadSelectionList(generator: boolean): Promise<any[]> {
  if (generator) {
    const plants = await listarUsinas();
    const [photos, capacities, units] = await Promise.all([
      AsyncStorage.multiGet(plants.map((plant: any) => `foto-card-usina:${plant.id}`)),
      Promise.all(plants.map((plant: any) => consultarAlocacao(plant.id).then(value => value.disponivel).catch(() => null))),
      listarUnidadesGestor().catch(() => []),
    ]);
    const photoMap = new Map(photos);
    const clients = new Map<string, Set<string>>();
    for (const unit of Array.isArray(units) ? units : []) {
      const plantId = String(unit.usina_id ?? unit.usinas?.id ?? "");
      const clientId = String(unit.cliente_id ?? unit.clientes?.id ?? "");
      if (!plantId || !clientId) continue;
      if (!clients.has(plantId)) clients.set(plantId, new Set());
      clients.get(plantId)!.add(clientId);
    }
    return plants.map((plant: any, index: number) => ({ ...plant, quantidade_clientes: clients.get(String(plant.id))?.size ?? 0, capacidade_livre: capacities[index], foto_card_local: photoMap.get(`foto-card-usina:${plant.id}`) || "" }));
  }
  const [units, access] = await Promise.all([listarMinhasUnidades(), listarAcessoContratos().catch(() => [])]);
  const accessMap = new Map(access.map((item: any) => [String(item.id), item]));
  const photos = new Map(await AsyncStorage.multiGet(units.map((unit: any) => `foto-card-uc:${unit.id}`)));
  return units.map((unit: any) => ({ ...unit, ...(accessMap.get(String(unit.id)) ?? {}), foto_card_local: photos.get(`foto-card-uc:${unit.id}`) || "" }));
}
