import AsyncStorage from "@react-native-async-storage/async-storage";
import { environmentKeySuffix } from "../config/environment";
const key = (userId: string) => `assistant-account-voice-consent-v2${environmentKeySuffix}:${userId}`;
export async function accountVoiceConsent(userId: string) { return (await AsyncStorage.getItem(key(userId))) === "allowed"; }
export async function setAccountVoiceConsent(userId: string, allowed: boolean) { await AsyncStorage.setItem(key(userId), allowed ? "allowed" : "denied"); }
const audioKey = (userId: string) => `assistant-groq-audio-consent-v1${environmentKeySuffix}:${userId}`;
export async function onlineAudioConsent(userId: string) { return (await AsyncStorage.getItem(audioKey(userId))) === "allowed"; }
export async function setOnlineAudioConsent(userId: string, allowed: boolean) { await AsyncStorage.setItem(audioKey(userId), allowed ? "allowed" : "denied"); }
