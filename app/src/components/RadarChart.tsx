import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polygon, G } from "react-native-svg";
import { colors } from "../theme/colors";
import { fonts } from "../theme/fonts";
import { AXES, AXIS_EMOJI, AXIS_SHORT, type Axis } from "../data/axes";

// Six-spoke capability chart. Two polygons: what the answers say now, and where
// the recommended set would take it. Showing the second one as a dashed outline
// rather than a second fill keeps "this is a projection, not a measurement"
// visually honest.

type Props = {
  scores: Record<Axis, number>;
  /** Optional overlay — where the recommendations would take each axis. */
  projected?: Record<Axis, number>;
  size?: number;
};

const RINGS = [0.25, 0.5, 0.75, 1];

/** Vertex for an axis at a given 0–1 radius. Starts at 12 o'clock. */
function point(index: number, radius: number, center: number, max: number) {
  const angle = (Math.PI * 2 * index) / AXES.length - Math.PI / 2;
  return {
    x: center + Math.cos(angle) * radius * max,
    y: center + Math.sin(angle) * radius * max,
  };
}

function polygon(values: number[], center: number, max: number): string {
  return values
    .map((v, i) => {
      const p = point(i, Math.max(0.06, v / 100), center, max);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(" ");
}

export default function RadarChart({ scores, projected, size = 240 }: Props) {
  const center = size / 2;
  // Leave room for the labels that sit outside the outer ring.
  const max = size / 2 - 34;

  const current = AXES.map((a) => scores[a] ?? 0);
  const future = projected ? AXES.map((a) => projected[a] ?? 0) : null;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G>
          {RINGS.map((r) => (
            <Polygon
              key={r}
              points={polygon(AXES.map(() => r * 100), center, max)}
              fill="none"
              stroke={colors.ink}
              strokeOpacity={r === 1 ? 0.5 : 0.13}
              strokeWidth={r === 1 ? 2 : 1}
            />
          ))}
          {AXES.map((_, i) => {
            const p = point(i, 1, center, max);
            return (
              <Line
                key={i}
                x1={center}
                y1={center}
                x2={p.x}
                y2={p.y}
                stroke={colors.ink}
                strokeOpacity={0.13}
                strokeWidth={1}
              />
            );
          })}

          {future && (
            <Polygon
              points={polygon(future, center, max)}
              fill={colors.mango}
              fillOpacity={0.16}
              stroke={colors.mangoDeep}
              strokeWidth={2}
              strokeDasharray="5,4"
            />
          )}

          <Polygon
            points={polygon(current, center, max)}
            fill={colors.purple}
            fillOpacity={0.3}
            stroke={colors.purpleDeep}
            strokeWidth={2.5}
          />

          {current.map((v, i) => {
            const p = point(i, Math.max(0.06, v / 100), center, max);
            return (
              <Circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={3.5}
                fill={colors.white}
                stroke={colors.purpleDeep}
                strokeWidth={2}
              />
            );
          })}
        </G>
      </Svg>

      {AXES.map((axis, i) => {
        const p = point(i, 1.24, center, max);
        return (
          <View
            key={axis}
            style={[styles.label, { left: p.x - 34, top: p.y - 16 }]}
            pointerEvents="none"
          >
            <Text style={styles.labelText} numberOfLines={1}>
              {AXIS_EMOJI[axis]} {AXIS_SHORT[axis]}
            </Text>
            <Text style={styles.labelValue}>
              {scores[axis]}
              {projected && projected[axis] > scores[axis] ? (
                <Text style={styles.labelDelta}> +{projected[axis] - scores[axis]}</Text>
              ) : null}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { position: "absolute", width: 68, alignItems: "center" },
  labelText: { fontFamily: fonts.display, fontSize: 10.5, color: colors.muted3 },
  labelValue: { fontFamily: fonts.display, fontSize: 12.5, color: colors.ink },
  labelDelta: { color: colors.mangoDeep, fontSize: 11 },
});
