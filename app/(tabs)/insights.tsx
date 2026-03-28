import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { MoodTrendChart } from "@/components/MoodTrendChart";
import { TopBar } from "@/components/TopBar";
import { AppCard } from "@/components/ui/AppCard";
import { ChartWrapper } from "@/components/ui/ChartWrapper";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { colors, spacing } from "@/constants/theme";
import { useAppStore } from "@/store/useAppStore";
import type { MoodEntry } from "@/types";

export default function InsightsScreen() {
  const { t } = useTranslation();
  const logs = useAppStore((s) => s.healthLogs);
  const moods = useMemo<MoodEntry[]>(
    () =>
      logs
        .filter((l) => typeof l.moodScore === "number")
        .map((l, idx) => ({
          id: `m-${idx}`,
          mood: l.moodScore && l.moodScore > 70 ? "calm" : "stressed",
          intensity: Math.max(1, Math.min(10, Math.round(((l.moodScore ?? 50) / 100) * 10))),
          symptoms: [],
          timestamp: new Date(l.date).toISOString()
        })),
    [logs]
  );

  const trendMsg = useMemo(() => {
    if (logs.length < 6) return t("insightKeepLogging");
    const recent = logs.slice(-7).reduce((sum, l) => sum + (l.moodScore ?? 60), 0) / 7;
    const prev = logs.slice(-14, -7).reduce((sum, l) => sum + (l.moodScore ?? 60), 0) / 7;
    if (recent > prev) return t("insightImproving");
    if (recent < prev) return t("insightDeclined");
    return t("insightStable");
  }, [logs, t]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TopBar title={t("insights")} subtitle={t("insightsSubtitle")} />
        <AppCard>
          <SectionHeader title={t("moodTrend")} />
          <ChartWrapper>
            <MoodTrendChart moods={moods} days={30} label={t("dailyMoodIntensity")} />
          </ChartWrapper>
        </AppCard>
        <AppCard>
          <SectionHeader title={t("trendsTitle")} />
          <View style={styles.row}>
            <View style={styles.dot} />
            <Text style={styles.body}>{trendMsg}</Text>
          </View>
        </AppCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 999, backgroundColor: colors.primary, marginTop: 6 },
  body: { color: colors.text, lineHeight: 20, flex: 1 }
});
