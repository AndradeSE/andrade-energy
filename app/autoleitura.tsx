import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { requireOptionalNativeModule } from "expo-modules-core";
import { useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useFaturas } from "../hooks/useFaturas";
import { janelaLeitura, proximaLeituraDaUnidade } from "../utils/janela-leitura";
import { Colors, Spacing } from "../theme";
import { ElasticScrollView as ScrollView } from "../components/ui/ElasticScroll";
import FormField from "../components/cadastro/FormField";
import { AppHeader, Button, Card, Screen } from "../components/ui";
import { extrairLeituraMedidor, registrarAutoleitura } from "../services/clientes.service";

export default function Autoleitura() {
  const { id, numero } = useLocalSearchParams<{ id: string; numero: string }>();
  const [leitura, setLeitura] = useState("");
  const [foto, setFoto] = useState<Pick<DocumentPicker.DocumentPickerAsset, "uri" | "name" | "mimeType"> | null>(null);
  const [salvando, setSalvando] = useState(false);
  const { data: faturas, isLoading: consultandoPrazo } = useFaturas();
  const janela = janelaLeitura(proximaLeituraDaUnidade(faturas, id, numero));

  const camera = useRef<import("expo-camera").CameraView>(null);
  const [cameraAberta, setCameraAberta] = useState(false);
  const [lanterna, setLanterna] = useState(false);
  const [cameraPronta, setCameraPronta] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState("");
  const emAndamento = useRef(false);
  const CameraView = cameraAberta ? (require("expo-camera") as typeof import("expo-camera")).CameraView : null;

  async function processarArquivo(selecionar: () => Promise<Pick<DocumentPicker.DocumentPickerAsset, "uri" | "name" | "mimeType"> | undefined>) {
    if (!id || emAndamento.current) return;
    emAndamento.current = true;
    setOcupado(true);
    try {
      const arquivo = await selecionar();
      if (!arquivo) return;
      setCameraAberta(false);
      setFoto(arquivo);
      setLeitura("");
      setAviso("");
      const info = await FileSystem.getInfoAsync(arquivo.uri);
      if (!info.exists || info.size > 700_000) {
        setAviso("Escolha um arquivo de até 700 KB ou digite a leitura.");
        return;
      }
      const base64 = await FileSystem.readAsStringAsync(arquivo.uri, { encoding: FileSystem.EncodingType.Base64 });
      const valor = await extrairLeituraMedidor(id, base64);
      if (!valor || !/^\d{1,9}$/.test(valor)) {
        setAviso("Não foi possível reconhecer os números. Tire outra foto, escolha outro PDF ou digite a leitura.");
        return;
      }
      setLeitura(valor);
      if (!janela.permitida) {
        setAviso("Leitura reconhecida. O envio está disponível apenas no período de leitura.");
        return;
      }
      await salvar(valor, arquivo.mimeType === "application/pdf" || /\.pdf$/i.test(arquivo.name) ? undefined : base64);
    } catch {
      setAviso("Não foi possível analisar o arquivo. Tente outro arquivo ou digite a leitura.");
    } finally {
      emAndamento.current = false;
      setOcupado(false);
    }
  }

  async function abrirCamera() {
    try {
      if (!requireOptionalNativeModule("ExpoCamera")) {
        Alert.alert("Atualize o app para tirar fotos ou escolha um arquivo.");
        return;
      }
      const { Camera } = require("expo-camera") as typeof import("expo-camera");
      if (!(await Camera.requestCameraPermissionsAsync()).granted) {
        Alert.alert("Permita o acesso à câmera para tirar a foto.");
        return;
      }
      setLanterna(false);
      setCameraPronta(false);
      setCameraAberta(true);
    } catch {
      Alert.alert("Não foi possível abrir a câmera.");
    }
  }

  async function salvar(valor = leitura, fotoBase64?: string) {
    if (!id || !valor || salvando || !janela.permitida) return;
    setSalvando(true);
    try {
      await registrarAutoleitura(id, valor, fotoBase64);
      Alert.alert("Leitura recebida", "A leitura foi registrada na Andrade Energy. O envio à Cemig e o protocolo serão informados no histórico; este registro ainda não confirma o envio à concessionária.", [
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
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.md }}><Card style={{ gap: Spacing.md }}>
        <Text>Informe os números inteiros exibidos no medidor, em kWh.</Text>
        <Text style={{ color: Colors.subtitle }}>{consultandoPrazo ? "Consultando período de leitura..." : janela.texto}</Text>
        <FormField label="Leitura atual (kWh)" value={leitura} editable={!ocupado && !salvando} keyboardType="number-pad"
          onChangeText={(valor) => setLeitura(valor.replace(/\D/g, "").slice(0, 9))} />
        {foto ? <Text numberOfLines={1}>{foto.name}</Text> : null}
        {ocupado || aviso ? <Text accessibilityLiveRegion="polite">{ocupado ? "Analisando leitura…" : aviso}</Text> : null}
        <AcaoLeitura titulo="Tirar foto" icone="camera-outline" disabled={!id || ocupado || salvando} onPress={abrirCamera} />
        <AcaoLeitura titulo="Escolher foto ou PDF" icone="attach-outline" disabled={!id || ocupado || salvando} onPress={() => void processarArquivo(async () => {
          const resultado = await DocumentPicker.getDocumentAsync({ type: ["image/jpeg", "image/png", "application/pdf"], copyToCacheDirectory: true });
          return resultado.canceled ? undefined : resultado.assets[0];
        })} />
        <AcaoLeitura icone="send-outline" titulo={salvando ? "Registrando..." : "Registrar leitura"} disabled={!id || !leitura || ocupado || salvando || consultandoPrazo || !janela.permitida} onPress={() => void salvar()} />
        <Modal visible={cameraAberta} onRequestClose={() => { if (!ocupado) setCameraAberta(false); }}>
          <Screen>
            {CameraView ? <CameraView ref={camera} style={{ flex: 1 }} facing="back" enableTorch={lanterna} onCameraReady={() => setCameraPronta(true)} onMountError={() => {
              setCameraAberta(false);
              setAviso("Não foi possível iniciar a câmera. Escolha um arquivo ou digite a leitura.");
            }} /> : null}
            <View style={styles.cameraControls}>
              <Pressable accessibilityRole="button" accessibilityLabel="Cancelar" disabled={ocupado}
                onPress={() => setCameraAberta(false)} style={styles.cameraAction}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={janela.permitida ? "Capturar e enviar leitura" : "Capturar leitura"}
                disabled={!cameraPronta || ocupado} style={[styles.shutter, (!cameraPronta || ocupado) && styles.disabled]}
                onPress={() => void processarArquivo(async () => {
                  const captura = await camera.current?.takePictureAsync({ quality: 0.55 });
                  return captura ? { uri: captura.uri, name: "medidor.jpg", mimeType: "image/jpeg" } : undefined;
                })}>
                <Ionicons name="camera-outline" size={27} color="#fff" />
              </Pressable>
              <Pressable accessibilityRole="switch" accessibilityLabel="Flash" accessibilityState={{ checked: lanterna }}
                disabled={!cameraPronta || ocupado} onPress={() => setLanterna(valor => !valor)}
                style={[styles.cameraAction, lanterna && styles.flashActive, (!cameraPronta || ocupado) && styles.disabled]}>
                <Ionicons name={lanterna ? "flash" : "flash-off-outline"} size={23} color={lanterna ? "#fff" : Colors.text} />
              </Pressable>
            </View>
          </Screen>
        </Modal>
        <AcaoLeitura titulo="Histórico de leituras e protocolos" icone="time-outline" disabled={salvando} onPress={() => router.push("/historico-autoleituras")} />
      </Card></ScrollView>
    </Screen>
  );
}

function AcaoLeitura({ titulo, icone, disabled, onPress }: {
  titulo: string;
  icone: keyof typeof Ionicons.glyphMap;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Button title={titulo} icon={<Ionicons name={icone} size={20} color="#fff" />}
      accessibilityRole="button" disabled={disabled} onPress={onPress} />
  );
}

const styles = StyleSheet.create({
  cameraControls: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
  },
  cameraAction: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  shutter: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  flashActive: { backgroundColor: Colors.primaryDark },
  disabled: { opacity: 0.45 },
});