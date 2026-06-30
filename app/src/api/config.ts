import { Platform } from "react-native";

// Base URL of the backend proxy that talks to the Claude API.
// Override with EXPO_PUBLIC_API_URL when running on a device/emulator so it can
// reach your dev machine (e.g. http://192.168.0.10:4000).
//
// Defaults:
//  - Android emulator reaches the host via 10.0.2.2
//  - iOS simulator / web reach it via localhost
const fallback =
  Platform.OS === "android" ? "http://10.0.2.2:4000" : "http://localhost:4000";

export const API_URL = process.env.EXPO_PUBLIC_API_URL || fallback;
