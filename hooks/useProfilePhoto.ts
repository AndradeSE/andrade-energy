import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

export function useProfilePhoto(userId?: string) {
  const [uri, setUri] = useState("");
  useFocusEffect(useCallback(() => {
    let active = true;
    void AsyncStorage.getItem(`foto-perfil:${userId ?? "usuario"}`).then((value) => { if (active) setUri(value ?? ""); });
    return () => { active = false; };
  }, [userId]));
  return uri;
}
