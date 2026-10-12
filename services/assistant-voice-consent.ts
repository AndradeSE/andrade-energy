import AsyncStorage from "@react-native-async-storage/async-storage";
import { environmentKeySuffix } from "../config/environment";
const key = (userId: string) => `assistant-account-voice-consent-v2${environmentKeySuffix}:${userId}`;
export async function accountVoiceConsent(userId: string) { return (await AsyncStorage.getItem(key(userId))) === "allowed"; }
export async function setAccountVoiceConsent(userId: string, allowed: boolean) { await AsyncStorage.setItem(key(userId), allowed ? "allowed" : "denied"); }
const audioKey = (userId: string) => `assistant-groq-audio-consent-v1${environmentKeySuffix}:${userId}`;
export async function onlineAudioConsent(userId: string) { return (await AsyncStorage.getItem(audioKey(userId))) === "allowed"; }
export async function setOnlineAudioConsent(userId: string, allowed: boolean) { await AsyncStorage.setItem(audioKey(userId), allowed ? "allowed" : "denied"); }
const localWakeKey = (userId: string) => `assistant-local-wake-foreground-v1${environmentKeySuffix}:${userId}`;
export async function automaticLocalWakeConsent(userId: string) { return (await AsyncStorage.getItem(localWakeKey(userId))) === "allowed"; }
export async function setAutomaticLocalWakeConsent(userId: string, allowed: boolean) { await AsyncStorage.setItem(localWakeKey(userId), allowed ? "allowed" : "denied"); }
const liveKey = (userId: string) => `assistant-gemini-live-audio-v1${environmentKeySuffix}:${userId}`;
export async function geminiLiveAudioConsent(userId: string) { return (await AsyncStorage.getItem(liveKey(userId))) === "allowed"; }
export async function setGeminiLiveAudioConsent(userId: string, allowed: boolean) { await AsyncStorage.setItem(liveKey(userId), allowed ? "allowed" : "denied"); }
