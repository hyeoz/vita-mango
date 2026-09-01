import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { Text } from "../i18n/components";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { colors } from "../theme/colors";
import { fonts } from "../theme/fonts";
import { hardShadow } from "../theme/ui";

// Branded boot splash — a faithful port of project/Splash.dc.html. Four pills
// fly in from the corners and are absorbed one-by-one by the bobbing mango
// jelly, which squishes on each absorb while expanding rings pulse behind it.
//
// The CSS keyframes all share two periods: a 3.4s cycle (pills, squish,
// sparkle, blink) and a 2.8s cycle (bob, shadow). We mirror that with just two
// looping drivers, so everything stays in sync exactly like the original.

type Range = { inputRange: number[]; outputRange: number[] | string[] };

// ── the four corner pills; each keyframe offset baked into interpolation ──
type PillCfg = {
  fill: "split" | string;
  tx: Range;
  ty: Range;
  rot: Range;
  sc: Range;
  op: Range;
};

const PILLS: PillCfg[] = [
  {
    // top-left: split pink/purple capsule, arrives first (42%)
    fill: "split",
    tx: { inputRange: [0, 0.42, 1], outputRange: [-150, 0, 0] },
    ty: { inputRange: [0, 0.42, 1], outputRange: [-120, 0, 0] },
    rot: { inputRange: [0, 0.42, 1], outputRange: ["-30deg", "0deg", "0deg"] },
    sc: { inputRange: [0, 0.42, 0.52, 1], outputRange: [1, 1, 0.2, 0.2] },
    op: { inputRange: [0, 0.08, 0.42, 0.52, 1], outputRange: [0, 1, 1, 0, 0] },
  },
  {
    // top-right: cyan, arrives at 58%
    fill: colors.cyan,
    tx: { inputRange: [0, 0.18, 0.58, 1], outputRange: [150, 150, 0, 0] },
    ty: { inputRange: [0, 0.18, 0.58, 1], outputRange: [-130, -130, 0, 0] },
    rot: {
      inputRange: [0, 0.18, 0.58, 1],
      outputRange: ["30deg", "30deg", "0deg", "0deg"],
    },
    sc: { inputRange: [0, 0.58, 0.68, 1], outputRange: [1, 1, 0.2, 0.2] },
    op: {
      inputRange: [0, 0.18, 0.26, 0.58, 0.68, 1],
      outputRange: [0, 0, 1, 1, 0, 0],
    },
  },
  {
    // bottom-left: yellow, arrives at 74%
    fill: colors.yellow,
    tx: { inputRange: [0, 0.36, 0.74, 1], outputRange: [-140, -140, 0, 0] },
    ty: { inputRange: [0, 0.36, 0.74, 1], outputRange: [120, 120, 0, 0] },
    rot: {
      inputRange: [0, 0.36, 0.74, 1],
      outputRange: ["24deg", "24deg", "0deg", "0deg"],
    },
    sc: { inputRange: [0, 0.74, 0.84, 1], outputRange: [1, 1, 0.2, 0.2] },
    op: {
      inputRange: [0, 0.36, 0.44, 0.74, 0.84, 1],
      outputRange: [0, 0, 1, 1, 0, 0],
    },
  },
  {
    // bottom-right: purple, arrives last (92%)
    fill: colors.purple,
    tx: { inputRange: [0, 0.54, 0.92, 1], outputRange: [150, 150, 0, 0] },
    ty: { inputRange: [0, 0.54, 0.92, 1], outputRange: [120, 120, 0, 0] },
    rot: {
      inputRange: [0, 0.54, 0.92, 1],
      outputRange: ["-24deg", "-24deg", "0deg", "0deg"],
    },
    sc: { inputRange: [0, 0.92, 0.98, 1], outputRange: [1, 1, 0.2, 0.2] },
    op: {
      inputRange: [0, 0.54, 0.62, 0.92, 0.98, 1],
      outputRange: [0, 0, 1, 1, 0, 0],
    },
  },
];

// A sawtooth driver (0→1, snap back, repeat) — mirrors a linear CSS loop.
function useSawtooth(duration: number, delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(v, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, [v, duration, delay]);
  return v;
}

// A yoyo driver (0→1→0) — mirrors a 0%/50%/100% ease-in-out CSS loop.
function useYoyo(halfDuration: number, delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1,
          duration: halfDuration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration: halfDuration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, [v, halfDuration, delay]);
  return v;
}

