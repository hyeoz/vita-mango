import { Platform } from "react-native";

// Base URL of the backend proxy that talks to the Gemini API (Firebase Cloud
// Functions; paths /api/recommend and /api/timing). Set EXPO_PUBLIC_API_URL to:
//  - production: the Firebase Hosting URL, e.g. https://vita-mango.web.app
//  - physical device on your LAN: http://<your-machine-ip>:4000 (local server)
//    or the emulator URL http://<ip>:5001/vita-mango/asia-northeast3/api
//
// The localhost fallback below is for the simulator/emulator against a local
// server (server/ or `firebase emulators:start`).
const fallback =
  Platform.OS === "android" ? "http://10.0.2.2:4000" : "http://localhost:4000";

export const API_URL = process.env.EXPO_PUBLIC_API_URL || fallback;
