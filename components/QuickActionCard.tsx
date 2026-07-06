import { Pressable, Text } from 'react-native';

type Props = {
  icon: React.ReactNode;
  title: string;
  onPress: () => void;
};

export default function QuickActionCard({
  icon,
  title,
  onPress,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl p-4 items-center flex-1 mx-1"
      style={{ elevation: 2 }}
    >
      {icon}

      <Text className="mt-2 text-center font-semibold">
        {title}
      </Text>
    </Pressable>
  );
}