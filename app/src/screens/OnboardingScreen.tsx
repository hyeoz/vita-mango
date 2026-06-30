import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, suppColor } from "../theme/colors";
import { fonts } from "../theme/fonts";
import { hardShadow } from "../theme/ui";
import Jelly from "../components/Jelly";
import { PillSwatch } from "../components/Pill";
import { useApp } from "../state/AppContext";

const CATALOG = [
  "비타민 C",
  "오메가-3",
  "비타민 D",
  "마그네슘",
  "유산균",
  "아연",
];

export default function OnboardingScreen() {
  const { onbSelected, toggleOnb, completeOnboarding } = useApp();

  return (
    <LinearGradient colors={["#e7f8ff", "#f6fcff"]} locations={[0, 0.6]} style={styles.fill}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.jellyWrap}>
            <Jelly mood="happy" width={120} />
          </View>
        </View>

        <View style={styles.speech}>
          <View style={styles.speechTip} />
          <Text style={styles.greet}>안녕! 나는 젤리야 🫧</Text>
          <Text style={styles.greetSub}>지금 챙겨 먹는 영양제를 골라줘</Text>
        </View>

        <View style={styles.grid}>
          {CATALOG.map((name) => {
            const selected = onbSelected.includes(name);
            return (
              <Pressable
                key={name}
                onPress={() => toggleOnb(name)}
                style={[
                  styles.card,
                  { backgroundColor: selected ? "#fff3f8" : colors.white },
                ]}
              >
                <PillSwatch color={suppColor[name] ?? colors.purple} width={36} height={18} border={2} />
                <Text style={styles.cardName}>{name}</Text>
                <View
                  style={[
                    styles.check,
                    { backgroundColor: selected ? colors.purple : colors.white },
                  ]}
                >
                  <Text style={{ color: selected ? colors.white : "#cfc6da", fontSize: 13 }}>
                    {selected ? "✓" : "+"}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.finish} onPress={completeOnboarding}>
          <Text style={styles.finishText}>다 골랐어!  ({onbSelected.length}개)</Text>
        </Pressable>
        <Text style={styles.footer}>언제든 마이페이지에서 추가할 수 있어요</Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 30, flexGrow: 1 },
  hero: { height: 140, marginTop: 6 },
  jellyWrap: { position: "absolute", left: "50%", top: 6, marginLeft: -60 },
  speech: {
    backgroundColor: colors.white,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    ...hardShadow(),
  },
  speechTip: {
    position: "absolute",
    top: -9,
    left: "50%",
    marginLeft: -8,
    width: 15,
    height: 15,
    backgroundColor: colors.white,
    borderLeftWidth: 2.5,
    borderTopWidth: 2.5,
    borderColor: colors.ink,
    transform: [{ rotate: "45deg" }],
  },
  greet: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  greetSub: { fontFamily: fonts.body, fontSize: 14, color: colors.muted3, marginTop: 4 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 20,
  },
  card: {
    width: "47.5%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 16,
    padding: 12,
    ...hardShadow(3, 3, 0.08),
  },
  cardName: { flex: 1, fontFamily: fonts.display, fontSize: 13.5, color: colors.ink },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  finish: {
    marginTop: 28,
    height: 52,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 18,
    backgroundColor: colors.purple,
    alignItems: "center",
    justifyContent: "center",
    ...hardShadow(4, 5, 0.22),
  },
  finishText: { fontFamily: fonts.display, fontSize: 17, color: colors.white },
  footer: {
    textAlign: "center",
    fontFamily: fonts.body,
    fontSize: 12,
    color: "#9bb6c0",
    marginTop: 10,
  },
});