function FlyingPill({ t, cfg }: { t: Animated.Value; cfg: PillCfg }) {
  return (
    <Animated.View
      style={[
        styles.pill,
        cfg.fill !== "split" && { backgroundColor: cfg.fill },
        {
          opacity: t.interpolate(cfg.op as any),
          transform: [
            { translateX: t.interpolate(cfg.tx as any) },
            { translateY: t.interpolate(cfg.ty as any) },
            { rotate: t.interpolate(cfg.rot as any) as any },
            { scale: t.interpolate(cfg.sc as any) },
          ],
        },
      ]}
    >
      {cfg.fill === "split" && (
        <LinearGradient
          colors={[colors.pink, colors.pink, colors.purple, colors.purple]}
          locations={[0, 0.5, 0.5, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      )}
    </Animated.View>
  );
}

function LoaderDot({ color, delay }: { color: string; delay: number }) {
  const d = useYoyo(600, delay); // 1.2s full cycle
  return (
    <Animated.View
      style={[
        styles.dot,
        {
          backgroundColor: color,
          opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
          transform: [
            {
              translateY: d.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -7],
              }),
            },
          ],
        },
      ]}
    />
  );
}

export default function SplashScreen() {
  const t = useSawtooth(3400); // pills / squish / sparkle / blink
  const bob = useYoyo(1400); // jelly float + shadow (2.8s cycle)
  const ring1 = useSawtooth(2600);
  const ring2 = useSawtooth(2600, 1300);

  const bobTranslate = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });
  const bobRotate = bob.interpolate({
    inputRange: [0, 1],
    outputRange: ["-1.5deg", "1.5deg"],
  });
  const squishX = t.interpolate({
    inputRange: [0, 0.54, 0.6, 0.68, 0.76, 0.82, 1],
    outputRange: [1, 1, 1.14, 0.9, 1.04, 1, 1],
  });
  const squishY = t.interpolate({
    inputRange: [0, 0.54, 0.6, 0.68, 0.76, 0.82, 1],
    outputRange: [1, 1, 0.84, 1.12, 0.97, 1, 1],
  });
  const blink = t.interpolate({
    inputRange: [0, 0.42, 0.45, 0.48, 1],
    outputRange: [1, 1, 0.1, 1, 1],
  });
  const sparkOpacity = t.interpolate({
    inputRange: [0, 0.5, 0.56, 0.7, 1],
    outputRange: [0, 0, 1, 0, 0],
  });
  const sparkScale = t.interpolate({
    inputRange: [0, 0.5, 0.56, 0.7, 1],
    outputRange: [0.3, 0.3, 1.1, 1.3, 1.3],
  });

  const ringStyle = (r: Animated.Value, color: string) => ({
    opacity: r.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
    transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.5] }) }],
    borderColor: color,
  });

  return (
    <LinearGradient
      colors={["#fff2d6", "#ffe4f0", "#ece3ff"]}
      locations={[0, 0.46, 1]}
      style={styles.fill}
    >
      <StatusBar style="dark" />

      {/* soft floating background blobs */}
      <View style={[styles.blob, { top: 90, left: -40, width: 170, height: 170, backgroundColor: "rgba(255,182,60,0.16)" }]} />
      <View style={[styles.blob, { bottom: 120, right: -50, width: 190, height: 190, backgroundColor: "rgba(124,92,255,0.14)" }]} />
      <View style={[styles.blob, { top: 40, right: 30, width: 70, height: 70, backgroundColor: "rgba(59,201,219,0.16)" }]} />

      {/* stage — centred in the available space */}
      <View style={styles.stageWrap}>
        <View style={styles.stage}>
          {/* expanding rings */}
          <Animated.View style={[styles.ring, ringStyle(ring1, "rgba(124,92,255,0.4)")]} />
          <Animated.View style={[styles.ring, ringStyle(ring2, "rgba(255,126,182,0.4)")]} />

          {/* flying pills */}
          {PILLS.map((cfg, i) => (
            <FlyingPill key={i} t={t} cfg={cfg} />
          ))}

          {/* ground shadow */}
          <Animated.View
            style={[
              styles.groundShadow,
              {
                opacity: bob.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.12] }),
                transform: [{ scaleX: bob.interpolate({ inputRange: [0, 1], outputRange: [1, 0.82] }) }],
              },
            ]}
          />

          {/* jelly */}
          <View style={styles.jellyWrap}>
            <Animated.View
              style={{
                flex: 1,
                transform: [{ translateY: bobTranslate }, { rotate: bobRotate }],
              }}
            >
              <Animated.View
                style={{ flex: 1, transform: [{ scaleX: squishX }, { scaleY: squishY }] }}
              >
                {/* body */}
                <LinearGradient
                  colors={[colors.mangoLight, colors.mango, colors.mangoDeep]}
                  locations={[0, 0.6, 1]}
                  start={{ x: 0.15, y: 0 }}
                  end={{ x: 0.85, y: 1 }}
                  style={styles.body}
                />
                {/* gloss */}
                <View style={styles.gloss} />
                {/* happy face */}
                <Animated.View style={[styles.eye, { top: 72, left: 46, transform: [{ scaleY: blink }] }]} />
                <Animated.View style={[styles.eye, { top: 72, right: 46, transform: [{ scaleY: blink }] }]} />
                <View style={[styles.eyeDot, { top: 77, left: 50 }]} />
                <View style={[styles.eyeDot, { top: 77, right: 55 }]} />
                <View style={styles.mouth} />
                <View style={[styles.cheek, { top: 100, left: 32 }]} />
                <View style={[styles.cheek, { top: 100, right: 32 }]} />
              </Animated.View>

              {/* absorb sparkle (bobs with the jelly, doesn't squish) */}
              <Animated.Text
                style={[styles.sparkle, { opacity: sparkOpacity, transform: [{ scale: sparkScale }] }]}
              >
                ✨
              </Animated.Text>
            </Animated.View>
          </View>
        </View>
      </View>

      {/* loading indicator */}
      <View style={styles.loader}>
        <View style={styles.dots}>
          <LoaderDot color={colors.pink} delay={0} />
          <LoaderDot color={colors.mango} delay={180} />
          <LoaderDot color={colors.cyan} delay={360} />
          <LoaderDot color={colors.purple} delay={540} />
        </View>
        <Text style={styles.loadingText}>영양제를 불러오는 중…</Text>
      </View>
    </LinearGradient>
  );
}

