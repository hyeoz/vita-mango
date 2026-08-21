import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, pillColor } from "../theme/colors";

function resolve(color: string): { solid?: string; mixed?: boolean } {
  if (color === "mixed") return { mixed: true };
  // a colour key (pink/purple/…) or a raw hex string
  return { solid: pillColor[color] ?? color };
}

type SwatchProps = {
  color: string;
  width?: number;
  height?: number;
  border?: number;
  style?: ViewStyle;
};

// A static capsule swatch used in supplement lists, recommendation cards, and 도감.
export function PillSwatch({
  color,
  width = 48,
  height = 24,
  border = 2.5,
  style,
}: SwatchProps) {
  const { solid, mixed } = resolve(color);
  const radius = height / 2;
  const base: ViewStyle = {
    width,
    height,
    borderRadius: radius,
    borderWidth: border,
    borderColor: colors.ink,
    overflow: "hidden",
  };
  if (mixed) {
    return (
      <View style={[base, style]}>
        <View style={styles.row}>
          <View style={{ flex: 1, backgroundColor: colors.pink }} />
          <View style={{ flex: 1, backgroundColor: colors.purple }} />
        </View>
      </View>
    );
  }
  return <View style={[base, { backgroundColor: solid }, style]} />;
}

type FloatingProps = {
  color: string;
  size: number; // width
  style: ViewStyle; // absolute position
  rotate: number; // base rotation (deg)
  delay?: number;
  drift?: number; // vertical drift px
};

// A vivid pill that bobs and rotates behind the character on the home/recommendation screens.
export function FloatingPill({
  color,
  size,
  style,
  rotate,
  delay = 0,
  drift = 11,
}: FloatingProps) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration: 2600,
          delay,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [t, delay]);

  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, -drift] });
  const rot = t.interpolate({
    inputRange: [0, 1],
    outputRange: [`${rotate}deg`, `${rotate + 6}deg`],
  });
  const height = size * 0.5;
  const { solid, mixed } = resolve(color);

  return (
    <Animated.View
      style={[
        style,
        {
          width: size,
          height,
          transform: [{ translateY }, { rotate: rot }],
        },
      ]}
    >
      <View
        style={{
          width: size,
          height,
          borderRadius: height / 2,
          borderWidth: 2.5,
          borderColor: colors.ink,
          overflow: "hidden",
          backgroundColor: mixed ? undefined : solid,
          shadowColor: colors.ink,
          shadowOpacity: 0.18,
          shadowOffset: { width: 2, height: 3 },
          shadowRadius: 0,
          elevation: 2,
        }}
      >
        {mixed ? (
          <LinearGradient
            colors={[colors.pink, colors.pink, colors.purple, colors.purple]}
            locations={[0, 0.5, 0.5, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { ...StyleSheet.absoluteFillObject, flexDirection: "row" },
});
