import { isValidElement } from "react";
import { useAndroidPullRefresh } from "../../hooks/useAndroidPullRefresh";
import { GestureDetector } from "react-native-gesture-handler";
import { nativeRefreshSafe } from "../../config/native-refresh";
import {
  Platform,
  FlatList as NativeFlatList,
  type FlatListProps,
  ScrollView as NativeScrollView,
  type ScrollViewProps,
} from "react-native";

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
  const pull = useAndroidPullRefresh(refresh?.onRefresh, refresh?.refreshing, props);
  if (nativeRefreshSafe) return <NativeScrollView {...props} refreshControl={refreshControl} removeClippedSubviews={removeClippedSubviews} bounces={bounces} alwaysBounceVertical={alwaysBounceVertical} overScrollMode={overScrollMode}>{children}</NativeScrollView>;
  return (
    <GestureDetector gesture={pull.gesture}><NativeScrollView
      {...props}
      {...pull.handlers}
      refreshControl={Platform.OS === "android" ? undefined : refreshControl}
      removeClippedSubviews={removeClippedSubviews}
      bounces={bounces}
      alwaysBounceVertical={alwaysBounceVertical}
      overScrollMode={overScrollMode}
    >
      {pull.indicator}
      {children}
    </NativeScrollView></GestureDetector>
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
  const pull = useAndroidPullRefresh(refresh?.onRefresh, refresh?.refreshing, props);
  if (nativeRefreshSafe) return <NativeFlatList {...props} refreshControl={refreshControl} onRefresh={onRefresh} refreshing={refreshing} ListHeaderComponent={Header} removeClippedSubviews={removeClippedSubviews} bounces={bounces} alwaysBounceVertical={alwaysBounceVertical} overScrollMode={overScrollMode} />;
  return (
    <GestureDetector gesture={pull.gesture}><NativeFlatList
      {...props}
      {...pull.handlers}
      refreshControl={Platform.OS === "android" ? undefined : refreshControl}
      onRefresh={Platform.OS === "android" ? undefined : onRefresh}
      refreshing={Platform.OS === "android" ? undefined : refreshing}
      ListHeaderComponent={Platform.OS === "android" && refresh?.onRefresh ? <>{pull.indicator}{isValidElement(Header) ? Header : Header ? <Header /> : null}</> : Header}
      removeClippedSubviews={removeClippedSubviews}
      bounces={bounces}
      alwaysBounceVertical={alwaysBounceVertical}
      overScrollMode={overScrollMode}
    /></GestureDetector>
  );
}
