import { NavigationContext } from "@react-navigation/native";
import { useContext, useEffect, useState } from "react";
import { setAssistantLoading } from "../services/assistant-overlay-visibility";

/** Abas preservadas fora da tela não podem esconder a Solar da tela atual. */
export function useAssistantLoading(active = true) {
  const navigation = useContext(NavigationContext);
  const [focused, setFocused] = useState(() => navigation?.isFocused() ?? true);
  useEffect(() => {
    setFocused(navigation?.isFocused() ?? true);
    if (!navigation) return;
    const focus = navigation.addListener("focus", () => setFocused(true));
    const blur = navigation.addListener("blur", () => setFocused(false));
    return () => { focus(); blur(); };
  }, [navigation]);
  useEffect(() => {
    if (!active || !focused) return;
    setAssistantLoading(true);
    return () => setAssistantLoading(false);
  }, [active, focused]);
}
