import React from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { fonts } from "../theme/fonts";
import { card, hardShadow } from "../theme/ui";
import Jelly from "../components/Jelly";
import { FloatingPill, PillSwatch } from "../components/Pill";
import SuppEditModal from "../components/SuppEditModal";
import Bouncy from "../components/Bouncy";
import { useApp } from "../state/AppContext";

export default function HomeScreen() {
  const {
    progress,
    jellyMood,
    speech,
    diary,
    setDiary,
    submitDiary,
    diaries,
    supps,
    toggleSupp,
    removeSupp,
    updateSupp,
    unlockedExprs,
  } = useApp();

  const recent = diaries.slice(0, 3);
  const insets = useSafeAreaInsets();

  // Which supplement's edit sheet is open (null = closed).
  const [editing, setEditing] = React.useState<number | null>(null);

  const confirmRemove = (i: number, name: string) =>
    Alert.alert(`${name} 삭제`, "이 영양제를 목록에서 지울까요?", [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: () => removeSupp(i) },
    ]);

  // Long-press a supplement → edit its time/dose or delete it.
  const openSuppMenu = (i: number, name: string) =>
    Alert.alert(name, undefined, [
      { text: "시간·용량 편집", onPress: () => setEditing(i) },
      { text: "삭제", style: "destructive", onPress: () => confirmRemove(i, name) },
      { text: "취소", style: "cancel" },
    ]);

  // Date + greeting follow the device's local clock.
  const now = new Date();
  const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
  const dateLabel = `${now.getMonth() + 1}월 ${now.getDate()}일 (${
    WEEKDAYS[now.getDay()]
  }) · 오늘`;
  const hour = now.getHours();
  const greeting =
    hour < 6
      ? "고요한 새벽이에요. 무리하지 말아요 🌙"
      : hour < 11
        ? "해가 떴어요. 천천히 시작해요 🌤️"
        : hour < 14
          ? "점심시간이에요. 잘 챙겨 먹어요 🍚"
          : hour < 18
            ? "나른한 오후예요. 조금만 힘내요 ☕"
            : hour < 22
              ? "저녁이에요. 오늘도 수고했어요 🌆"
              : "밤이 깊었어요. 곧 푹 쉬어요 🌙";

  return (
    <LinearGradient
      colors={["#fff0f6", colors.cream]}
      locations={[0, 0.6]}
      style={styles.fill}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.date}>{dateLabel}</Text>
            <Text style={styles.sub}>{greeting}</Text>
          </View>
          <View style={styles.counter}>
            <Text style={{ fontSize: 15 }}>💊</Text>
            <Text style={styles.counterText}>{progress}</Text>
          </View>
        </View>

        {/* hero */}
        <View style={styles.hero}>
          <FloatingPill
            color="mixed"
            size={46}
            rotate={-14}
            delay={0}
            style={{ position: "absolute", top: 42, left: 26 }}
          />
          <FloatingPill
            color="cyan"
            size={42}
            rotate={16}
            delay={400}
            style={{ position: "absolute", top: 30, right: 30 }}
          />
          <FloatingPill
            color="yellow"
            size={40}
            rotate={10}
            delay={800}
            style={{ position: "absolute", bottom: 64, left: 14 }}
          />
          <FloatingPill
            color="purple"
            size={44}
            rotate={-8}
            delay={200}
            style={{ position: "absolute", bottom: 78, right: 18 }}
          />
          <View style={styles.jellyWrap}>
            <Jelly mood={jellyMood} width={172} expressions={unlockedExprs} />
          </View>
          <View style={styles.heroShadow} />
        </View>

        {/* speech bubble */}
        <View style={styles.speech}>
          <View style={styles.speechTipWrap} pointerEvents="none">
            <View style={styles.speechTip} />
          </View>
          <Text style={styles.speechText}>{speech}</Text>
        </View>

        {/* diary */}
        <LinearGradient
          colors={["#fff6fa", "#fdefff"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.diaryCard}
        >
          <View style={styles.diaryHead}>
            <Text style={{ fontSize: 17 }}>✍️</Text>
            <Text style={styles.diaryTitle}>오늘 컨디션, 한 줄로 알려줘</Text>
          </View>
          <View style={styles.diaryRow}>
            <TextInput
              value={diary}
              onChangeText={setDiary}
              onSubmitEditing={submitDiary}
              returnKeyType="send"
              placeholder="예) 아침에 좀 피곤했어"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            <Bouncy style={styles.sendBtn} haptic="medium" onPress={submitDiary}>
              <Text style={styles.sendIcon}>→</Text>
            </Bouncy>
          </View>
          {diaries.length > 0 && (
            <View style={styles.chips}>
              {recent.map((d, i) => (
                <View key={i} style={styles.chip}>
                  <Text style={styles.chipText}>🥭 {d}</Text>
                </View>
              ))}
            </View>
          )}
        </LinearGradient>

        {/* today schedule */}
        <View style={styles.schedHead}>
          <Text style={styles.schedTitle}>오늘의 복용</Text>
          <Text style={styles.schedHint}>탭 완료 ✓ · 길게 눌러 편집·삭제</Text>
        </View>
        <View style={{ gap: 10 }}>
          {supps.map((item, i) => (
            <Bouncy
  scaleTo={0.98}
  haptic="selection"
              key={item.name}
              onPress={() => toggleSupp(i)}
              onLongPress={() => openSuppMenu(i, item.name)}
              style={[
                styles.suppRow,
                { backgroundColor: item.taken ? "#f4fff4" : colors.white },
              ]}
            >
              <PillSwatch color={item.color} width={48} height={24} />
              <View style={{ flex: 1 }}>
                <Text style={styles.suppName}>{item.name}</Text>
                <Text style={styles.suppTime}>{item.time}</Text>
              </View>
              <View
                style={[
                  styles.check,
                  { backgroundColor: item.taken ? colors.cyan : colors.white },
                ]}
              >
                <Text
                  style={{
                    color: item.taken ? colors.white : "#cfc6da",
                    fontSize: 15,
                  }}
                >
                  {item.taken ? "✓" : "○"}
                </Text>
              </View>
            </Bouncy>
          ))}
        </View>
      </ScrollView>

      <SuppEditModal
        visible={editing !== null}
        name={editing !== null ? supps[editing]?.name ?? "" : ""}
        time={editing !== null ? supps[editing]?.time ?? "" : ""}
        onClose={() => setEditing(null)}
        onSave={(time) => {
          if (editing !== null) updateSupp(editing, { time });
          setEditing(null);
        }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  date: { fontFamily: fonts.display, fontSize: 21, color: colors.ink },
  sub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  counter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 22,
    paddingVertical: 6,
    paddingHorizontal: 12,
    ...hardShadow(3, 3, 1),
    shadowColor: "#ffce4d",
    shadowOpacity: 1,
  },
  counterText: { fontFamily: fonts.display, fontSize: 15, color: colors.ink },
  hero: { height: 248, marginTop: 4 },
  jellyWrap: { position: "absolute", left: "50%", top: 24, marginLeft: -86 },
  heroShadow: {
    position: "absolute",
    bottom: 30,
    left: "50%",
    marginLeft: -60,
    width: 120,
    height: 18,
    backgroundColor: "rgba(43,35,53,0.16)",
    borderRadius: 60,
  },
  speech: {
    backgroundColor: colors.white,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 2,
    ...hardShadow(),
  },
  // Full-width row that flex-centres the tip — no %/transform maths, so it's
  // pixel-perfect centred regardless of device width.
  speechTipWrap: {
    position: "absolute",
    top: -9,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  speechTip: {
    width: 15,
    height: 15,
    backgroundColor: colors.white,
    borderLeftWidth: 2.5,
    borderTopWidth: 2.5,
    borderColor: colors.ink,
    transform: [{ rotate: "45deg" }],
  },
  speechText: {
    textAlign: "center",
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
  },
  diaryCard: {
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 22,
    padding: 16,
    marginTop: 18,
    ...hardShadow(),
  },
  diaryHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 10,
  },
  diaryTitle: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  diaryRow: { flexDirection: "row", gap: 8 },
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
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  chip: {
    backgroundColor: colors.white,
    borderWidth: 1.8,
    borderColor: colors.mango,
    borderRadius: 16,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  chipText: { fontFamily: fonts.body, fontSize: 12, color: "#5a4a2a" },
  schedHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 22,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  schedTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  schedHint: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  suppRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 18,
    padding: 13,
    ...hardShadow(3, 4),
  },
  suppName: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  suppTime: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.muted2,
    marginTop: 1,
  },
  check: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2.5,
    borderColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
});
