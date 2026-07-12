import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { colors } from "../theme/colors";
import { fonts } from "../theme/fonts";
import type { JellyMood } from "../state/AppContext";

const BASE_W = 172;
const BASE_H = 160;
const EXPRS: JellyMood[] = ["happy", "sleepy", "excited", "love", "wink"];

type Props = {
  mood: JellyMood;
  width: number; // rendered width; height derives from the 172:160 aspect
  interactive?: boolean; // tap to squish + cycle expression (default true)
};

// The mango-slime mascot. Five expressions, a squish-on-tap animation, and a
// heart burst — a faithful port of project/Jelly.dc.html.
export default function Jelly({ mood, width, interactive = true }: Props) {
  const scale = width / BASE_W;
  const height = BASE_H * scale;

  const [exprIndex, setExprIndex] = useState<number | null>(null);
  const expr = exprIndex == null ? mood : EXPRS[exprIndex];

  // ── bob (idle float) ──
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  // ── blink (happy / wink open eye) ──
  const blink = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 1, duration: 4750, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 0.08, duration: 80, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 120, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [blink]);

  // ── squish (tap) ──
  const sx = useRef(new Animated.Value(1)).current;
  const sy = useRef(new Animated.Value(1)).current;
  // ── heart burst (tap) ──
  const burst = useRef(new Animated.Value(0)).current;
  const [bursting, setBursting] = useState(false);

  const onTap = () => {
    if (!interactive) return;

    // Squishy haptic: a soft impact on touch, then a lighter one as it bounces
    // back — mirrors the squish animation. Guarded so web / unsupported devices
    // no-op instead of throwing.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
    setTimeout(
      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
      150
    );

    const step = (toX: number, toY: number, d: number) =>
      Animated.parallel([
        Animated.timing(sx, { toValue: toX, duration: d, useNativeDriver: true }),
        Animated.timing(sy, { toValue: toY, duration: d, useNativeDriver: true }),
      ]);
    Animated.sequence([
      step(1.18, 0.8, 120),
      step(0.88, 1.14, 130),
      step(1.06, 0.95, 130),
      step(1, 1, 140),
    ]).start();

    setBursting(true);
    burst.setValue(0);
    Animated.timing(burst, {
      toValue: 1,
      duration: 750,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => setBursting(false));

    setExprIndex((cur) => {
      const base = cur == null ? EXPRS.indexOf(mood) : cur;
      return (base + 1) % EXPRS.length;
    });
  };

  const bobTranslate = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -9] });
  const bobRotate = bob.interpolate({
    inputRange: [0, 1],
    outputRange: ["-1deg", "1deg"],
  });
  const burstY = burst.interpolate({ inputRange: [0, 1], outputRange: [0, -54] });
  const burstOpacity = burst.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: [0, 1, 0],
  });

  const Eyes = useMemo(() => renderExpr(expr, blink), [expr, blink]);

  return (
    <Pressable onPress={onTap} style={{ width, height }}>
      <Animated.View
        style={{
          width,
          height,
          transform: [{ translateY: bobTranslate }, { rotate: bobRotate }],
        }}
      >
        {/* scale the 172×160 artwork down to the requested width */}
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: BASE_W,
            height: BASE_H,
            transform: [{ scale }],
            // scale around the top-left corner like the original
            // (RN default origin is center, so shift by the half-delta)
            // handled via marginLeft/Top below
            marginLeft: -(BASE_W * (1 - scale)) / 2,
            marginTop: -(BASE_H * (1 - scale)) / 2,
          }}
        >
          <Animated.View
            style={{
              width: BASE_W,
              height: BASE_H,
              transform: [{ scaleX: sx }, { scaleY: sy }],
            }}
          >
            {/* body */}
            <LinearGradient
              colors={[colors.mangoLight, colors.mango, colors.mangoDeep]}
              locations={[0, 0.6, 1]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.body}
            />
            {/* gloss highlight */}
            <View style={styles.gloss} />
            {/* cheeks */}
            <View style={[styles.cheek, { top: 96, left: 30 }]} />
            <View style={[styles.cheek, { top: 96, right: 30 }]} />
            {/* expression */}
            {Eyes}
          </Animated.View>
        </View>

        {/* tap burst */}
        {bursting ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Animated.Text
              style={[
                styles.burstEmoji,
                { top: 50 * scale, left: 36 * scale },
                { opacity: burstOpacity, transform: [{ translateY: burstY }] },
              ]}
            >
              💛
            </Animated.Text>
            <Animated.Text
              style={[
                styles.burstEmoji,
                { top: 40 * scale, left: width / 2 },
                { opacity: burstOpacity, transform: [{ translateY: burstY }] },
              ]}
            >
              ✨
            </Animated.Text>
            <Animated.Text
              style={[
                styles.burstEmoji,
                { top: 52 * scale, right: 34 * scale },
                { opacity: burstOpacity, transform: [{ translateY: burstY }] },
              ]}
            >
              💛
            </Animated.Text>
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

function renderExpr(expr: JellyMood, blink: Animated.Value) {
  switch (expr) {
    case "happy":
      return (
        <>
          <Animated.View
            style={[styles.roundEye, { top: 70, left: 44, transform: [{ scaleY: blink }] }]}
          />
          <Animated.View
            style={[styles.roundEye, { top: 70, right: 44, transform: [{ scaleY: blink }] }]}
          />
          <View style={[styles.eyeDot, { top: 75, left: 48 }]} />
          <View style={[styles.eyeDot, { top: 75, right: 53 }]} />
          <View style={[styles.smile, { width: 30, height: 16, top: 100, left: 71 }]} />
        </>
      );
    case "sleepy":
      return (
        <>
          <View style={[styles.arcEye, { top: 76, left: 43 }]} />
          <View style={[styles.arcEye, { top: 76, right: 43 }]} />
          <View style={[styles.smile, { width: 16, height: 9, top: 104, left: 78 }]} />
          <Text style={[styles.zzz, { top: 50, right: 14 }]}>💤</Text>
        </>
      );
    case "excited":
      return (
        <>
          <Text style={[styles.star, { top: 52, left: 38 }]}>✦</Text>
          <Text style={[styles.star, { top: 52, right: 38 }]}>✦</Text>
          <View style={styles.openMouth}>
            <View style={styles.tongue} />
          </View>
        </>
      );
    case "love":
      return (
        <>
          <Text style={[styles.heart, { top: 64, left: 40 }]}>♥</Text>
          <Text style={[styles.heart, { top: 64, right: 40 }]}>♥</Text>
          <View style={[styles.smile, { width: 24, height: 13, top: 101, left: 74 }]} />
        </>
      );
    case "wink":
      return (
        <>
          <View style={[styles.roundEye, { top: 70, left: 44 }]} />
          <View style={[styles.eyeDot, { top: 75, left: 48 }]} />
          <View style={[styles.arcEye, { top: 78, right: 43 }]} />
          <View
            style={[
              styles.smile,
              { width: 28, height: 14, top: 101, left: 75, transform: [{ rotate: "-8deg" }] },
            ]}
          />
        </>
      );
  }
}

const styles = StyleSheet.create({
  body: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 3,
    borderColor: colors.ink,
    borderTopLeftRadius: 82,
    borderTopRightRadius: 82,
    borderBottomLeftRadius: 70,
    borderBottomRightRadius: 70,
  },
  gloss: {
    position: "absolute",
    top: 24,
    left: 30,
    width: 46,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 23,
  },
  cheek: {
    position: "absolute",
    width: 18,
    height: 13,
    backgroundColor: colors.cheek,
    opacity: 0.5,
    borderRadius: 9,
  },
  roundEye: {
    position: "absolute",
    width: 15,
    height: 22,
    backgroundColor: colors.ink,
    borderRadius: 11,
  },
  eyeDot: {
    position: "absolute",
    width: 7,
    height: 7,
    backgroundColor: colors.white,
    borderRadius: 4,
  },
  arcEye: {
    position: "absolute",
    width: 22,
    height: 11,
    borderWidth: 3,
    borderColor: colors.ink,
    borderBottomWidth: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  smile: {
    position: "absolute",
    borderWidth: 3,
    borderColor: colors.ink,
    borderTopWidth: 0,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  openMouth: {
    position: "absolute",
    top: 98,
    left: 70,
    width: 32,
    height: 20,
    backgroundColor: colors.ink,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    overflow: "hidden",
  },
  tongue: {
    position: "absolute",
    bottom: 0,
    left: 8,
    width: 16,
    height: 9,
    backgroundColor: colors.cheek,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  zzz: { position: "absolute", fontSize: 15, color: colors.purple, fontFamily: fonts.display },
  star: { position: "absolute", fontSize: 26, lineHeight: 26, color: colors.ink },
  heart: { position: "absolute", fontSize: 20, lineHeight: 20, color: "#ff5d8f" },
  burstEmoji: { position: "absolute", fontSize: 16 },
});
