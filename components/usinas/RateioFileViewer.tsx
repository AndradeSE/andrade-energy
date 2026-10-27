import { useState } from 'react';
import { Alert, Modal, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Button } from '../ui';
import { Colors } from '../../theme';

/** Preserve quoted separators, escaped quotes and embedded newlines. */
export function parseRateioCsv(csv: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false;
  const source = csv.replace(/^\uFEFF/, '');
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '"') {
      if (quoted && source[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (c === ';' && !quoted) { row.push(cell); cell = ''; }
    else if ((c === '\r' || c === '\n') && !quoted) {
      if (c === '\r' && source[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export default function RateioFileViewer({ arquivo, onClose }: {
  arquivo?: { arquivo: string; csv: string }; onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  if (!arquivo) return null;
  const plano = arquivo;
  const nome = plano.arquivo.replace(/[^\p{L}\p{N}._-]/gu, '_');
  const rows = parseRateioCsv(plano.csv);
  async function action(share: boolean) {
    if (busy) return; setBusy(true);
    try {
      if (!share && Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([plano.csv], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a'); link.href = url; link.download = nome; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else if (!share && Platform.OS === 'android') {
        const folder = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!folder.granted) return;
        const uri = await FileSystem.StorageAccessFramework.createFileAsync(folder.directoryUri, nome, 'text/csv');
        await FileSystem.writeAsStringAsync(uri, plano.csv, { encoding: FileSystem.EncodingType.UTF8 });
        Alert.alert('Arquivo salvo', 'A planilha foi salva na pasta escolhida.');
      } else {
        const directory = share ? FileSystem.cacheDirectory : FileSystem.documentDirectory;
        if (!directory) throw new Error('Armazenamento indisponível.');
        const uri = directory + nome;
        await FileSystem.writeAsStringAsync(uri, plano.csv, { encoding: FileSystem.EncodingType.UTF8 });
        if (share) {
          if (!await Sharing.isAvailableAsync()) throw new Error('Compartilhamento indisponível.');
          await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Compartilhar planilha de rateio' });
        } else Alert.alert('Arquivo salvo', 'Cópia salva nos documentos do aplicativo.');
      }
    } catch { Alert.alert('Não foi possível concluir', 'Tente novamente. A planilha continua disponível para leitura.'); }
    finally { setBusy(false); }
  }
  return <Modal visible onRequestClose={onClose} animationType="slide">
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ padding: 16, gap: 10 }}>
        <Text style={{ color: Colors.text, fontSize: 20, fontWeight: '700' }}>Planilha de rateio</Text>
        <Text style={{ color: Colors.subtitle }}>{plano.arquivo}</Text>
        <Button title="Fechar planilha" onPress={onClose} />
      </View>
      <ScrollView style={{ flex: 1 }}><ScrollView horizontal contentContainerStyle={{ padding: 16 }}>
        <View>{rows.map((row, r) => <View key={r} style={{ flexDirection: 'row', backgroundColor: r % 2 ? '#F0F7F3' : '#fff' }}>
          {row.map((cell, c) => <Text selectable key={c} style={{ width: 190, padding: 12, borderWidth: 0.5, borderColor: Colors.border, color: Colors.text }}>{cell || '—'}</Text>)}
        </View>)}</View>
      </ScrollView></ScrollView>
      <View style={{ padding: 16, gap: 8 }}>
        <Button title="Salvar arquivo" disabled={busy} onPress={() => void action(false)} />
        <Button title="Compartilhar arquivo" disabled={busy} onPress={() => void action(true)} />
      </View>
    </SafeAreaView>
  </Modal>;
}
