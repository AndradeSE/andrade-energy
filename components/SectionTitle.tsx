import { Text } from 'react-native';

export default function SectionTitle({
  title,
}: {
  title: string;
}) {
  return (
    <Text className="text-lg font-bold mb-3 mt-5">
      {title}
    </Text>
  );
}