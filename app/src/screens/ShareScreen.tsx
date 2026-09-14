import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { ClipPath, Defs, Path } from "react-native-svg";
import ViewShot from "react-native-view-shot";

import { Text } from "../i18n/components";
import { useI18n } from "../i18n";
import { useApp, type Supplement } from "../state/AppContext";
import { colors } from "../theme/colors";
import { fonts } from "../theme/fonts";
import { hardShadow } from "../theme/ui";
import { PillSwatch } from "../components/Pill";

const MANGO_PATH =
  "M104 35 C137 27 169 45 185 78 C204 118 196 171 164 202 C136 229 80 232 48 209 C15 185 14 142 33 108 C44 88 62 76 75 54 C83 42 92 37 104 35 Z";

// Each fill area shares its curved edge with the matching dotted separator.
// Keeping both from the same coordinates prevents color from bleeding across
// the visual progress boundary.
const MANGO_SEPARATORS = [
  "M0 170 C65 176 150 188 220 178",
  "M0 135 C65 141 150 153 220 143",
  "M0 100 C65 106 150 118 220 108",
  "M0 65 C65 71 150 83 220 73",
];

const MANGO_SECTIONS = [
  `${MANGO_SEPARATORS[0]} L220 260 L0 260 Z`,
  `${MANGO_SEPARATORS[1]} L220 178 C150 188 65 176 0 170 Z`,
  `${MANGO_SEPARATORS[2]} L220 143 C150 153 65 141 0 135 Z`,
  `${MANGO_SEPARATORS[3]} L220 108 C150 118 65 106 0 100 Z`,
  "M0 0 L220 0 L220 73 C150 83 65 71 0 65 Z",
];

function dotDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

