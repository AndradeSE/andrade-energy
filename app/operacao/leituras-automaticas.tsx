import { Redirect, useLocalSearchParams } from "expo-router";
export default function LeiturasAutomaticas() {
  const { usinaId } = useLocalSearchParams<{ usinaId?: string }>();
  return <Redirect href={{ pathname: "/operacao/rateio", params: { ...(typeof usinaId === "string" ? { usinaId } : {}), secao: "leituras" } } as any} />;
}
