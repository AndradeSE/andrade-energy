import { router, useLocalSearchParams } from "expo-router";
import InvoiceDocumentViewer from "../components/faturas/InvoiceDocumentViewer";

export default function DocumentoFatura() {
  const { uri, faturaId, tipo } = useLocalSearchParams<{ uri: string; faturaId: string; tipo: string }>();
  return <InvoiceDocumentViewer uri={uri} faturaId={faturaId} tipo={tipo} onClose={() => router.back()} />;
}
