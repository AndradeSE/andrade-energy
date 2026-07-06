import { Text, View } from 'react-native';

type Props = {
  titulo: string;
  subtitulo?: string;
};

export default function PageHeader({
  titulo,
  subtitulo,
}: Props) {
  return (
    <View
      style={{
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderRadius: 18,
        padding: 22,
        marginBottom: 20,
        elevation: 4,
      }}
    >
      <Text
        style={{
          fontSize: 30,
          fontWeight: 'bold',
          color: '#0f172a',
        }}
      >
        {titulo}
      </Text>

      {subtitulo ? (
        <Text
          style={{
            color: '#64748b',
            fontSize: 16,
            marginTop: 6,
          }}
        >
          {subtitulo}
        </Text>
      ) : null}
    </View>
  );
}