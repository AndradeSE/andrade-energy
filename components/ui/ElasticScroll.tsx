import {
  FlatList as NativeFlatList,
  type FlatListProps,
  ScrollView as NativeScrollView,
  type ScrollViewProps,
} from "react-native";

/**
 * Rolagem padrão do app. Mantém o efeito nativo de puxar e soltar em iOS e
 * Android, inclusive quando o conteúdo é menor que a tela.
 */
export function ElasticScrollView({
  bounces = true,
  alwaysBounceVertical = true,
  overScrollMode = "always",
  ...props
}: ScrollViewProps) {
  return (
    <NativeScrollView
      {...props}
      bounces={bounces}
      alwaysBounceVertical={alwaysBounceVertical}
      overScrollMode={overScrollMode}
    />
  );
}

export function ElasticFlatList<ItemT>({
  bounces = true,
  alwaysBounceVertical = true,
  overScrollMode = "always",
  ...props
}: FlatListProps<ItemT>) {
  return (
    <NativeFlatList
      {...props}
      bounces={bounces}
      alwaysBounceVertical={alwaysBounceVertical}
      overScrollMode={overScrollMode}
    />
  );
}
