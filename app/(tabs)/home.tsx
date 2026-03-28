import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/AppButton";
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
  const profile = useAppStore((s) => s.profile);
  const logs = useAppStore((s) => s.healthLogs);
  const symptoms = useAppStore((s) => s.symptoms);
  const prefs = useAppStore((s) => s.preferences);
  const sections = useAppStore((s) => s.dashboardSections);
  const isLoading = useAppStore((s) => s.isLoading);
  const updateDashboardSections = useAppStore((s) => s.updateDashboardSections);
  const [window, setWindow] = useState<WindowSize>(30);
  const [showCustomize, setShowCustomize] = useState(false);

  const moodEntries = useMemo<MoodEntry[]>(
    () =>
      logs
        .filter((l) => typeof l.moodScore === "number")
        .map((l, idx) => ({
          id: `m-${idx}-${l.date}`,
          mood: moodFromScore(l.moodScore ?? 60),
          intensity: Math.max(1, Math.min(10, Math.round(((l.moodScore ?? 60) / 100) * 10))),
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
    .slice(0, 6)
    .map(([name]) => name);

  const dateToDay = (iso: string) => {
    const d = new Date(iso);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };

  const streak = useMemo(() => {
    const uniqueDays = Array.from(new Set(logs.map((l) => dateToDay(l.date)))).sort((a, b) => b - a);
    if (!uniqueDays.length) return 0;
    let count = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    for (;;) {
      if (uniqueDays.includes(cursor.getTime())) {
        count += 1;
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      break;
    }
    return count;
  }, [logs]);

  const lastLoggedText = useMemo(() => {
    if (!latest) return t("homeNoLogs", { defaultValue: "No logs yet" });
    const last = new Date(latest.date);
    const now = new Date();
    const diff = Math.floor((now.getTime() - last.getTime()) / 86400000);
    if (diff <= 0) return t("homeLoggedToday", { defaultValue: "Last logged today" });
    if (diff === 1) return t("homeLoggedYesterday", { defaultValue: "Last logged yesterday" });
    return t("homeLoggedDaysAgo", { defaultValue: "Last logged {{days}} days ago", days: diff });
  }, [latest, t]);

  const trendMsg = useMemo(() => {
    if (logs.length < 14) return t("insightKeepLogging");
    const recent = logs.slice(-7).reduce((sum, l) => sum + (l.moodScore ?? 60), 0) / 7;
    const prev = logs.slice(-14, -7).reduce((sum, l) => sum + (l.moodScore ?? 60), 0) / 7;
    const diff = Math.round(recent - prev);
    if (diff > 1) return t("insightImproving");
    if (diff < -1) return t("insightDeclined");
    return t("insightStable");
  }, [logs, t]);

  const periodDelta = useMemo(() => {
    if (logs.length < 60) return null;
    const recent = logs.slice(-30).reduce((sum, l) => sum + (l.moodScore ?? 60), 0) / 30;
    const prev = logs.slice(-60, -30).reduce((sum, l) => sum + (l.moodScore ?? 60), 0) / 30;
    return Math.round(recent - prev);
  }, [logs]);

  const trMetric = (key: "bp" | "weight" | "sleep" | "mood") => {
    const v = t(`metrics.${key}`);
    return v === `metrics.${key}` ? key.toUpperCase() : v;
  };

  const trSymptom = (raw: string) => {
    const key = raw.toLowerCase().replace(/\s+/g, "-");
    const v = t(`symptoms.${key}`);
    return v === `symptoms.${key}` ? raw : v;
  };

  const topSymptomLabel = topSymptoms.length ? trSymptom(topSymptoms[0]) : t("empty");

  const visibleCardCount =
    Number(sections.showMoodTrend) +
    Number(sections.showWellbeing) +
    Number(sections.showSnapshot) +
    Number(sections.showSymptoms);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TopBar title={t("todaysDashboard")} subtitle={t("dashboardSubtitle")} />
        <View style={styles.customizeRow}>
          <Pressable style={styles.customizeBtn} onPress={() => setShowCustomize(true)}>
            <Text style={styles.customizeLabel}>{t("customizeDashboard")}</Text>
          </Pressable>
        </View>

        {visibleCardCount === 0 ? (
          <AppCard>
            <Text style={styles.emptyTitle}>
              {t("noMetricsSelectedTitle", {
                name: profile?.fullName?.trim() || t("notAvailable")
              })}
            </Text>
            <Text style={styles.emptyText}>{t("noMetricsSelectedSubtitle")}</Text>
          </AppCard>
        ) : null}

        <AppCard style={styles.greetingCard}>
          <Text style={styles.greetingTitle}>
            {t("homeGreeting", {
              defaultValue: "Good morning, {{name}}",
              name: profile?.fullName?.trim() || t("notAvailable")
            })}
          </Text>
          <Text style={styles.greetingSub}>
            {t("homeDayStreak", { defaultValue: "Day {{count}} of tracking", count: streak })} · {lastLoggedText}
          </Text>
          <Text style={styles.greetingTrend}>{trendMsg}</Text>
        </AppCard>

        {sections.showMoodTrend ? (
          <AppCard>
            <SectionHeader title={t("moodTrend")} />
            <PillPicker options={[7, 30, 90]} value={window} onChange={setWindow} />
            <ChartWrapper>
              {isLoading ? <SkeletonBlock height={160} /> : <MoodTrendChart moods={moodEntries} days={window} label={t("dailyMoodIntensity")} />}
            </ChartWrapper>
            {periodDelta !== null ? (
              <Text style={styles.delta}>
                {periodDelta >= 0 ? "+" : ""}
                {formatNumber(periodDelta, i18n.language)} {t("insightsDeltaLabel")}
              </Text>
            ) : null}
          </AppCard>
        ) : null}

        {sections.showWellbeing ? (
          <AppCard>
            <SectionHeader title={t("wellbeingScore")} />
            <ProgressRing score={avgMood} />
            <Text style={styles.contextText}>{trendMsg}</Text>
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
                <MetricTile
                  label={trMetric("weight")}
                  value={latest?.weight ? formatNumber(latest.weight, i18n.language) : "--"}
                />
              ) : null}
              {prefs.showSleep ? (
                <MetricTile
                  label={trMetric("sleep")}
                  value={latest?.sleepHours ? formatNumber(latest.sleepHours, i18n.language) : "--"}
                />
              ) : null}
              {prefs.showMood ? (
                <MetricTile
                  label={trMetric("mood")}
                  value={latest?.moodScore ? formatNumber(latest.moodScore, i18n.language) : "--"}
                />
              ) : null}
            </View>
            {!prefs.showBp && !prefs.showWeight && !prefs.showSleep && !prefs.showMood ? (
              <Text style={styles.emptyText}>{t("homeMetricPrefsEmpty")}</Text>
            ) : null}
          </AppCard>
        ) : null}

        {sections.showSymptoms ? (
          <AppCard>
            <SectionHeader title={t("frequentSymptoms")} />
            <View style={styles.chips}>
              {topSymptoms.length ? (
                topSymptoms.map((item) => <ChipTag key={item} label={trSymptom(item)} />)
              ) : (
                <Text style={styles.empty}>{t("empty")}</Text>
              )}
            </View>
          </AppCard>
        ) : null}

        <AppCard>
          <SectionHeader title={t("homeAlertsTitle", { defaultValue: "Alerts & insights" })} />
          <View style={styles.alertStack}>
            <View style={styles.alertRow}>
              <View style={[styles.alertIcon, { backgroundColor: "#FDE7F1" }]}>
                <Ionicons name="analytics-outline" size={14} color={colors.primaryDark} />
              </View>
              <Text style={styles.alertText}>{trendMsg}</Text>
            </View>
            <View style={styles.alertRow}>
              <View style={[styles.alertIcon, { backgroundColor: "#FFF2E5" }]}>
                <Ionicons name="moon-outline" size={14} color="#C2743E" />
              </View>
              <Text style={styles.alertText}>
                {t("homeSleepAlert", { defaultValue: "Sleep trend needs attention on short-sleep days." })}
              </Text>
            </View>
            <View style={styles.alertRow}>
              <View style={[styles.alertIcon, { backgroundColor: "#EAF6EE" }]}>
                <Ionicons name="medkit-outline" size={14} color="#3A8C63" />
              </View>
              <Text style={styles.alertText}>
                {t("homeTopSymptom", { defaultValue: "Top symptom lately: {{symptom}}", symptom: topSymptomLabel })}
              </Text>
            </View>
          </View>
        </AppCard>

        <AppCard>
          <SectionHeader title={t("homeSupportTitle", { defaultValue: "Talk to someone" })} />
          <View style={styles.supportStack}>
            {[
              { icon: "🩺", title: t("homeSupportCounselor", { defaultValue: "Counselor" }), subtitle: t("homeSupportCounselorSub", { defaultValue: "Emotional support and coping plans" }) },
              { icon: "👩‍⚕️", title: t("homeSupportGyne", { defaultValue: "Gynecologist" }), subtitle: t("homeSupportGyneSub", { defaultValue: "Hormonal and menopause guidance" }) },
              { icon: "👥", title: t("homeSupportPeer", { defaultValue: "Peer group" }), subtitle: t("homeSupportPeerSub", { defaultValue: "Shared stories and support circles" }) },
              { icon: "🆘", title: t("homeSupportCrisis", { defaultValue: "Crisis line" }), subtitle: t("homeSupportCrisisSub", { defaultValue: "Immediate confidential support" }) }
            ].map((item) => (
              <Pressable key={item.title} style={styles.supportRow}>
                <Text style={styles.supportIcon}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.supportTitle}>{item.title}</Text>
                  <Text style={styles.supportSub}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        </AppCard>

        <AppButton
          label={t("homeStartCheckin", { defaultValue: "Start today's check-in →" })}
          onPress={() => router.push("/(tabs)/checkin" as any)}
        />
      </ScrollView>

      <Modal visible={showCustomize} transparent animationType="slide" onRequestClose={() => setShowCustomize(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t("chooseDashboardCards")}</Text>
            <View style={styles.prefList}>
              <Pressable style={styles.prefRow} onPress={() => updateDashboardSections({ showMoodTrend: !sections.showMoodTrend })}>
                <Text style={styles.prefLabel}>{sections.showMoodTrend ? `✓ ${t("moodTrend")}` : t("moodTrend")}</Text>
              </Pressable>
              <Pressable style={styles.prefRow} onPress={() => updateDashboardSections({ showWellbeing: !sections.showWellbeing })}>
                <Text style={styles.prefLabel}>{sections.showWellbeing ? `✓ ${t("wellbeingScore")}` : t("wellbeingScore")}</Text>
              </Pressable>
              <Pressable style={styles.prefRow} onPress={() => updateDashboardSections({ showSnapshot: !sections.showSnapshot })}>
                <Text style={styles.prefLabel}>{sections.showSnapshot ? `✓ ${t("healthSnapshot")}` : t("healthSnapshot")}</Text>
              </Pressable>
              <Pressable style={styles.prefRow} onPress={() => updateDashboardSections({ showSymptoms: !sections.showSymptoms })}>
                <Text style={styles.prefLabel}>{sections.showSymptoms ? `✓ ${t("frequentSymptoms")}` : t("frequentSymptoms")}</Text>
              </Pressable>
            </View>
            <View style={styles.sheetAction}>
              <Pressable style={styles.closeBtn} onPress={() => setShowCustomize(false)}>
                <Text style={styles.closeText}>{t("save")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.md, paddingBottom: 100, gap: spacing.sm },
  delta: {
    marginTop: spacing.xs,
    color: colors.primaryDark,
    fontWeight: "700"
  },
  contextText: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  greetingCard: {
    backgroundColor: "#FCE8F2",
    borderWidth: 1,
    borderColor: "#F4DCE8"
  },
  greetingTitle: { color: colors.text, fontWeight: "800", fontSize: 18 },
  greetingSub: { color: colors.primaryDark, fontWeight: "700", marginTop: 4 },
  greetingTrend: { color: colors.text, marginTop: 8, lineHeight: 20 },
  empty: { color: colors.textMuted },
  customizeRow: { alignItems: "flex-end", marginTop: -8, marginBottom: 2 },
  customizeBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    backgroundColor: "#FFF9FD",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  customizeLabel: { color: colors.primaryDark, fontWeight: "700", fontSize: 12 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  emptyText: { color: colors.textMuted, marginTop: 6 },
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
  prefLabel: { color: colors.text, fontWeight: "600" },
  alertStack: { gap: 8 },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: spacing.sm,
    paddingVertical: 10
  },
  alertIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  alertText: { flex: 1, color: colors.text, lineHeight: 19 },
  supportStack: { gap: 8 },
  supportRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  supportIcon: { fontSize: 18 },
  supportTitle: { color: colors.text, fontWeight: "700" },
  supportSub: { color: colors.textMuted, marginTop: 2, fontSize: 12 },
  sheetAction: { marginTop: spacing.sm },
  closeBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12
  },
  closeText: { color: "#FFF", fontWeight: "700", fontSize: 15 }
});
