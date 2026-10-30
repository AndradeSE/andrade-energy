import React, { forwardRef, useContext, useEffect, useRef } from "react";
import { NavigationContext } from "@react-navigation/native";
import { Pressable as NativePressable, TouchableOpacity as NativeTouchableOpacity, TextInput as NativeTextInput, Switch as NativeSwitch, type SwitchProps, type PressableProps, type TouchableOpacityProps, type TextInputProps, type GestureResponderEvent } from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { registerSolarControl, solarControlScope } from "../../services/assistant-controls";

function textOf(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(" ");
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return textOf(node.props.children);
  return "";
}
function useControl(label: string, kind: "field" | "button", enabled: boolean, invoke: (value?: string) => void, secret = false, maxLength?: number) {
  const { usuario, usinaSelecionada, unidadeSelecionada } = useAuth();
  const navigation = useContext(NavigationContext);
  const id = useRef(`solar-control-${Math.random().toString(36).slice(2)}`);
  const scope = solarControlScope(usuario, usinaSelecionada?.id, unidadeSelecionada?.id);
  useEffect(() => {
    if (!scope || !navigation || !enabled || !label.trim()) return;
    let focused = navigation.isFocused();
    const offFocus = navigation.addListener("focus", () => { focused = true; });
    const offBlur = navigation.addListener("blur", () => { focused = false; });
    const unregister = registerSolarControl({ id: id.current, label: label.trim().slice(0, 180), scope, kind, secret, maxLength, active: () => focused && navigation.isFocused(), invoke });
    return () => { unregister(); offFocus(); offBlur(); };
  }, [scope, navigation, enabled, label, kind, secret, maxLength, invoke]);
}
const pressEvent = () => ({ nativeEvent: {}, preventDefault() {}, stopPropagation() {}, persist() {}, isDefaultPrevented: () => false, isPropagationStopped: () => false } as unknown as GestureResponderEvent);

export const Pressable = forwardRef<React.ElementRef<typeof NativePressable>, PressableProps>((props, ref) => {
  const label = props.accessibilityLabel ?? textOf(typeof props.children === "function" ? undefined : props.children);
  useControl(label, "button", !props.disabled && Boolean(props.onPress) && props.onPress!.length === 0, () => { props.onPress?.(pressEvent()); });
  return <NativePressable {...props} ref={ref} />;
});
export const TouchableOpacity = forwardRef<React.ElementRef<typeof NativeTouchableOpacity>, TouchableOpacityProps>((props, ref) => {
  useControl(props.accessibilityLabel ?? textOf(props.children), "button", !props.disabled && Boolean(props.onPress) && props.onPress!.length === 0, () => { props.onPress?.(pressEvent()); });
  return <NativeTouchableOpacity {...props} ref={ref} />;
});
export type TextInput = NativeTextInput;
export const TextInput = forwardRef<NativeTextInput, TextInputProps>((props, ref) => {
  useControl(props.accessibilityLabel ?? props.placeholder ?? "", "field", props.editable !== false && Boolean(props.onChangeText), value => { props.onChangeText?.(value ?? ""); }, props.secureTextEntry === true || /password|oneTimeCode/i.test(String(props.textContentType)), props.maxLength);
  return <NativeTextInput {...props} ref={ref} />;
});
export const Switch = forwardRef<React.ElementRef<typeof NativeSwitch>, SwitchProps>((props, ref) => {
  useControl(props.accessibilityLabel ?? "", "button", !props.disabled && Boolean(props.onValueChange), () => { props.onValueChange?.(!props.value); });
  return <NativeSwitch {...props} ref={ref} />;
});
