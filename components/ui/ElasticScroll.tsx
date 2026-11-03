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
  removeClippedSubviews = false,
  bounces = true,
  alwaysBounceVertical = true,
  overScrollMode = "always",
  ...props
}: ScrollViewProps) {
  return (
    <NativeScrollView
      {...props}
      removeClippedSubviews={removeClippedSubviews}
      bounces={bounces}
      alwaysBounceVertical={alwaysBounceVertical}
      overScrollMode={overScrollMode}
    />
  );
}

export function ElasticFlatList<ItemT>({
  removeClippedSubviews = false,
  bounces = true,
  alwaysBounceVertical = true,
  overScrollMode = "always",
  ...props
}: FlatListProps<ItemT>) {
  return (
    <NativeFlatList
      {...props}
      removeClippedSubviews={removeClippedSubviews}
      bounces={bounces}
      alwaysBounceVertical={alwaysBounceVertical}
      overScrollMode={overScrollMode}
    />
  );
}
