import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import Svg, { Circle } from "react-native-svg";
import { colors } from "@/constants/theme";
import { formatNumber } from "@/utils/formatNumber";

interface ProgressRingProps {
  score: number;
}

export const ProgressRing = ({ score }: ProgressRingProps) => {
  const { i18n, t } = useTranslation();
  const size = 168;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = Math.max(0, Math.min(100, score));
  const offset = circumference - (progress / 100) * circumference;

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#F2E7ED" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.primary}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={styles.score}>{formatNumber(score, i18n.language)}</Text>
        <Text style={styles.label}>{t("wellbeingScore")}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { width: 168, height: 168, alignSelf: "center", justifyContent: "center", alignItems: "center" },
  center: { position: "absolute", alignItems: "center" },
  score: { fontSize: 42, fontWeight: "800", color: colors.text },
  label: { fontSize: 12, color: colors.textMuted }
});
