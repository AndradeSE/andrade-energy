import {
  FlatList as NativeFlatList,
  type FlatListProps,
  ScrollView as NativeScrollView,
  type ScrollViewProps,
} from "react-native";

import { avisarMovimentoDaTela } from "./headerMotion";

/**
 * Rolagem padrão do app. Mantém o efeito nativo de puxar e soltar em iOS e
 * Android, inclusive quando o conteúdo é menor que a tela.
 */
export function ElasticScrollView({
  bounces = true,
  alwaysBounceVertical = true,
  overScrollMode = "always",
  onScroll,
  scrollEventThrottle = 16,
  ...props
}: ScrollViewProps) {
  return (
    <NativeScrollView
      {...props}
      bounces={bounces}
      alwaysBounceVertical={alwaysBounceVertical}
      overScrollMode={overScrollMode}
      scrollEventThrottle={scrollEventThrottle}
      onScroll={(evento) => {
        avisarMovimentoDaTela();
        onScroll?.(evento);
      }}
    />
  );
}

export function ElasticFlatList<ItemT>({
  bounces = true,
  alwaysBounceVertical = true,
  overScrollMode = "always",
  onScroll,
  scrollEventThrottle = 16,
  ...props
}: FlatListProps<ItemT>) {
  return (
    <NativeFlatList
      {...props}
      bounces={bounces}
      alwaysBounceVertical={alwaysBounceVertical}
      overScrollMode={overScrollMode}
      scrollEventThrottle={scrollEventThrottle}
      onScroll={(evento) => {
        avisarMovimentoDaTela();
        onScroll?.(evento);
      }}
    />
  );
}
