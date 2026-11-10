import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';

/** A push is persisted by the backend; refresh the authenticated inbox on delivery/return. */
export function useNotificationRefresh(open: boolean) {
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  useEffect(() => {
    const state = AppState.addEventListener('change', value => { if (value === 'active') refresh(); });
    let closed = false;
    let subscriptions: Array<{remove():void}> = [];
    if (Platform.OS !== 'web') void import('expo-notifications').then(notifications => {
      if (closed) return;
      subscriptions = [notifications.addNotificationReceivedListener(refresh), notifications.addNotificationResponseReceivedListener(refresh)];
    }).catch(() => undefined);
    return () => { closed = true; state.remove(); subscriptions.forEach(value => value.remove()); };
  }, [refresh]);
  useEffect(() => {
    if (!open) return;
    refresh();
    const timer = setInterval(refresh, 60_000);
    return () => clearInterval(timer);
  }, [open, refresh]);
  return revision;
}
