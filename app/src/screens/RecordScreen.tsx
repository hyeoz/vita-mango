import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text, TextInput } from "../i18n/components";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { fonts } from "../theme/fonts";
import { hardShadow } from "../theme/ui";
import Disclaimer from "../components/Disclaimer";
import { useApp, moodFor } from "../state/AppContext";

export default function RecordScreen() {
  const { diary, setDiary, submitDiary, diaries } = useApp();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient colors={["#eafaf6", "#fbfdfb"]} locations={[0, 0.6]} style={styles.fill}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 18 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>한 줄 일기 📔</Text>
        <Text style={styles.sub}>매일의 컨디션이 젤리의 추천을 똑똑하게 만들어요</Text>

        <LinearGradient
          colors={["#fff6fa", "#fdefff"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.inputCard}
        >
          <Text style={styles.cardTitle}>오늘은 어땠어?</Text>
          <View style={styles.row}>
            <TextInput
              value={diary}
              onChangeText={setDiary}
              onSubmitEditing={submitDiary}
              returnKeyType="send"
              maxLength={200}
              placeholder="예) 아침에 좀 피곤했어"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            <Pressable style={styles.sendBtn} onPress={submitDiary}>
              <Text style={styles.sendIcon}>↑</Text>
            </Pressable>
          </View>
        </LinearGradient>

        <Text style={styles.pastLabel}>지난 기록</Text>
        <View style={styles.timeline}>
          <View style={styles.line} />
          <View style={{ gap: 12 }}>
            {diaries.map((d, i) => (
              <View key={i} style={styles.item}>
                <View style={styles.dot}>
                  <Text style={{ fontSize: 9 }}>{moodFor(d)}</Text>
                </View>
                <View style={styles.bubble}>
                  <Text style={styles.bubbleText}>{d}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <Disclaimer variant="short" style={styles.disclaimerBlock} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  disclaimerBlock: { marginTop: 18 },
  fill: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 24 },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginBottom: 16, marginTop: 2 },
  inputCard: {
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 22,
    padding: 16,
    ...hardShadow(),
  },
  cardTitle: { fontFamily: fonts.display, fontSize: 15, color: colors.ink, marginBottom: 10 },
  row: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: 14,
    backgroundColor: colors.white,
    color: colors.ink,
  },
  sendBtn: {
    width: 48,
    height: 44,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 14,
    backgroundColor: colors.purple,
    alignItems: "center",
    justifyContent: "center",
    ...hardShadow(2, 3, 0.25),
  },
  sendIcon: { color: colors.white, fontSize: 19 },
  pastLabel: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.ink,
    marginTop: 22,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  timeline: { paddingLeft: 26 },
  line: {
    position: "absolute",
    left: 9,
    top: 8,
    bottom: 8,
    width: 2.5,
    backgroundColor: "#d8eee7",
  },
  item: { position: "relative" },
  dot: {
    position: "absolute",
    left: -26,
    top: 14,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.white,
    borderWidth: 2.5,
    borderColor: colors.cyan,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    ...hardShadow(3, 3, 0.08),
  },
  bubbleText: { fontFamily: fonts.body, fontSize: 14, color: "#3b3348" },
});
