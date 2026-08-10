import { Text, View } from "react-native";
import * as ColorsModule from "../theme/colors";
import * as RadiusModule from "../theme/radius";
import * as SpacingModule from "../theme/spacing";


type Props = {
  titulo: string;
  valor: string | number;
icone?: string;};

export default function DashboardCard({
  titulo,
  valor,
  icone,
}: Props) {

  return (
    <View
      style={{
        width: '48%',
        backgroundColor: ColorsModule.colors.surface,
        borderRadius: RadiusModule.radius.md,
        padding: SpacingModule.spacing.md,
        marginBottom: 15,
        elevation: 4,
      }}
    >
      {icone && (
  <Text
    style={{
      fontSize: 28,
    }}
  >
    {icone}
  </Text>
)}

      <Text
        style={{
          color: '#64748b',
          fontSize: 14,
          marginTop: 8,
        }}
      >
        {titulo}
      </Text>

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          color: '#0f172a',
          fontSize: 24,
          fontWeight: 'bold',
          marginTop: 6,
        }}
      >
        {valor}
      </Text>
    </View>
  );
}