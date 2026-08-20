import React from "react";
import { StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, Jua_400Regular } from "@expo-google-fonts/jua";
import { GowunDodum_400Regular } from "@expo-google-fonts/gowun-dodum";

import { colors } from "./src/theme/colors";
import { AppProvider, useApp } from "./src/state/AppContext";
import BottomNav from "./src/components/BottomNav";
import AdBanner from "./src/ads/AdBanner";
import { AdsProvider, useAds } from "./src/ads/AdsContext";
import HomeScreen from "./src/screens/HomeScreen";
import RecordScreen from "./src/screens/RecordScreen";
import AiScreen from "./src/screens/AiScreen";
import MyScreen from "./src/screens/MyScreen";
import SurveyScreen from "./src/screens/SurveyScreen";
import SplashScreen from "./src/screens/SplashScreen";

// There is no account and no backend: the survey, the supplement list, and the
// reminders all live on the device. That removes the login gate entirely — the
// app opens straight into the survey on first run and into the home tab after.
function Screens() {
  const { screen, subscribed } = useApp();
  const { ready: adsReady } = useAds();
  // The survey owns the full screen — no nav bar, no banner competing with it.
  const showNav = screen !== "survey";
  const showAds = adsReady && showNav && !subscribed;
  return (
    <>
      <View style={styles.flex}>
        {screen === "home" && <HomeScreen />}
        {screen === "record" && <RecordScreen />}
        {screen === "ai" && <AiScreen />}
        {screen === "my" && <MyScreen />}
        {screen === "survey" && <SurveyScreen />}
      </View>
      {showAds && <AdBanner />}
      {showNav && <BottomNav />}
    </>
  );
}

export default function App() {
  const [loaded] = useFonts({
    Jua_400Regular,
    GowunDodum_400Regular,
  });

  return (
    <SafeAreaProvider>
      {loaded ? (
        <AdsProvider>
          {/* Full-bleed: each screen paints its own gradient edge-to-edge and
              applies safe-area insets to its own content. */}
          <View style={styles.safe}>
            <AppProvider>
              <Screens />
            </AppProvider>
            <StatusBar style="dark" />
          </View>
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
