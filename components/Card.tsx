import { View } from 'react-native';

export default function Card({
  children,
}: {
  children: React.ReactNode;
}) {
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
<Card>
  <View
  style={{
    backgroundColor:'rgba(255,255,255,0.95)',
    padding:20,
    borderRadius:18,
  }}
></View>

  <View
  style={{
    backgroundColor: '#0f172a',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  }}
  ></View>
  
</Card>