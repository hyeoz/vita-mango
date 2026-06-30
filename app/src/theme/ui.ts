import { StyleSheet, ViewStyle } from "react-native";
import { colors } from "./colors";

// The design's signature "chunky card" — thick ink outline + hard offset shadow.
export function hardShadow(dx = 4, dy = 5, opacity = 0.1): ViewStyle {
  return {
    shadowColor: colors.ink,
    shadowOpacity: opacity,
    shadowOffset: { width: dx, height: dy },
    shadowRadius: 0,
    elevation: 3,
  };
}

export const card: ViewStyle = {
  backgroundColor: colors.white,
  borderWidth: 2.5,
  borderColor: colors.ink,
  borderRadius: 22,
  padding: 16,
  ...hardShadow(),
};

export const ui = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 24 },
});
