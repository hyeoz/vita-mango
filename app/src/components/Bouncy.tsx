import React, { useCallback, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
  type PressableProps,
} from "react-native";
import * as Haptics from "expo-haptics";

// A pressable that squishes. The app's whole personality is a squishy mascot,
// but every button was a flat rectangle that changed nothing on touch — the
// tap felt like it might not have registered. Scale + haptic is the cheapest
// way to make the interface feel like it's answering you.

type Feedback = "light" | "medium" | "selection" | "none";

type Props = PressableProps & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** How far it squishes. 0.96 for big CTAs, 0.94 for cards. */
  scaleTo?: number;
  haptic?: Feedback;
};

// Layout props have to live on the animated wrapper, not the inner Pressable.
// The wrapper sizes itself to its child, so a button styled `alignSelf:
// "stretch"` would stretch to fit a wrapper that had already shrunk to the
// text — which is exactly how a full-width CTA collapses into a small square.
const LAYOUT_KEYS = [
  "alignSelf",
  "flex",
  "flexGrow",
  "flexShrink",
  "flexBasis",
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "margin",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "marginHorizontal",
  "marginVertical",
  "position",
  "top",
  "bottom",
  "left",
  "right",
  "zIndex",
] as const;

function splitStyle(style: StyleProp<ViewStyle>): {
  outer: ViewStyle;
  inner: ViewStyle;
} {
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    if ((LAYOUT_KEYS as readonly string[]).includes(key)) outer[key] = value;
    else inner[key] = value;
  }
  // The inner view must fill whatever the wrapper was given, or a 54pt-tall
  // wrapper would hold a text-height button. `flex: 1` fills the wrapper's main
  // axis (column by default), `alignSelf: "stretch"` fills the cross axis.
  if (Object.keys(outer).length) {
    inner.flex = 1;
    inner.alignSelf = "stretch";
  }
  return { outer: outer as ViewStyle, inner: inner as ViewStyle };
}

function fire(kind: Feedback) {
  // Haptics are a nicety — a simulator or a device with them disabled must not
  // take the button down with it.
  if (kind === "none") return;
  const call =
    kind === "selection"
      ? Haptics.selectionAsync()
      : Haptics.impactAsync(
          kind === "medium"
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light
        );
  call.catch(() => {});
}

export default function Bouncy({
  children,
  style,
  scaleTo = 0.96,
  haptic = "light",
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const { outer, inner } = splitStyle(style);

  const press = useCallback(
    (to: number) =>
      Animated.spring(scale, {
        toValue: to,
        useNativeDriver: true,
        speed: 40,
        bounciness: 8,
      }).start(),
    [scale]
  );

  return (
    <Animated.View style={[outer, { transform: [{ scale }] }]}>
      <Pressable
        {...rest}
        disabled={disabled}
        style={inner}
        onPressIn={(e) => {
          if (!disabled) {
            press(scaleTo);
            fire(haptic);
          }
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          press(1);
          onPressOut?.(e);
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
