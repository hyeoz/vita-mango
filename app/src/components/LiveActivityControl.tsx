import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { useI18n } from '../i18n';
import { liveCopy } from '../liveActivity/copy';
import { colors } from '../theme/colors';

export default function LiveActivityControl() {
  const { liveActivity, supps } = useApp();
  const { language } = useI18n();
  const c = liveCopy(language);
  if (!liveActivity.status.supported) return null;
  const { active, enabled } = liveActivity.status;
  const control = async (command: 'start' | 'stop') => {
    if (command === 'start') {
      if (!supps.length) return Alert.alert(c.control, c.empty);
      if (supps.every(s => s.taken)) return Alert.alert(c.control, c.done);
      if (!liveActivity.status.allowed) return Alert.alert(c.control, c.disabled);
    }
    try { await liveActivity.control(command); }
    catch { Alert.alert(c.control, c.failed); }
  };
  return <View style={styles.card}>
    <View style={styles.heading}><Text style={styles.title}>🥭 {c.control}</Text>
      {active && <Text style={styles.active}>{c.active}</Text>}</View>
    <Text style={styles.description}>{c.description}</Text>
    <View style={styles.actions}>
      {!active && <Pressable accessibilityRole="button" disabled={liveActivity.busy}
        onPress={() => void control('start')} style={[styles.button, liveActivity.busy && { opacity: 0.5 }]}>
        <Text style={styles.buttonText}>{enabled ? c.restart : c.start}</Text>
      </Pressable>}
      {enabled && <Pressable accessibilityRole="button" disabled={liveActivity.busy}
        onPress={() => void control('stop')} style={[styles.button, styles.stop]}>
        <Text style={styles.buttonText}>{c.stop}</Text>
      </Pressable>}
    </View>
    <Text style={styles.limit}>{c.limit}</Text>
  </View>;
}
const styles = StyleSheet.create({
  card: { marginBottom: 16, padding: 15, borderRadius: 18, backgroundColor: '#fff2d6', borderWidth: 1, borderColor: '#f1d3a4', gap: 8 },
  heading: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.ink, fontSize: 16, fontWeight: '700' }, active: { color: '#5d6933', fontSize: 12 },
  description: { color: colors.muted3, fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 8 },
  button: { minHeight: 44, minWidth: 88, paddingHorizontal: 18, borderRadius: 13, backgroundColor: colors.mango, alignItems: 'center', justifyContent: 'center' },
  stop: { backgroundColor: '#f0e6d5' }, buttonText: { color: colors.ink, fontWeight: '600', fontSize: 14 },
  limit: { color: '#76654e', fontSize: 11, lineHeight: 16 },
});
