import { Text, View } from 'react-native';

type Props = {
  tipo: 'success' | 'warning' | 'danger';
  titulo: string;
};

export default function AlertCard({
  tipo,
  titulo,
}: Props) {

  const cor =
    tipo === 'success'
      ? '#16a34a'
      : tipo === 'warning'
      ? '#f59e0b'
      : '#dc2626';

  const icone =
    tipo === 'success'
      ? '🟢'
      : tipo === 'warning'
      ? '🟡'
      : '🔴';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderLeftWidth: 6,
        borderLeftColor: cor,
        borderRadius: 10,
        padding: 14,
        marginBottom: 10,
      }}
    >
      <Text
        style={{
          fontSize: 18,
          marginRight: 10,
        }}
      >
        {icone}
      </Text>

      <Text
        style={{
          flex: 1,
          color: '#0f172a',
          fontWeight: '600',
        }}
      >
        {titulo}
      </Text>
    </View>
  );
}