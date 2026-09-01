import React, { useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { Text } from "../i18n/components";
import { colors } from "../theme/colors";
import { fonts } from "../theme/fonts";
import type { Source } from "../data/sources";
import { useI18n } from "../i18n";

// A citation the user can actually open. If the OS refuses to hand the URL to a
// browser the raw address is revealed instead of failing silently — a citation
// nobody can reach is the exact thing that got 1.0.0 rejected, so the address
// stays readable (and selectable) even when the tap does nothing.

export default function SourceLink({ source }: { source: Source }) {
  const { t, m } = useI18n();
  const [failed, setFailed] = useState(false);

  const open = async () => {
    try {
      await Linking.openURL(source.url);
    } catch {
      setFailed(true);
    }
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={open}
        accessibilityRole="link"
        accessibilityLabel={m("sourceLink", { name: t(source.label) })}
        hitSlop={6}
      >
        <Text style={styles.label}>🔗 {source.label}</Text>
      </Pressable>
      {!!source.note && <Text style={styles.note}>{source.note}</Text>}
      <Text style={styles.url} selectable numberOfLines={failed ? undefined : 1}>
        {source.url}
      </Text>
      {failed && (
        <Text style={styles.failed}>
          링크를 열 수 없어요. 위 주소를 길게 눌러 복사한 뒤 브라우저에 붙여넣어 주세요.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 3, paddingVertical: 7 },
  label: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.purpleDeep,
    textDecorationLine: "underline",
    lineHeight: 20,
  },
  note: { fontFamily: fonts.body, fontSize: 12, color: colors.muted3, lineHeight: 18 },
  url: { fontFamily: fonts.body, fontSize: 10.5, color: colors.muted },
  failed: { fontFamily: fonts.body, fontSize: 11.5, color: colors.pinkText, lineHeight: 17 },
});
