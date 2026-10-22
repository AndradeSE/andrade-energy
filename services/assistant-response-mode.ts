import AsyncStorage from "@react-native-async-storage/async-storage";
export type AssistantResponseMode = "online" | "local";
export async function loadAssistantResponseMode(userId: string): Promise<AssistantResponseMode> {
  if (!userId) return "online";
  return await AsyncStorage.getItem(`solar:response-mode:${userId}`) === "local" ? "local" : "online";
}
export async function saveAssistantResponseMode(userId: string, mode: AssistantResponseMode) {
  if (!userId) throw new Error("Entre na sua conta para salvar a preferência.");
  await AsyncStorage.setItem(`solar:response-mode:${userId}`, mode);
}