const STAGE = 230;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  blob: { position: "absolute", borderRadius: 999 },

  stageWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  stage: { width: STAGE, height: STAGE },

  ring: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 170,
    height: 170,
    marginTop: -85,
    marginLeft: -85,
    borderWidth: 2.5,
    borderRadius: 85,
  },

  pill: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 52,
    height: 26,
    marginTop: -13,
    marginLeft: -26,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: colors.ink,
    overflow: "hidden",
    ...hardShadow(2, 3, 0.16),
  },

  groundShadow: {
    position: "absolute",
    bottom: 6,
    left: "50%",
    width: 128,
    height: 20,
    marginLeft: -64,
    backgroundColor: colors.ink,
    borderRadius: 64,
  },

  jellyWrap: {
    position: "absolute",
    top: 24,
    left: "50%",
    width: 176,
    height: 164,
    marginLeft: -88,
  },
  body: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 3.5,
    borderColor: colors.ink,
    borderTopLeftRadius: 84,
    borderTopRightRadius: 84,
    borderBottomLeftRadius: 74,
    borderBottomRightRadius: 74,
  },
  gloss: {
    position: "absolute",
    top: 26,
    left: 32,
    width: 50,
    height: 32,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 25,
  },
  eye: {
    position: "absolute",
    width: 16,
    height: 24,
    backgroundColor: colors.ink,
    borderRadius: 12,
  },
  eyeDot: {
    position: "absolute",
    width: 7,
    height: 7,
    backgroundColor: colors.white,
    borderRadius: 4,
  },
  mouth: {
    position: "absolute",
    top: 104,
    left: 72,
    width: 32,
    height: 17,
    borderWidth: 3,
    borderColor: colors.ink,
    borderTopWidth: 0,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  cheek: {
    position: "absolute",
    width: 19,
    height: 14,
    backgroundColor: colors.cheek,
    opacity: 0.5,
    borderRadius: 9,
  },
  sparkle: {
    position: "absolute",
    top: 60,
    left: "50%",
    marginLeft: -14,
    fontSize: 22,
    lineHeight: 26,
    textAlign: "center",
    width: 28,
  },

  loader: { position: "absolute", bottom: 110, left: 0, right: 0, alignItems: "center" },
  dots: { flexDirection: "row", gap: 8, marginBottom: 14 },
  dot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  loadingText: {
    fontSize: 13,
    lineHeight: 21,
    paddingBottom: 2,
    color: colors.muted,
    fontFamily: fonts.body,
    textAlign: "center",
  },
});
