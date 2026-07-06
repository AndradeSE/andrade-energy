import { ReactNode } from 'react';
import { Text, View } from 'react-native';


type Props = {
  titulo: string;
  icone: string;
  children: ReactNode;
};

export default function DashboardSection({
  titulo,
  icone,
  children,
}: Props) {
  return (
    <View
      style={{
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 18,
        padding: 20,
        marginTop: 20,
      }}
    >
      <Text
        style={{
          fontSize: 20,
          fontWeight: 'bold',
          color: '#0f172a',
          marginBottom: 15,
        }}
      >
        {icone} {titulo}
      </Text>

      {children}
    </View>
  );
}

