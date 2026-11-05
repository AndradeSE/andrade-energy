import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Text } from "react-native";
import FormField from "../components/cadastro/FormField";
import { AppHeader, Button, Card, Screen } from "../components/ui";
import { registrarAutoleitura } from "../services/clientes.service";

export default function Autoleitura() {
  const { id, numero } = useLocalSearchParams<{ id: string; numero: string }>();
  const [leitura, setLeitura] = useState("");
  const [foto, setFoto] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function escolherFoto() {
    try {
      const resultado = await DocumentPicker.getDocumentAsync({
        type: ["image/jpeg", "image/png"], copyToCacheDirectory: true,
      });
      if (resultado.canceled) return;
      const arquivo = resultado.assets[0];
      const info = await FileSystem.getInfoAsync(arquivo.uri);
      if (!info.exists || info.size > 700_000) {
        Alert.alert("Foto muito grande", "Escolha uma imagem JPEG ou PNG de até 700 KB.");
        return;
      }
      setFoto(arquivo);
    } catch {
      Alert.alert("Não foi possível abrir a foto");
    }
  }

  async function salvar() {
    if (!id || !leitura || salvando) return;
    setSalvando(true);
    try {
      const fotoBase64 = foto ? await FileSystem.readAsStringAsync(foto.uri, {
        encoding: FileSystem.EncodingType.Base64,
      }) : undefined;
      await registrarAutoleitura(id, leitura, fotoBase64);
      Alert.alert("Leitura registrada", "A leitura foi salva na Andrade Energy.", [
        { text: "Concluir", onPress: () => router.back() },
      ]);
    } catch (erro: any) {
      Alert.alert("Não foi possível registrar", erro?.response?.data?.message ?? "Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Screen>
      <AppHeader contextTitle="Autoleitura" contextSubtitle="Leitura do medidor" title="Autoleitura do medidor" subtitle={numero ? `UC ${numero}` : "Unidade consumidora"} />
      <Card>
        <Text>Informe os números inteiros exibidos no medidor, em kWh.</Text>
        <FormField label="Leitura atual (kWh)" value={leitura} keyboardType="number-pad"
          onChangeText={(valor) => setLeitura(valor.replace(/\D/g, "").slice(0, 9))} />
        {foto ? <Text numberOfLines={1}>{foto.name}</Text> : null}
        <Button title={foto ? "Remover foto" : "Anexar foto (opcional)"} disabled={salvando}
          onPress={() => foto ? setFoto(null) : void escolherFoto()} />
        <Button title={salvando ? "Registrando..." : "Registrar leitura"} disabled={!id || !leitura || salvando} onPress={salvar} />
      </Card>
    </Screen>
  );
}
