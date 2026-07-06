import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import mobileAds from "react-native-google-mobile-ads";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";
import { useFonts, Jua_400Regular } from "@expo-google-fonts/jua";
import { GowunDodum_400Regular } from "@expo-google-fonts/gowun-dodum";

import { colors } from "./src/theme/colors";
import { AppProvider, useApp } from "./src/state/AppContext";
import { AuthProvider, useAuth } from "./src/state/AuthContext";
import BottomNav from "./src/components/BottomNav";
import AdBanner from "./src/ads/AdBanner";
import HomeScreen from "./src/screens/HomeScreen";
import RecordScreen from "./src/screens/RecordScreen";
import AiScreen from "./src/screens/AiScreen";
import MyScreen from "./src/screens/MyScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import LoginScreen from "./src/screens/LoginScreen";

function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.purple} />
    </View>
  );
}

function Screens() {
  const { screen, subscribed } = useApp();
  const showNav = screen !== "onboarding";
  // Subscribers get an ad-free experience.
  const showAds = showNav && !subscribed;
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

  let body: React.ReactNode;
  if (initializing) body = <Loading />;
  else if (!user) body = <LoginScreen />;
  else
    body = (
      <AppProvider uid={user.uid}>
        <Screens />
      </AppProvider>
    );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {body}
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

export default function App() {
  const [loaded] = useFonts({
    Jua_400Regular,
    GowunDodum_400Regular,
  });

  // Initialize the AdMob SDK once on startup.
  useEffect(() => {
    mobileAds()
      .initialize()
      .catch((e) => console.warn("[ads] init failed", e));
  }, []);

  return (
    <SafeAreaProvider>
      {loaded ? (
        <AuthProvider>
          <Gate />
        </AuthProvider>
      ) : (
        <Loading />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  flex: { flex: 1 },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cream,
  },
});
