import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { MoodTrendChart } from "@/components/MoodTrendChart";
import { PillPicker } from "@/components/PillPicker";
import { TopBar } from "@/components/TopBar";
import { AppCard } from "@/components/ui/AppCard";
import { ChartWrapper } from "@/components/ui/ChartWrapper";
import { ChipTag } from "@/components/ui/ChipTag";
import { MetricTile } from "@/components/ui/MetricTile";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SkeletonBlock } from "@/components/ui/SkeletonBlock";
import { colors, spacing } from "@/constants/theme";
import { useAppStore } from "@/store/useAppStore";
import type { MoodEntry, MoodTag } from "@/types";
import { formatNumber } from "@/utils/formatNumber";

type WindowSize = 7 | 30 | 90;

const moodFromScore = (score: number): MoodTag => {
  if (score >= 80) return "motivated";
  if (score >= 70) return "focused";
  if (score >= 60) return "calm";
  if (score >= 50) return "stressed";
  return "anxious";
};

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const logs = useAppStore((s) => s.healthLogs);
  const symptoms = useAppStore((s) => s.symptoms);
  const prefs = useAppStore((s) => s.preferences);
  const sections = useAppStore((s) => s.dashboardSections);
  const profile = useAppStore((s) => s.profile);
  const isLoading = useAppStore((s) => s.isLoading);
  const updateDashboardSections = useAppStore((s) => s.updateDashboardSections);
  const [window, setWindow] = useState<WindowSize>(30);
  const [showCustomize, setShowCustomize] = useState(false);

  const trMetric = (key: "bp" | "weight" | "sleep" | "mood") => {
    const v = t(`metrics.${key}`);
    return v === `metrics.${key}` ? key.toUpperCase() : v;
  };

  const trSymptom = (raw: string) => {
    const key = raw.toLowerCase().replace(/\s+/g, "-");
    const v = t(`symptoms.${key}`);
    return v === `symptoms.${key}` ? raw : v;
  };

  const moodEntries = useMemo<MoodEntry[]>(
    () =>
      logs
        .filter((l) => typeof l.moodScore === "number")
        .map((l, idx) => ({
          id: `m-${idx}-${l.date}`,
          mood: moodFromScore(l.moodScore ?? 60),
          intensity: Math.round(((l.moodScore ?? 60) / 100) * 10),
          symptoms: [],
          timestamp: new Date(l.date).toISOString()
        })),
    [logs]
  );

  const latest = logs.at(-1);
  const avgMood = logs.length
    ? Math.round(logs.reduce((acc, l) => acc + (l.moodScore ?? 60), 0) / logs.length)
    : 60;
  const topSymptoms = Object.entries(
    symptoms.reduce<Record<string, number>>((acc, s) => {
      acc[s.symptomName] = (acc[s.symptomName] ?? 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);
  const selectedSectionCount = [sections.showMoodTrend, sections.showWellbeing, sections.showSnapshot, sections.showSymptoms].filter(Boolean).length;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TopBar title={t("todaysDashboard")} subtitle={t("dashboardSubtitle")} />

        {selectedSectionCount === 0 ? (
          <AppCard>
              <SectionHeader
              title={t("noMetricsSelectedTitle", { name: profile?.fullName?.trim() || t("notAvailable") })}
              actionLabel={t("customizeDashboard")}
              onPressAction={() => setShowCustomize(true)}
            />
            <Text style={styles.empty}>{t("noMetricsSelectedSubtitle")}</Text>
          </AppCard>
        ) : (
          <>
            {sections.showMoodTrend ? (
              <AppCard>
                <SectionHeader
                  title={t("moodTrend")}
                  actionLabel={t("customizeDashboard")}
                  onPressAction={() => setShowCustomize(true)}
                />
                <PillPicker options={[7, 30, 90]} value={window} onChange={setWindow} />
                <ChartWrapper>
                  {isLoading ? <SkeletonBlock height={160} /> : <MoodTrendChart moods={moodEntries} days={window} label={t("dailyMoodIntensity")} />}
                </ChartWrapper>
              </AppCard>
            ) : null}

            {sections.showWellbeing ? (
              <AppCard>
                <SectionHeader title={t("wellbeingScore")} />
                <ProgressRing score={avgMood} />
              </AppCard>
            ) : null}

            {sections.showSnapshot ? (
              <AppCard>
                <SectionHeader title={t("healthSnapshot")} />
                <View style={styles.grid}>
                  {prefs.showBp ? (
                    <MetricTile
                      label={trMetric("bp")}
                      value={
                        latest?.bpSystolic && latest?.bpDiastolic
                          ? `${formatNumber(latest.bpSystolic, i18n.language)}/${formatNumber(latest.bpDiastolic, i18n.language)}`
                          : "--"
                      }
                    />
                  ) : null}
                  {prefs.showWeight ? (
                    <MetricTile label={trMetric("weight")} value={latest?.weight ? formatNumber(latest.weight, i18n.language) : "--"} />
                  ) : null}
                  {prefs.showSleep ? (
                    <MetricTile label={trMetric("sleep")} value={latest?.sleepHours ? formatNumber(latest.sleepHours, i18n.language) : "--"} />
                  ) : null}
                  {prefs.showMood ? (
                    <MetricTile label={trMetric("mood")} value={latest?.moodScore ? formatNumber(latest.moodScore, i18n.language) : "--"} />
                  ) : null}
                </View>
              </AppCard>
            ) : null}

            {sections.showSymptoms ? (
              <AppCard>
                <SectionHeader title={t("frequentSymptoms")} />
                <View style={styles.chipRow}>
                  {topSymptoms.length ? topSymptoms.map((s) => <ChipTag key={s} label={trSymptom(s)} />) : <Text style={styles.empty}>{t("empty")}</Text>}
                </View>
              </AppCard>
            ) : null}
          </>
        )}
      </ScrollView>

      <Modal visible={showCustomize} transparent animationType="slide" onRequestClose={() => setShowCustomize(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowCustomize(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text style={styles.sheetTitle}>{t("chooseDashboardCards")}</Text>
            <View style={styles.prefList}>
              <Pressable style={styles.prefRow} onPress={() => updateDashboardSections({ showMoodTrend: !sections.showMoodTrend })}>
                <Text style={styles.prefLabel}>{`${sections.showMoodTrend ? "✓ " : ""}${t("moodTrend")}`}</Text>
              </Pressable>
              <Pressable style={styles.prefRow} onPress={() => updateDashboardSections({ showWellbeing: !sections.showWellbeing })}>
                <Text style={styles.prefLabel}>{`${sections.showWellbeing ? "✓ " : ""}${t("wellbeingScore")}`}</Text>
              </Pressable>
              <Pressable style={styles.prefRow} onPress={() => updateDashboardSections({ showSnapshot: !sections.showSnapshot })}>
                <Text style={styles.prefLabel}>{`${sections.showSnapshot ? "✓ " : ""}${t("healthSnapshot")}`}</Text>
              </Pressable>
              <Pressable style={styles.prefRow} onPress={() => updateDashboardSections({ showSymptoms: !sections.showSymptoms })}>
                <Text style={styles.prefLabel}>{`${sections.showSymptoms ? "✓ " : ""}${t("frequentSymptoms")}`}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  empty: { color: colors.textMuted },
  overlay: { flex: 1, backgroundColor: "rgba(20,16,20,0.25)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: spacing.xl
  },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: spacing.sm },
  prefList: { gap: spacing.xs },
  prefRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: "#FFF9FD",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm
  },
  prefLabel: { color: colors.text, fontWeight: "600" }
});
