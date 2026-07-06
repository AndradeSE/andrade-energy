import { Text, TouchableOpacity } from 'react-native';

type Props = {
  title: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
};

export default function PrimaryButton({
  title,
  onPress,
  color = '#2563eb',
  disabled = false,
}: Props) {
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      style={{
        backgroundColor: disabled ? '#94a3b8' : color,
        padding: 15,
        borderRadius: 10,
        marginTop: 12,
      }}
    >
      <Text
        style={{
          color: 'white',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: 16,
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}