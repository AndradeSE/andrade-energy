import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TouchableOpacity } from '../assistant/AssistantNativeControls';
import { Button, Card } from '../ui';
import { Colors, Radius, Spacing } from '../../theme';
import { financialHistory } from '../../utils/financial-history';

const money = (value: number | null) => value === null ? 'Não informado' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const date = (value: string | null) => value ? new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'Data não informada';
const filters = [{ id: 'TODAS', label: 'Todas' }, { id: 'COBRANCA', label: 'Cobranças' }, { id: 'TRANSFERENCIA', label: 'Transferências' }] as const;
export default function HistoricoTransacoes({ cobrancas, transferencias }: { cobrancas?: Record<string, any>[]; transferencias?: Record<string, any>[] }) {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<string>('TODAS');
  const [limit, setLimit] = useState(10);
  const entries = financialHistory(cobrancas, transferencias).filter(item => filter === 'TODAS' || item.kind === filter);
  return <Card>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Histórico de transações" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} style={styles.heading}>
      <Ionicons name="time-outline" size={23} color={Colors.primary}/><Text style={styles.title}>Histórico de transações</Text><Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.primary}/>
    </TouchableOpacity>
    {expanded ? <>
      <Text style={styles.note}>Últimas cobranças Asaas e transferências desta carteira. A data indica a última atualização do registro; um pagamento confirmado pode ainda aguardar liberação do saldo.</Text>
      <View style={styles.filters}>{filters.map(item => <TouchableOpacity key={item.id} accessibilityRole="button" accessibilityLabel={`Histórico: ${item.label}`} accessibilityState={{ selected: filter === item.id }} onPress={() => { setFilter(item.id); setLimit(10); }} style={[styles.filter, filter === item.id && styles.selected]}><Text style={filter === item.id ? styles.selectedText : styles.filterText}>{item.label}</Text></TouchableOpacity>)}</View>
      {!entries.length ? <Text style={styles.note}>Nenhuma transação registrada nesta categoria.</Text> : null}
      {entries.slice(0, limit).map(item => <View key={item.id} style={styles.entry}>
        <View style={styles.row}><Text style={styles.entryTitle}>{item.title}</Text><Text style={[styles.value, item.failed && styles.failed, item.settled && item.kind === 'COBRANCA' && styles.received]}>{item.settled ? item.kind === 'TRANSFERENCIA' ? '− ' : '+ ' : ''}{money(item.amount)}</Text></View>
        <Text style={[styles.status, item.failed && styles.failed]}>{item.status}</Text>
        <Text style={styles.note}>Atualização: {date(item.updatedAt ?? item.createdAt)}</Text>
        {item.kind === 'COBRANCA' ? <View style={styles.details}><Text style={styles.note}>Valor da cobrança: {money(item.gross)}</Text><Text style={styles.note}>{item.settled ? 'Tarifas de recebimento' : 'Tarifas previstas'}: {item.fee === null ? 'não informadas' : money(item.fee)}</Text><Text style={styles.note}>{item.settled ? 'Líquido recebido' : 'Líquido previsto'}: {money(item.net)}</Text></View> : item.destination ? <Text style={styles.note}>Destino: {item.destination}</Text> : null}
        {item.invoiceId ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Abrir fatura da transação" onPress={() => router.push({ pathname: '/faturas/[id]', params: { id: item.invoiceId! } })} style={styles.invoiceLink}><Text style={styles.linkText}>Ver fatura</Text></TouchableOpacity> : null}
      </View>)}
      {entries.length > limit ? <Button title="Mostrar mais transações" onPress={() => setLimit(value => value + 10)}/> : null}
    </> : null}
  </Card>;
}
const styles = StyleSheet.create({
  heading: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 }, title: { flex: 1, color: Colors.text, fontSize: 18, fontWeight: '700' },
  note: { color: Colors.subtitle, fontSize: 12, lineHeight: 18, marginTop: 4 }, filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: Spacing.sm },
  filter: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border }, selected: { backgroundColor: Colors.primary, borderColor: Colors.primary }, selectedText: { color: '#FFF', fontWeight: '700' }, filterText: { color: Colors.text },
  entry: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border, paddingVertical: Spacing.md }, row: { gap: 6 }, entryTitle: { color: Colors.text, fontWeight: '700', fontSize: 15 }, value: { color: Colors.text, fontSize: 20, fontWeight: '800', flexShrink: 1 },
  status: { marginTop: 4, color: Colors.text, fontWeight: '600' }, received: { color: Colors.primary }, failed: { color: Colors.danger }, details: { marginTop: 6 }, invoiceLink: { minHeight: 44, justifyContent: 'center' }, linkText: { color: Colors.primary, fontWeight: '700' },
});
