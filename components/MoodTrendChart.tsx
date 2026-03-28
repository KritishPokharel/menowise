import { useMemo } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { colors, spacing } from "@/constants/theme";
import type { MoodEntry } from "@/types";
import { formatNumber } from "@/utils/formatNumber";

interface MoodTrendChartProps {
  moods: MoodEntry[];
  days?: 7 | 30 | 90;
  label?: string;
}

export const MoodTrendChart = ({ moods, days = 7, label = "" }: MoodTrendChartProps) => {
  const { i18n } = useTranslation();
  const width = Dimensions.get("window").width - 96;
  const height = 160;

  const { points, linePath, areaPath } = useMemo(() => {
    const segment = moods.slice(-days);
    if (!segment.length) return { points: [], linePath: "", areaPath: "" };
    const max = 10;
    const mapped = segment.map((m, idx) => {
      const x = (idx / Math.max(1, segment.length - 1)) * width;
      const y = height - (m.intensity / max) * (height - 24) - 12;
      return { x, y };
    });
    const smoothLine = mapped
      .map((point, i, arr) => {
        if (i === 0) return `M ${point.x} ${point.y}`;
        const prev = arr[i - 1];
        const cpx = (prev.x + point.x) / 2;
        return `Q ${cpx} ${prev.y}, ${point.x} ${point.y}`;
      })
      .join(" ");
    const area = `${smoothLine} L ${mapped[mapped.length - 1].x} ${height} L ${mapped[0].x} ${height} Z`;
    return { points: mapped, linePath: smoothLine, areaPath: area };
  }, [moods, days, width, height]);

  return (
    <View>
      <Text style={styles.label}>
        {label} ({formatNumber(days, i18n.language)})
      </Text>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="moodArea" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.34" />
            <Stop offset="100%" stopColor={colors.primary} stopOpacity="0.04" />
          </LinearGradient>
        </Defs>
        {areaPath ? <Path d={areaPath} fill="url(#moodArea)" /> : null}
        <Path d={linePath} stroke={colors.primaryDark} strokeWidth={4} strokeLinecap="round" fill="none" />
        {points.map((p, idx) => (
          <Circle key={`${p.x}-${idx}`} cx={p.x} cy={p.y} r={4} fill={colors.primaryDark} />
        ))}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    marginBottom: spacing.sm,
    color: colors.textMuted,
    fontSize: 12
  }
});
