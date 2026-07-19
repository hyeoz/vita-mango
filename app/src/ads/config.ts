import { Platform } from "react-native";
import { TestIds } from "react-native-google-mobile-ads";

// AdMob unit IDs.
//
// During development (`__DEV__ === true`) we ALWAYS serve Google's test units.
// Never let a real ad unit run in a dev/debug build — tapping your own live ad
// gets the AdMob account suspended. Real units are only used in release builds.
//
// Fill the REAL_* values below with the ad unit IDs from your AdMob console
// (Apps → your app → Ad units). The App IDs (ca-app-pub-XXXX~YYYY) go in
// app.json under the react-native-google-mobile-ads plugin, not here.

const REAL = {
  banner: Platform.select({
    android: "ca-app-pub-6998718430585981/4956890732", // Android 배너
    ios: "ca-app-pub-6998718430585981/6854214771", //     iOS 배너
    default: "",
  })!,
  interstitial: Platform.select({
    android: "ca-app-pub-6998718430585981/5441060751", // Android 전면
    ios: "ca-app-pub-6998718430585981/1570098503", //     iOS 전면
    default: "",
  })!,
};

export const adUnitIds = {
  banner: __DEV__ ? TestIds.BANNER : REAL.banner,
  interstitial: __DEV__ ? TestIds.INTERSTITIAL : REAL.interstitial,
};
