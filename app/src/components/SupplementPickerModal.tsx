import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text, TextInput } from "../i18n/components";
import { SafeAreaView } from "react-native-safe-area-context";
import { SUPPLEMENTS } from "../data/supplements";
import { colors } from "../theme/colors";
import { fonts } from "../theme/fonts";
import { hardShadow } from "../theme/ui";
import Bouncy from "./Bouncy";
import { PillSwatch } from "./Pill";
import { useI18n } from "../i18n";

const ALL = "전체";
const SUPPORT_URL = "https://hyeoz.github.io/privacy/support/";
const CATEGORIES = [ALL, ...Array.from(new Set(SUPPLEMENTS.map((s) => s.category)))];

function normalize(value: string) {
  return value.toLocaleLowerCase().replace(/[\s-]/g, "");
}

type Props = {
  visible: boolean;
  existingNames: string[];
  onAdd: (name: string) => void;
  onClose: () => void;
};

export default function SupplementPickerModal({
  visible,
  existingNames,
  onAdd,
  onClose,
}: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);

  useEffect(() => {
    if (!visible) return;
    setQuery("");
    setCategory(ALL);
  }, [visible]);

  const existing = useMemo(() => new Set(existingNames), [existingNames]);
  const filtered = useMemo(() => {
    const needle = normalize(query.trim());
    return SUPPLEMENTS.filter((supplement) => {
      if (category !== ALL && supplement.category !== category) return false;
      if (!needle) return true;
      return normalize(
        [
          supplement.name,
          supplement.category,
          supplement.benefit,
          t(supplement.name),
          t(supplement.category),
          t(supplement.benefit),
          ...supplement.aliases,
        ].join(" ")
      ).includes(needle);
    });
  }, [category, query, t]);

  const openSupport = () => {
    Linking.openURL(SUPPORT_URL).catch(() => {
      Alert.alert(t("고객지원을 열지 못했어요"), t("잠시 후 다시 시도해 주세요."));
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.fill} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>영양제 직접 추가하기</Text>
            <Text style={styles.subtitle}>53종에서 검색하거나 카테고리로 골라보세요.</Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t("닫기")}
            style={styles.close}
          >
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔎</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="영양제 이름을 검색해 보세요"
            placeholderTextColor={colors.muted}
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
            style={styles.search}
          />
        </View>

        <ScrollView
          style={styles.categoryScroller}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.categories}
        >
          {CATEGORIES.map((item) => {
            const selected = category === item;
            return (
              <Pressable
                key={item}
                onPress={() => setCategory(item)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.category, selected && styles.categoryOn]}
              >
                <Text style={[styles.categoryText, selected && styles.categoryTextOn]}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.resultHead}>
          <Text style={styles.resultText}>{filtered.length}개 영양제</Text>
          <Text style={styles.resultHint}>추가한 항목은 중복 선택할 수 없어요.</Text>
        </View>

        <ScrollView
          style={styles.results}
          contentContainerStyle={styles.resultContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {filtered.map((supplement) => {
            const added = existing.has(supplement.name);
            return (
              <Bouncy
                key={supplement.id}
                haptic={added ? "none" : "medium"}
                scaleTo={0.98}
                disabled={added}
                onPress={() => onAdd(supplement.name)}
                accessibilityRole="button"
                accessibilityState={{ disabled: added }}
                style={[styles.item, added && styles.itemAdded]}
              >
                <PillSwatch color={supplement.color} width={42} height={21} />
                <View style={styles.itemText}>
                  <View style={styles.itemTitleRow}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {supplement.name}
                    </Text>
                    <Text style={styles.itemCategory}>{supplement.category}</Text>
                  </View>
                  <Text style={styles.itemDose}>{supplement.dose}</Text>
                  <Text style={styles.itemBenefit} numberOfLines={2}>
                    {supplement.benefit}
                  </Text>
                </View>
                <View style={[styles.addMark, added && styles.addMarkDone]}>
                  {added ? (
                    <Text style={styles.addMarkText}>✓</Text>
                  ) : (
                    <View style={styles.plusIcon}>
                      <View style={styles.plusHorizontal} />
                      <View style={styles.plusVertical} />
                    </View>
                  )}
                </View>
              </Bouncy>
            );
          })}

          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyTitle}>검색 결과가 없어요</Text>
              <Text style={styles.emptyText}>다른 이름이나 카테고리로 찾아보세요.</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.support}>
          <Text style={styles.supportLead}>찾는 영양제가 없나요?</Text>
          <Pressable onPress={openSupport} accessibilityRole="link" hitSlop={8}>
            <Text style={styles.supportLink}>고객지원에 추가 요청하기</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 18,
  },
  title: { fontFamily: fonts.display, fontSize: 23, color: colors.ink },
  subtitle: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted2, marginTop: 3 },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { fontFamily: fonts.display, fontSize: 24, lineHeight: 27, color: colors.ink },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    marginHorizontal: 20,
    paddingHorizontal: 13,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 16,
    backgroundColor: colors.white,
    ...hardShadow(3, 3, 0.08),
  },
  searchIcon: { fontSize: 16, marginRight: 7 },
  search: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.ink, paddingVertical: 0 },
  categoryScroller: { flexGrow: 0 },
  categories: {
    gap: 7,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  category: {
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  categoryOn: { backgroundColor: colors.purple },
  categoryText: { fontFamily: fonts.display, fontSize: 12, color: colors.ink },
  categoryTextOn: { color: colors.white },
  resultHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 21,
    paddingBottom: 8,
  },
  resultText: { fontFamily: fonts.display, fontSize: 14, color: colors.ink },
  resultHint: { fontFamily: fonts.body, fontSize: 10.5, color: colors.muted },
  results: { flex: 1 },
  resultContent: { paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  item: {
    minHeight: 102,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 13,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 17,
    backgroundColor: colors.white,
    ...hardShadow(3, 3, 0.08),
  },
  itemAdded: { backgroundColor: "#f2f5f5", opacity: 0.72 },
  itemText: { flex: 1 },
  itemTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  itemName: { flexShrink: 1, fontFamily: fonts.display, fontSize: 15.5, color: colors.ink },
  itemCategory: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.purpleDeep,
    backgroundColor: "#eee9ff",
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: "hidden",
  },
  itemDose: { fontFamily: fonts.body, fontSize: 11, color: colors.muted2, marginTop: 2 },
  itemBenefit: { fontFamily: fonts.body, fontSize: 11.5, lineHeight: 17, color: colors.muted3, marginTop: 3 },
  addMark: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.cyan,
    alignItems: "center",
    justifyContent: "center",
  },
  addMarkDone: { backgroundColor: "#dbe4e4" },
  addMarkText: { fontFamily: fonts.display, fontSize: 17, lineHeight: 21, color: colors.ink },
  plusIcon: { width: 12, height: 12 },
  plusHorizontal: {
    position: "absolute",
    top: 5,
    left: 0,
    width: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.ink,
  },
  plusVertical: {
    position: "absolute",
    top: 0,
    left: 5,
    width: 2,
    height: 12,
    borderRadius: 1,
    backgroundColor: colors.ink,
  },
  empty: { alignItems: "center", paddingVertical: 48 },
  emptyEmoji: { fontSize: 30 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 17, color: colors.ink, marginTop: 8 },
  emptyText: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 4 },
  support: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderTopWidth: 1.5,
    borderTopColor: "#e9e2ee",
    paddingHorizontal: 20,
    paddingVertical: 13,
    backgroundColor: colors.cream,
  },
  supportLead: { fontFamily: fonts.body, fontSize: 12, color: colors.muted2 },
  supportLink: {
    fontFamily: fonts.display,
    fontSize: 12.5,
    color: colors.purpleDeep,
    textDecorationLine: "underline",
  },
});
