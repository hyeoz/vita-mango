import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, Jua_400Regular } from "@expo-google-fonts/jua";
import { GowunDodum_400Regular } from "@expo-google-fonts/gowun-dodum";

import { colors } from "./src/theme/colors";
import { initAppCheck } from "./src/firebase/appCheck";
import { AppProvider, useApp } from "./src/state/AppContext";
import { AuthProvider, useAuth } from "./src/state/AuthContext";
import BottomNav from "./src/components/BottomNav";
import AdBanner from "./src/ads/AdBanner";
import { AdsProvider, useAds } from "./src/ads/AdsContext";
import HomeScreen from "./src/screens/HomeScreen";
import RecordScreen from "./src/screens/RecordScreen";
import AiScreen from "./src/screens/AiScreen";
import MyScreen from "./src/screens/MyScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import LoginScreen from "./src/screens/LoginScreen";
import SplashScreen from "./src/screens/SplashScreen";

function Screens() {
  const { screen, subscribed } = useApp();
  const { ready: adsReady } = useAds();
  const showNav = screen !== "onboarding";
  // Subscribers get an ad-free experience.
  const showAds = adsReady && showNav && !subscribed;
  return (
    <>
      <View style={styles.flex}>
        {screen === "home" && <HomeScreen />}
        {screen === "record" && <RecordScreen />}
        {screen === "ai" && <AiScreen />}
        {screen === "my" && <MyScreen />}
        {screen === "onboarding" && <OnboardingScreen />}
      </View>
      {showAds && <AdBanner />}
      {showNav && <BottomNav />}
    </>
  );
}

// Decides what to show based on auth state: loading → login → the app.
function Gate() {
  const { user, initializing } = useAuth();

  // While auth resolves, show the branded splash (full-bleed, own gradient).
  if (initializing) return <SplashScreen />;

  // The login screen is full-bleed: its gradient fills the whole screen and it
  // handles safe-area insets internally, so it renders outside the SafeAreaView.
  if (!user) {
    return (
      <>
        <LoginScreen />
        <StatusBar style="dark" />
      </>
    );
  }

  // Full-bleed: each screen paints its own gradient edge-to-edge and applies
  // safe-area insets to its own content, so no flat band shows in the insets.
  return (
    <View style={styles.safe}>
      <AppProvider uid={user.uid}>
        <Screens />
      </AppProvider>
      <StatusBar style="dark" />
    </View>
  );
}

export default function App() {
  const [loaded] = useFonts({
    Jua_400Regular,
    GowunDodum_400Regular,
  });

  // Initialize App Check once on startup. AdMob initialization is owned by
  // AdsProvider and starts only after UMP says ads may be requested.
  useEffect(() => {
    initAppCheck();
  }, []);

  return (
    <SafeAreaProvider>
      {loaded ? (
        <AdsProvider>
          <AuthProvider>
            <Gate />
          </AuthProvider>
        </AdsProvider>
      ) : (
        <SplashScreen />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  flex: { flex: 1 },
});
