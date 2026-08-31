import { Text } from 'react-native';

export default function SectionTitle({
  title,
}: {
  title: string;
}) {
  return (
    <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12, marginTop: 20 }}>
      {title}
    </Text>
  );
}
