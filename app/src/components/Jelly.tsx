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
  animated?: boolean; // idle bob + blink loops (default true; off for grids)
  expressions?: JellyMood[]; // faces the tap-cycle walks (default: all)
};

// The mango-slime mascot. Five expressions, a squish-on-tap animation, and a
// heart burst — a faithful port of project/Jelly.dc.html.
export default function Jelly({
  mood,
  width,
  interactive = true,
  animated = true,
  expressions,
}: Props) {
  const scale = width / BASE_W;
  const height = BASE_H * scale;

  // When `expressions` is passed it's the unlocked set: the tap-cycle walks it,
  // and a resting `mood` that isn't in it (e.g. jellyMood derives "sleepy"/"love"
  // from state but the user is only Lv.1) falls back to an unlocked face so we
  // never show an expression they haven't collected. Without the prop (the 도감
  // grid, login mascot) the exact `mood` is shown as-is.
  const gate = expressions && expressions.length ? expressions : null;
  const cycle = gate ?? EXPRS;
  const [exprIndex, setExprIndex] = useState<number | null>(null);
  const restingMood = gate && !gate.includes(mood) ? gate[0] : mood;
  const expr = exprIndex == null ? restingMood : cycle[exprIndex % cycle.length];

  // ── bob (idle float) ──
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animated) return;
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
  }, [bob, animated]);

  // ── blink (happy / wink open eye) ──
  const blink = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!animated) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 1, duration: 4750, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 0.08, duration: 80, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 120, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [blink, animated]);

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
      const base = cur == null ? Math.max(0, cycle.indexOf(mood)) : cur;
      return (base + 1) % cycle.length;
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

    // ── Lv.6–9 faces — ported from the Claude Design Jelly.dc.html handoff ──
    case "surprised":
      return (
        <>
          {/* big round white eyes */}
          <View style={[styles.wideEye, { top: 66, left: 42 }]} />
          <View style={[styles.wideEye, { top: 66, right: 42 }]} />
          <View style={[styles.widePupil, { top: 74, left: 47 }]} />
          <View style={[styles.widePupil, { top: 74, right: 47 }]} />
          {/* open "o" mouth */}
          <View
            style={{
              position: "absolute",
              top: 100,
              left: 78,
              width: 16,
              height: 18,
              borderRadius: 9,
              backgroundColor: colors.ink,
            }}
          />
          <Text style={[styles.deco, { top: 40, left: 16 }]}>❗</Text>
        </>
      );
    case "curious":
      return (
        <>
          {/* left open eye + catchlight */}
          <View
            style={{
              position: "absolute",
              top: 70,
              left: 44,
              width: 13,
              height: 18,
              borderRadius: 9,
              backgroundColor: colors.ink,
            }}
          />
          <View style={[styles.tinyDot, { top: 74, left: 47 }]} />
          {/* right half-closed arc eye */}
          <View
            style={{
              position: "absolute",
              top: 73,
              right: 43,
              width: 20,
              height: 10,
              borderWidth: 3,
              borderColor: colors.ink,
              borderBottomWidth: 0,
              borderTopLeftRadius: 14,
              borderTopRightRadius: 14,
            }}
          />
          {/* small "o" mouth */}
          <View
            style={{
              position: "absolute",
              top: 101,
              left: 79,
              width: 14,
              height: 14,
              borderRadius: 7,
              borderWidth: 3,
              borderColor: colors.ink,
            }}
          />
          <Text
            style={{
              position: "absolute",
              top: 40,
              right: 12,
              fontFamily: fonts.display,
              fontSize: 20,
              color: colors.purple,
            }}
          >
            ?
          </Text>
        </>
      );
    case "proud":
      return (
        <>
          {/* tilted eyebrow eyes */}
          <View
            style={[styles.browEye, { top: 74, left: 43, transform: [{ rotate: "6deg" }] }]}
          />
          <View
            style={[styles.browEye, { top: 74, right: 43, transform: [{ rotate: "-6deg" }] }]}
          />
          {/* confident smile */}
          <View
            style={{
              position: "absolute",
              top: 99,
              left: 73,
              width: 26,
              height: 13,
              borderWidth: 3,
              borderColor: colors.ink,
              borderTopWidth: 0,
              borderBottomLeftRadius: 15,
              borderBottomRightRadius: 15,
            }}
          />
          <Text style={[styles.deco, { top: 44, right: 12 }]}>✨</Text>
        </>
      );
    case "sad":
      return (
        <>
          {/* teary eyes + catchlights */}
          <View style={[styles.sadEye, { top: 72, left: 44 }]} />
          <View style={[styles.sadEye, { top: 72, right: 44 }]} />
          <View style={[styles.tinyDot, { top: 77, left: 48 }]} />
          <View style={[styles.tinyDot, { top: 77, right: 48 }]} />
          {/* teardrop */}
          <View
            style={{
              position: "absolute",
              top: 92,
              right: 44,
              width: 8,
              height: 13,
              backgroundColor: "#8fd3f4",
              borderWidth: 1.5,
              borderColor: "#6bb8e0",
              borderTopLeftRadius: 6,
              borderTopRightRadius: 6,
              borderBottomLeftRadius: 4,
              borderBottomRightRadius: 4,
            }}
          />
          {/* downturned (frown) mouth */}
          <View
            style={{
              position: "absolute",
              top: 110,
              left: 74,
              width: 24,
              height: 12,
              borderWidth: 3,
              borderColor: colors.ink,
              borderBottomWidth: 0,
              borderTopLeftRadius: 14,
              borderTopRightRadius: 14,
            }}
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
  deco: { position: "absolute", fontSize: 15 },
  // surprised: big round white eyes with dark pupils
  wideEye: {
    position: "absolute",
    width: 19,
    height: 26,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 13,
  },
  widePupil: {
    position: "absolute",
    width: 9,
    height: 12,
    backgroundColor: colors.ink,
    borderRadius: 6,
  },
  // small white catchlight (curious / sad)
  tinyDot: {
    position: "absolute",
    width: 6,
    height: 6,
    backgroundColor: colors.white,
    borderRadius: 3,
  },
  // proud: tilted eyebrow-shaped upper-arc eye
  browEye: {
    position: "absolute",
    width: 20,
    height: 12,
    borderWidth: 3,
    borderColor: colors.ink,
    borderBottomWidth: 0,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  // sad: filled oval eye
  sadEye: {
    position: "absolute",
    width: 15,
    height: 20,
    backgroundColor: colors.ink,
    borderRadius: 10,
  },
  star: { position: "absolute", fontSize: 26, lineHeight: 26, color: colors.ink },
  heart: { position: "absolute", fontSize: 20, lineHeight: 20, color: "#ff5d8f" },
  burstEmoji: { position: "absolute", fontSize: 16 },
});
