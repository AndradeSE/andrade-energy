import { View } from 'react-native';

type Props = {
  children: React.ReactNode;
};

export default function DarkCard({ children }: Props) {
  return (
    <View
      style={{
        backgroundColor: 'rgba(255,255,255,0.92)',
        padding: 20,
        borderRadius: 18,
        marginBottom: 15,
      }}
    >
      {children}
    </View>
  );
}