function MangoProgress({ taken, total, size }: { taken: number; total: number; size: number }) {
  const filled = total > 0 ? Math.round((taken / total) * 5) : 0;
  const active = [colors.cyan, colors.purple, colors.yellow, colors.pink, colors.mango];
  const muted = ["#f5eef5", "#f6f1f7", "#f7f3f7", "#f8f3ef", "#fff6e8"];

  return (
    <Svg width={size} height={size * 1.12} viewBox="0 0 220 250">
      <Defs>
        <ClipPath id="mango-share-fill">
          <Path d={MANGO_PATH} />
        </ClipPath>
      </Defs>
      <Path
        d="M145 45 C158 18 188 8 210 18 C207 47 187 67 155 69 Z"
        fill={colors.cyan}
        stroke={colors.ink}
        strokeWidth={8}
        strokeLinejoin="round"
      />
      {MANGO_SECTIONS.map((section, index) => (
        <Path
          key={section}
          d={section}
          fill={index < filled ? active[index] : muted[index]}
          clipPath="url(#mango-share-fill)"
        />
      ))}
      {MANGO_SEPARATORS.map((separator) => (
        <Path
          key={separator}
          d={separator}
          fill="none"
          stroke="#716992"
          strokeWidth={2.4}
          strokeDasharray="7 7"
          clipPath="url(#mango-share-fill)"
          opacity={0.72}
        />
      ))}
      <Path
        d={MANGO_PATH}
        fill="none"
        stroke={colors.ink}
        strokeWidth={8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function StatusIcon({ checked }: { checked: boolean }) {
  return (
    <View style={[styles.statusIcon, checked && styles.statusIconChecked]}>
      {checked ? <Text style={styles.statusCheck}>✓</Text> : null}
    </View>
  );
}

function SupplementItem({ item }: { item: Supplement }) {
  return (
    <View style={styles.suppItem}>
      <PillSwatch color={item.color} width={48} height={24} border={2.5} />
      <Text numberOfLines={2} style={styles.suppName}>
        {item.name}
      </Text>
    </View>
  );
}

function SupplementGroup({ checked, items }: { checked: boolean; items: Supplement[] }) {
  if (!items.length) return null;
  return (
    <View style={styles.suppGroup}>
      <StatusIcon checked={checked} />
      <View style={styles.suppGrid}>
        {items.map((item, index) => (
          <SupplementItem key={`${item.id ?? item.name}-${index}`} item={item} />
        ))}
      </View>
    </View>
  );
}

function DecorativePill({
  color,
  style,
}: {
  color: string;
  style: ViewStyle;
}) {
  return (
    <PillSwatch
      color={color}
      width={42}
      height={21}
      style={StyleSheet.flatten([styles.decorativePill, style])}
    />
  );
}

export default function ShareScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { setScreen, supps, takenCount } = useApp();
  const shotRef = useRef<ViewShot | null>(null);
  const [busy, setBusy] = useState<"save" | "share" | null>(null);

  const artworkWidth = Math.min(width - 32, 420);
  const taken = useMemo(() => supps.filter((item) => item.taken), [supps]);
  const remaining = useMemo(() => supps.filter((item) => !item.taken), [supps]);
  const date = useMemo(() => dotDate(new Date()), []);

  React.useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      setScreen("home");
      return true;
    });
    return () => subscription.remove();
  }, [setScreen]);

  const capture = useCallback(async () => {
    const uri = await shotRef.current?.capture?.();
    if (!uri) throw new Error("capture failed");
    return uri;
  }, []);

  const showCaptureError = useCallback(() => {
    Alert.alert(t("이미지를 준비하지 못했어요"), t("잠시 후 다시 시도해 주세요."));
  }, [t]);

  const saveImage = useCallback(async () => {
    if (busy) return;
    setBusy("save");
    try {
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        Alert.alert(t("사진 접근 권한이 필요해요"), t("이미지를 저장하려면 사진 추가 권한을 허용해 주세요."));
        return;
      }
      const uri = await capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert(t("저장 완료"), t("이미지가 사진 앱에 저장됐어요."));
    } catch {
      showCaptureError();
    } finally {
      setBusy(null);
    }
  }, [busy, capture, showCaptureError, t]);

  const shareImage = useCallback(async () => {
    if (busy) return;
    setBusy("share");
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(t("공유할 수 없어요"), t("이 기기에서는 공유 기능을 사용할 수 없어요."));
        return;
      }
      const uri = await capture();
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        UTI: "public.png",
        dialogTitle: t("섭취 기록 공유"),
      });
    } catch {
      showCaptureError();
    } finally {
      setBusy(null);
    }
  }, [busy, capture, showCaptureError, t]);

  return (
    <LinearGradient
      colors={["#ffd7b1", "#ffaaa0"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.fill}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("닫기")}
          hitSlop={12}
          onPress={() => setScreen("home")}
          style={styles.closeButton}
        >
          <Text style={styles.closeText}>×</Text>
        </Pressable>
        <Text style={styles.headerTitle}>섭취 기록 공유</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.artwork, { width: artworkWidth }]}>
          <DecorativePill color="yellow" style={styles.decorativeTopLeft} />
          <DecorativePill color="purple" style={styles.decorativeTopRight} />
          <DecorativePill color="mixed" style={styles.decorativeBottomLeft} />
          <DecorativePill color="cyan" style={styles.decorativeBottomRight} />

          <View style={styles.postcardFrame}>
            <ViewShot
              ref={shotRef}
              options={{ format: "png", quality: 1, result: "tmpfile" }}
              style={styles.postcard}
            >
            <Text style={styles.date}>{date}</Text>

            <View style={styles.progressRow}>
              <MangoProgress
                taken={takenCount}
                total={supps.length}
                size={Math.min(176, artworkWidth * 0.47)}
              />
              <Text
                adjustsFontSizeToFit
                numberOfLines={1}
                style={[styles.progress, { fontSize: Math.min(70, artworkWidth * 0.18) }]}
              >
                {takenCount}/{supps.length}
              </Text>
            </View>

            {supps.length ? (
              <View style={styles.groups}>
                <SupplementGroup checked items={taken} />
                <SupplementGroup checked={false} items={remaining} />
              </View>
            ) : (
              <Text style={styles.empty}>등록한 영양제가 아직 없어요.</Text>
            )}

            <View style={styles.footer}>
              <PillSwatch color="yellow" width={30} height={15} border={2} />
              <Text style={styles.footerText}>나만의 영양제 루틴, 비타망고</Text>
              <PillSwatch color="purple" width={30} height={15} border={2} />
            </View>
            </ViewShot>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={busy !== null}
            onPress={saveImage}
            style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
          >
            {busy === "save" ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <Text style={styles.actionIcon}>⇩</Text>
            )}
            <Text style={styles.actionText}>이미지 저장</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy !== null}
            onPress={shareImage}
            style={({ pressed }) => [styles.actionButton, styles.shareButton, pressed && styles.pressed]}
          >
            {busy === "share" ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={[styles.actionIcon, styles.shareText]}>↗</Text>
            )}
            <Text style={[styles.actionText, styles.shareText]}>공유하기</Text>
          </Pressable>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  closeButton: { width: 44, height: 44, alignItems: "flex-start", justifyContent: "center" },
  closeText: { fontFamily: fonts.body, fontSize: 42, lineHeight: 44, color: colors.ink },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.ink,
  },
  headerSpacer: { width: 44 },
  scrollContent: { alignItems: "center", paddingHorizontal: 16 },
  artwork: {
    backgroundColor: "#ffc2a6",
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 18,
    overflow: "hidden",
  },
  postcardFrame: {
    transform: [{ rotate: "-0.6deg" }],
    ...hardShadow(5, 7, 0.18),
  },
  postcard: {
    backgroundColor: "#fffdfa",
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 14,
    overflow: "hidden",
  },
  date: { fontFamily: fonts.display, color: "#8b7fb2", fontSize: 22, marginLeft: 4 },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 6,
  },
  progress: { fontFamily: fonts.display, color: colors.ink, letterSpacing: -3, flexShrink: 1 },
  groups: { gap: 14, marginTop: 2 },
  suppGroup: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  statusIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  statusIconChecked: { backgroundColor: colors.cyan },
  statusCheck: { color: colors.white, fontFamily: fonts.display, fontSize: 20, lineHeight: 23 },
  suppGrid: { flex: 1, flexDirection: "row", flexWrap: "wrap", rowGap: 11 },
  suppItem: { width: "25%", alignItems: "center", paddingHorizontal: 2 },
  suppName: {
    marginTop: 5,
    textAlign: "center",
    color: colors.ink,
    fontFamily: fonts.display,
    fontSize: 11.5,
    lineHeight: 14,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted2,
    textAlign: "center",
    paddingVertical: 24,
  },
  footer: {
    minHeight: 42,
    borderTopWidth: 1.5,
    borderTopColor: "#d9d1e7",
    marginTop: 16,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    gap: 7,
  },
  footerText: {
    flex: 1,
    textAlign: "center",
    fontFamily: fonts.display,
    fontSize: 13,
    color: "#9689bb",
  },
  decorativePill: { position: "absolute", zIndex: 2 },
  decorativeTopLeft: { top: 7, left: -7, transform: [{ rotate: "48deg" }] },
  decorativeTopRight: { top: 9, right: -6, transform: [{ rotate: "-42deg" }] },
  decorativeBottomLeft: { bottom: 7, left: -7, transform: [{ rotate: "16deg" }] },
  decorativeBottomRight: { bottom: 7, right: -5, transform: [{ rotate: "-20deg" }] },
  actions: { flexDirection: "row", width: "100%", gap: 12, marginTop: 16 },
  actionButton: {
    flex: 1,
    minHeight: 58,
    backgroundColor: colors.white,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...hardShadow(3, 4, 0.18),
  },
  shareButton: { backgroundColor: colors.purple },
  actionIcon: { fontFamily: fonts.display, color: colors.ink, fontSize: 23 },
  actionText: { fontFamily: fonts.display, color: colors.ink, fontSize: 16 },
  shareText: { color: colors.white },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
});
