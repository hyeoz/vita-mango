import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { fonts } from "../theme/fonts";
import { useApp, Screen } from "../state/AppContext";

const TABS: { key: Screen; icon: string; label: string }[] = [
  { key: "home", icon: "🏠", label: "홈" },
  { key: "record", icon: "📔", label: "기록" },
  { key: "ai", icon: "🔮", label: "AI추천" },
  { key: "my", icon: "🥭", label: "젤리" },
];

export default function BottomNav() {
  const { screen, setScreen } = useApp();
  return (
    <View style={styles.bar}>
      {TABS.map((t) => {
        const active = screen === t.key;
        return (
          <Pressable key={t.key} style={styles.tab} onPress={() => setScreen(t.key)}>
            <Text style={styles.icon}>{t.icon}</Text>
            <Text
              style={[styles.label, { color: active ? colors.purple : colors.muted4 }]}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 86,
    backgroundColor: "rgba(255,250,244,0.96)",
    borderTopWidth: 2.5,
    borderTopColor: colors.ink,
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 11,
    paddingHorizontal: 8,
  },
  tab: { flex: 1, alignItems: "center", gap: 3 },
  icon: { fontSize: 21 },
  label: { fontFamily: fonts.display, fontSize: 11 },
});
