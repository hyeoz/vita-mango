import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  BannerAd,
  BannerAdSize,
} from "react-native-google-mobile-ads";
import { colors } from "../theme/colors";
import { adUnitIds } from "./config";

// Anchored banner shown above the bottom nav. It collapses to nothing until an
// ad has actually loaded, so we never render an empty grey strip if the ad
// fails (e.g. no fill, offline).
export default function AdBanner() {
  const [loaded, setLoaded] = useState(false);

  return (
    <View style={[styles.wrap, loaded && styles.wrapLoaded]}>
      <BannerAd
        unitId={adUnitIds.banner}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={() => setLoaded(true)}
        onAdFailedToLoad={() => setLoaded(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", backgroundColor: colors.cream },
  wrapLoaded: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
});
