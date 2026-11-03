import { Platform } from "react-native";
import * as Updates from "expo-updates";

// Never enable the affected native control through an OTA flag on old APKs.
export const nativeRefreshSafe = Platform.OS !== "android" || Boolean(Updates.runtimeVersion?.endsWith("-refresh-fixed"));
