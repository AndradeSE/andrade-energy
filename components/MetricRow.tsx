import { Text, View } from 'react-native';

type Props = {
  titulo: string;
  valor: string | number;
};

export default function MetricRow({
  titulo,
  valor,
}: Props) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
      }}
    >
      <Text
        style={{
          color: '#64748b',
          fontSize: 15,
        }}
      >
        {titulo}
      </Text>

      <Text
        style={{
          color: '#0f172a',
          fontSize: 20,
          fontWeight: 'bold',
        }}
      >
        {valor}
      </Text>
    </View>
  );
}