import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { fonts } from "../theme/fonts";
import { hardShadow } from "../theme/ui";

// Edit a supplement's intake time + dosage. The AI fills these in by default
// (see data/supplements.ts); this lets the user override them. The stored value is a
// single "시점 · N정" string, so we parse it in and re-compose it on save.
const WHENS = ["아침 식후", "점심 식후", "저녁 식후", "공복", "자기 전"];

function parseTime(time: string): { when: string; count: number } {
  const [rawWhen, rawDose] = time.split("·").map((s) => s.trim());
  const when = rawWhen || WHENS[0];
  const m = (rawDose || "").match(/\d+/);
  const count = m ? Math.max(1, Math.min(9, parseInt(m[0], 10))) : 1;
  return { when, count };
}

type Props = {
  visible: boolean;
  name: string;
  time: string;
  onSave: (time: string) => void;
  onClose: () => void;
};

export default function SuppEditModal({
  visible,
  name,
  time,
  onSave,
  onClose,
}: Props) {
  const [when, setWhen] = useState(WHENS[0]);
  const [count, setCount] = useState(1);

  // Re-seed from the supplement each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    const p = parseTime(time);
    setWhen(p.when);
    setCount(p.count);
  }, [visible, time]);

  // Keep an AI-picked time that isn't one of the presets selectable.
  const whens = WHENS.includes(when) ? WHENS : [when, ...WHENS];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* stop taps inside the sheet from closing it */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.hint}>복용 시점과 용량을 직접 정할 수 있어요</Text>

          <Text style={styles.label}>복용 시점</Text>
          <View style={styles.chipRow}>
            {whens.map((w) => {
              const on = when === w;
              return (
                <Pressable
                  key={w}
                  onPress={() => setWhen(w)}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>
                    {w}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>용량</Text>
          <View style={styles.stepper}>
            <Pressable
              style={styles.stepBtn}
              onPress={() => setCount((c) => Math.max(1, c - 1))}
            >
              <Text style={styles.stepSign}>−</Text>
            </Pressable>
            <Text style={styles.count}>{count}정</Text>
            <Pressable
              style={styles.stepBtn}
              onPress={() => setCount((c) => Math.min(9, c + 1))}
            >
              <Text style={styles.stepSign}>＋</Text>
            </Pressable>
          </View>

          <View style={styles.actions}>
            <Pressable style={[styles.actBtn, styles.cancel]} onPress={onClose}>
              <Text style={styles.cancelText}>취소</Text>
            </Pressable>
            <Pressable
              style={[styles.actBtn, styles.save]}
              onPress={() => onSave(`${when} · ${count}정`)}
            >
              <Text style={styles.saveText}>저장</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(43,35,53,0.4)",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  sheet: {
    backgroundColor: colors.white,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 24,
    padding: 20,
    ...hardShadow(5, 6, 0.22),
  },
  title: { fontFamily: fonts.display, fontSize: 19, color: colors.ink },
  hint: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.muted,
    marginTop: 3,
  },
  label: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.ink,
    marginTop: 18,
    marginBottom: 9,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 15,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
  },
  chipOn: { backgroundColor: colors.purple },
  chipText: { fontFamily: fonts.body, fontSize: 13, color: colors.ink },
  chipTextOn: { color: colors.white },
  stepper: { flexDirection: "row", alignItems: "center", gap: 18 },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...hardShadow(3, 3, 0.12),
  },
  stepSign: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  count: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.ink,
    minWidth: 48,
    textAlign: "center",
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 24 },
  actBtn: {
    flex: 1,
    height: 50,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    ...hardShadow(3, 4),
  },
  cancel: { backgroundColor: colors.white },
  cancelText: { fontFamily: fonts.display, fontSize: 15, color: colors.ink },
  save: { backgroundColor: colors.purple },
  saveText: { fontFamily: fonts.display, fontSize: 15, color: colors.white },
});
