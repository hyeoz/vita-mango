import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { fonts } from "../theme/fonts";
import { hardShadow } from "../theme/ui";
import Jelly from "../components/Jelly";
import { FloatingPill } from "../components/Pill";
import { useAuth } from "../state/AuthContext";

export default function LoginScreen() {
  const { signIn, signingIn, error } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={["#fff4ea", "#ffe9f3", "#efe9ff"]}
      locations={[0, 0.5, 1]}
      style={styles.fill}
    >
      <View
        style={[
          styles.content,
          { paddingTop: 70 + insets.top, paddingBottom: 40 + insets.bottom },
        ]}
      >
        <View style={styles.hero}>
          <FloatingPill color="mixed" size={44} rotate={-14} delay={0} style={{ position: "absolute", top: 30, left: 36 }} />
          <FloatingPill color="cyan" size={40} rotate={16} delay={400} style={{ position: "absolute", top: 20, right: 40 }} />
          <FloatingPill color="yellow" size={38} rotate={10} delay={800} style={{ position: "absolute", bottom: 8, left: 28 }} />
          <FloatingPill color="purple" size={42} rotate={-8} delay={200} style={{ position: "absolute", bottom: 16, right: 30 }} />
          <View style={styles.jellyWrap}>
            {/* Pre-login: no account/level yet, so preview just the first three
                collectible faces (방긋·윙크·신남). */}
            <Jelly mood="happy" width={150} expressions={["happy", "wink", "excited"]} />
          </View>
        </View>

        <Text style={styles.title}>비타망고</Text>
        <Text style={styles.subtitle}>
          매일의 컨디션을 기록하면{"\n"}젤리가 딱 맞는 영양제를 추천해줘 🥭
        </Text>

        <View style={styles.spacer} />

        <Pressable
          style={[styles.googleBtn, signingIn && { opacity: 0.7 }]}
          onPress={signIn}
          disabled={signingIn}
        >
          {signingIn ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <>
              <View style={styles.gLogo}>
                <Text style={styles.gLogoText}>G</Text>
              </View>
              <Text style={styles.googleText}>구글로 시작하기</Text>
            </>
          )}
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.footer}>
          로그인하면 기록이 안전하게 저장되고{"\n"}어느 기기에서나 이어볼 수 있어요
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
  },
  hero: { height: 200, width: "100%" },
  jellyWrap: { position: "absolute", left: "50%", top: 18, marginLeft: -75 },
  title: { fontFamily: fonts.display, fontSize: 30, color: colors.ink, marginTop: 8 },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.muted3,
    textAlign: "center",
    lineHeight: 23,
    marginTop: 12,
  },
  spacer: { flex: 1 },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    width: "100%",
    height: 56,
    backgroundColor: colors.white,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 18,
    ...hardShadow(4, 5, 0.22),
  },
  gLogo: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  gLogoText: { color: colors.white, fontFamily: fonts.display, fontSize: 15 },
  googleText: { fontFamily: fonts.display, fontSize: 17, color: colors.ink },
  error: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: "#d6455f",
    marginTop: 14,
    textAlign: "center",
  },
  footer: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 18,
  },
});
