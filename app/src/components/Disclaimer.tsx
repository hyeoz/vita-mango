import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "../i18n/components";
import { colors } from "../theme/colors";
import { fonts } from "../theme/fonts";
import { useApp } from "../state/AppContext";
import { useI18n } from "../i18n";

// One disclaimer, every screen. It used to live only on the survey result and
// the recommendation tab, so a reviewer who opened the app and stayed on 홈
// never saw it — which is roughly what happened. Guideline 1.4.1 also wants the
// citations to be easy to find, so the same block carries the route to them.

const FULL =
  "이 앱은 일반적인 영양 정보를 바탕으로 한 참고용 안내예요. 질병의 진단·치료·예방을 목적으로 하지 않아요. 임신·수유 중이거나 약을 복용 중이라면 복용 전에 의사·약사와 상의하세요.";

const SHORT =
  "참고용 영양 정보예요. 질병의 진단·치료·예방을 목적으로 하지 않아요. 복용 중인 약이 있다면 의사·약사와 상의하세요.";

export default function Disclaimer({
  variant = "full",
  style,
}: {
  variant?: "full" | "short";
  style?: object;
}) {
  const { setScreen } = useApp();
  const { t } = useI18n();
  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.text}>{variant === "short" ? SHORT : FULL}</Text>
      <Pressable
        onPress={() => setScreen("references")}
        accessibilityRole="button"
        accessibilityLabel={t("근거 및 출처 화면 열기")}
        hitSlop={8}
      >
        <Text style={styles.link}>📚 근거 및 출처 보기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.muted4,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    lineHeight: 18,
    color: colors.muted3,
  },
  link: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.purpleDeep,
    textDecorationLine: "underline",
  },
});
