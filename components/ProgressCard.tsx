import { Text, View } from 'react-native';

type Props = {
  title: string;
  value: number;
};

export default function ProgressCard({ title, value }: Props) {
  return (
    <View
      className="bg-white rounded-2xl p-4 mb-3"
      style={{ elevation: 2 }}
    >
      <Text className="text-gray-700 font-semibold mb-2">
        {title}
      </Text>

      <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
        <View
          className="bg-green-500 h-3 rounded-full"
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </View>

      <Text className="mt-2 text-right font-bold">
        {value.toFixed(1)}%
      </Text>
    </View>
  );
}