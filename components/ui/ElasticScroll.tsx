import { isValidElement } from "react";
import {
  Platform,
  Pressable,
  Text,
  FlatList as NativeFlatList,
  type FlatListProps,
  ScrollView as NativeScrollView,
  type ScrollViewProps,
} from "react-native";

function RefreshAction({ onRefresh, refreshing }: { onRefresh?: (() => void) | null; refreshing?: boolean | null }) {
  if (!onRefresh) return null;
  return <Pressable accessibilityRole="button" accessibilityLabel="Atualizar dados" disabled={refreshing} onPress={onRefresh} style={{ alignSelf: "flex-end", padding: 12 }}><Text style={{ color: "#087A46" }}>{refreshing ? "Atualizando…" : "Atualizar"}</Text></Pressable>;
}

/**
 * Android usa atualização explícita: SwipeRefreshLayout junto ao native stack
 * pode invalidar a ordem dos filhos durante transições (screens #4513).
 * iOS preserva o controle nativo de atualização.
 */
export function ElasticScrollView({
  refreshControl,
  children,
  removeClippedSubviews = false,
  bounces = true,
  alwaysBounceVertical = true,
  overScrollMode = "always",
  ...props
}: ScrollViewProps) {
  const refresh = isValidElement<{ onRefresh?: () => void; refreshing?: boolean }>(refreshControl) ? refreshControl.props : undefined;
  return (
    <NativeScrollView
      {...props}
      refreshControl={Platform.OS === "android" ? undefined : refreshControl}
      removeClippedSubviews={removeClippedSubviews}
      bounces={bounces}
      alwaysBounceVertical={alwaysBounceVertical}
      overScrollMode={overScrollMode}
    >
      {Platform.OS === "android" ? <RefreshAction {...refresh} /> : null}
      {children}
    </NativeScrollView>
  );
}

export function ElasticFlatList<ItemT>({
  refreshControl,
  onRefresh,
  refreshing,
  ListHeaderComponent,
  removeClippedSubviews = false,
  bounces = true,
  alwaysBounceVertical = true,
  overScrollMode = "always",
  ...props
}: FlatListProps<ItemT>) {
  const refresh = isValidElement<{ onRefresh?: () => void; refreshing?: boolean }>(refreshControl) ? refreshControl.props : { onRefresh, refreshing };
  const Header = ListHeaderComponent;
  return (
    <NativeFlatList
      {...props}
      refreshControl={Platform.OS === "android" ? undefined : refreshControl}
      onRefresh={Platform.OS === "android" ? undefined : onRefresh}
      refreshing={Platform.OS === "android" ? undefined : refreshing}
      ListHeaderComponent={Platform.OS === "android" && refresh?.onRefresh ? <><RefreshAction {...refresh} />{isValidElement(Header) ? Header : Header ? <Header /> : null}</> : Header}
      removeClippedSubviews={removeClippedSubviews}
      bounces={bounces}
      alwaysBounceVertical={alwaysBounceVertical}
      overScrollMode={overScrollMode}
    />
  );
}
