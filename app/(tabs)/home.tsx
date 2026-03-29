import { useMemo, useRef, useState } from "react";
import { Alert, Animated, Easing, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/AppButton";
import { MoodTrendChart } from "@/components/MoodTrendChart";
import { PillPicker } from "@/components/PillPicker";
import { TopBar } from "@/components/TopBar";
import { OptionButton } from "@/components/checkin/OptionButton";
import { SymptomModal, type SymptomKey, type SymptomResponses } from "@/components/checkin/SymptomModal";
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
import { selectionFeedback } from "@/utils/feedback";
import { formatNumber } from "@/utils/formatNumber";

type WindowSize = 7 | 30 | 90;
type MoodLevel = "low" | "okay" | "good" | "great";
type ShareWithPartner = "yes" | "no" | "prefer-not";
type ShareWithChildren = "yes" | "no" | "na";

const moodFromScore = (score: number): MoodTag => {
  if (score >= 80) return "motivated";
  if (score >= 70) return "focused";
  if (score >= 60) return "calm";
  if (score >= 50) return "stressed";
  return "anxious";
};

const moodMap: Record<MoodLevel, number> = { low: 40, okay: 60, good: 75, great: 90 };

const symptomScaleToText = (score: number, t: (key: string) => string) => {
  if (score <= 1) return t("checkinMild");
  if (score === 2) return t("checkinModerate");
  return t("checkinSevere");
};

const symptomSeverityColor = (score: number) => {
  if (score <= 1) return "#4FAF7A";
  if (score === 2) return "#E39C5A";
  return "#D95F5F";
};

const initialSymptomResponses: SymptomResponses = {
  exhaustion: -1,
  jointPain: -1,
  hotFlashes: -1,
  sleepIssues: -1,
  vaginalDryness: -1,
  depression: -1
};

/**
 * Wellbeing score (0-100) computed from Supabase data:
 *   Mood        40%  — latest mood_score (0-100)
 *   Symptoms    35%  — average recent intensity inverted: 100 - (avgIntensity / 4) * 100
 *   Sleep       15%  — distance from optimal 7.5h, capped at 100
 *   Weight      10%  — stability (low std-dev over last 7 logs = 100)
 */
const computeWellbeing = (
  logs: { moodScore?: number | null; sleepHours?: number | null; weight?: number | null }[],
  symptomRows: { intensity: number }[]
): number => {
  // Mood component (40%)
  const recentMoods = logs.slice(-7);
  const moodAvg = recentMoods.length
    ? recentMoods.reduce((s, l) => s + (l.moodScore ?? 60), 0) / recentMoods.length
    : 60;
  const moodScore = Math.min(100, Math.max(0, moodAvg));

  // Symptom component (35%) — lower intensity = better
  const recentSymptoms = symptomRows.slice(0, 30); // already sorted desc by created_at
  const avgIntensity = recentSymptoms.length
    ? recentSymptoms.reduce((s, r) => s + r.intensity, 0) / recentSymptoms.length
    : 2; // default mid if no data
  const symptomScore = Math.min(100, Math.max(0, 100 - (avgIntensity / 4) * 100));

  // Sleep component (15%) — optimal ~7.5h
  const recentSleep = logs.slice(-7).filter((l) => l.sleepHours != null);
  let sleepScore = 70; // default
  if (recentSleep.length) {
    const avgSleep = recentSleep.reduce((s, l) => s + (l.sleepHours ?? 7), 0) / recentSleep.length;
    const deviation = Math.abs(avgSleep - 7.5);
    sleepScore = Math.min(100, Math.max(0, 100 - deviation * 20));
  }

  // Weight stability component (10%) — low std-dev = good
  const recentWeights = logs.slice(-7).filter((l) => l.weight != null).map((l) => l.weight!);
  let weightScore = 80; // default
  if (recentWeights.length >= 2) {
    const mean = recentWeights.reduce((a, b) => a + b, 0) / recentWeights.length;
    const variance = recentWeights.reduce((s, w) => s + (w - mean) ** 2, 0) / recentWeights.length;
    const stdDev = Math.sqrt(variance);
    weightScore = Math.min(100, Math.max(0, 100 - stdDev * 20));
  }

  return Math.round(moodScore * 0.4 + symptomScore * 0.35 + sleepScore * 0.15 + weightScore * 0.1);
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
  const addHealthLog = useAppStore((s) => s.addHealthLog);
  const addSymptom = useAppStore((s) => s.addSymptom);

  const [window, setWindow] = useState<WindowSize>(30);
  const [showCustomize, setShowCustomize] = useState(false);

  // Check-in state
  const [selectedMood, setSelectedMood] = useState<MoodLevel | null>(null);
  const [partnerShared, setPartnerShared] = useState<ShareWithPartner | null>(null);
  const [childrenShared, setChildrenShared] = useState<ShareWithChildren | null>(null);
  const [showSymptomModal, setShowSymptomModal] = useState(false);
  const [isCheckinComplete, setIsCheckinComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [symptomResponses, setSymptomResponses] = useState<SymptomResponses>(initialSymptomResponses);
  const [sleepInput, setSleepInput] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [slideWidth, setSlideWidth] = useState(320);
  const translateX = useRef(new Animated.Value(0)).current;

  const moodLabelMap: Record<MoodLevel, string> = {
    low: t("checkinLow"),
    okay: t("checkinOkay"),
    good: t("checkinGood"),
    great: t("checkinGreat")
  };

  const goToStep = (nextStep: number) => {
    if (!slideWidth) return;
    Animated.timing(translateX, {
      toValue: -nextStep * slideWidth,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  };

  const onMoodSelect = (mood: MoodLevel) => {
    selectionFeedback();
    setSelectedMood(mood);
    goToStep(1);
  };

  const setSymptomValue = (key: SymptomKey, value: number) => {
    selectionFeedback();
    setSymptomResponses((prev) => ({ ...prev, [key]: value }));
  };

  const allSymptomsAnswered = useMemo(() => Object.values(symptomResponses).every((v) => v >= 0), [symptomResponses]);
  const canOpenSymptoms = !!selectedMood && !!partnerShared && !!childrenShared;

  const onCheckinSubmit = async () => {
    if (!selectedMood || !allSymptomsAnswered) return;
    setSubmitting(true);
    const date = new Date().toISOString().slice(0, 10);
    const sleepHours = parseFloat(sleepInput) || null;
    const weight = parseFloat(weightInput) || null;
    await addHealthLog({ date, moodScore: moodMap[selectedMood], sleepHours, weight });
    await Promise.all([
      addSymptom("fatigue", symptomResponses.exhaustion),
      addSymptom("joint-pain", symptomResponses.jointPain),
      addSymptom("hot-flashes", symptomResponses.hotFlashes),
      addSymptom("sleep", symptomResponses.sleepIssues),
      addSymptom("vaginal-dryness", symptomResponses.vaginalDryness),
      addSymptom("depression", symptomResponses.depression)
    ]);
    setSubmitting(false);
    setShowSymptomModal(false);
    setIsCheckinComplete(true);
    selectionFeedback();
  };

  const resetCheckin = () => {
    setSelectedMood(null);
    setPartnerShared(null);
    setChildrenShared(null);
    setSymptomResponses(initialSymptomResponses);
    setSleepInput("");
    setWeightInput("");
    setIsCheckinComplete(false);
    translateX.setValue(0);
  };

  // Dashboard data
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
  const hasAnyLogs = logs.length > 0;
  const hasMoodData = moodEntries.length > 0;
  const hasSymptomData = symptoms.length > 0;
  const hasSnapshotData = Boolean(
    latest &&
      (latest.bpSystolic ||
        latest.bpDiastolic ||
        latest.weight ||
        latest.sleepHours ||
        latest.moodScore)
  );
  const hasWellbeingData = hasAnyLogs || hasSymptomData;

  const wellbeingScore = useMemo(
    () => computeWellbeing(logs, symptoms),
    [logs, symptoms]
  );

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
  const counselorPhone = "+977-9864067676";
  const counselorTel = "tel:+9779864067676";
  const counselorWhatsapp = "https://wa.me/9779864067676";

  const visibleCardCount =
    Number(sections.showMoodTrend) +
    Number(sections.showWellbeing) +
    Number(sections.showSnapshot) +
    Number(sections.showSymptoms);

  const openCounselorPopup = () => {
    Alert.alert(
      t("homeSupportCounselor", { defaultValue: "Counselor" }),
      [
        t("homeSupportPopupName", { defaultValue: "mankaa kura" }),
        counselorPhone
      ].join("\n"),
      [
        {
          text: t("homeSupportCall", { defaultValue: "Call" }),
          onPress: () => {
            void Linking.openURL(counselorTel);
          }
        },
        {
          text: "WhatsApp",
          onPress: () => {
            void Linking.openURL(counselorWhatsapp);
          }
        },
        {
          text: t("back", { defaultValue: "Back" }),
          style: "cancel"
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TopBar title={t("todaysDashboard")} subtitle={t("dashboardSubtitle")} />
        <View style={styles.customizeRow}>
          <Pressable style={styles.customizeBtn} onPress={() => setShowCustomize(true)}>
            <Text style={styles.customizeLabel}>{t("customizeDashboard")}</Text>
          </Pressable>
        </View>

        {/* Greeting */}
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

        {/* Inline Check-in */}
        {!isCheckinComplete ? (
          <>
            <AppCard style={styles.checkinCard}>
              <Image source={require("../../assets/icon.png")} style={styles.heroImage} resizeMode="contain" />
              <Text style={styles.checkinLabel}>{t("checkinDailyTitle")}</Text>
              <Text style={styles.checkinQuestion}>{t("checkinMainQuestion")}</Text>

              <View
                style={styles.sliderViewport}
                onLayout={(e) => {
                  const w = Math.round(e.nativeEvent.layout.width);
                  if (w > 0) setSlideWidth(w);
                }}
              >
                <Animated.View style={[styles.slider, { width: slideWidth * 5, transform: [{ translateX }] }]}>
                  {/* Step 1 — mood */}
                  <View style={[styles.slide, { width: slideWidth }]}>
                    <View style={styles.checkinGrid}>
                      <OptionButton label={t("checkinLow")} emoji="😔" selected={selectedMood === "low"} onPress={() => onMoodSelect("low")} />
                      <OptionButton label={t("checkinOkay")} emoji="😐" selected={selectedMood === "okay"} onPress={() => onMoodSelect("okay")} />
                      <OptionButton label={t("checkinGood")} emoji="🙂" selected={selectedMood === "good"} onPress={() => onMoodSelect("good")} />
                      <OptionButton label={t("checkinGreat")} emoji="😊" selected={selectedMood === "great"} onPress={() => onMoodSelect("great")} />
                    </View>
                  </View>

                  {/* Step 2 — partner */}
                  <View style={[styles.slide, { width: slideWidth }]}>
                    <SectionHeader title={t("checkinPartnerQuestion")} />
                    <View style={styles.flowOptions}>
                      {([
                        { key: "yes" as const, label: t("checkinYes") },
                        { key: "no" as const, label: t("checkinNo") },
                        { key: "prefer-not" as const, label: t("checkinPreferNot") }
                      ]).map((item) => (
                        <OptionButton
                          key={item.key}
                          label={item.label}
                          selected={partnerShared === item.key}
                          onPress={() => { selectionFeedback(); setPartnerShared(item.key); goToStep(2); }}
                        />
                      ))}
                    </View>
                  </View>

                  {/* Step 3 — children */}
                  <View style={[styles.slide, { width: slideWidth }]}>
                    <SectionHeader title={t("checkinChildrenQuestion")} />
                    <View style={styles.flowOptions}>
                      {([
                        { key: "yes" as const, label: t("checkinYes") },
                        { key: "no" as const, label: t("checkinNo") },
                        { key: "na" as const, label: t("checkinNotApplicable") }
                      ]).map((item) => (
                        <OptionButton
                          key={item.key}
                          label={item.label}
                          selected={childrenShared === item.key}
                          onPress={() => { selectionFeedback(); setChildrenShared(item.key); goToStep(3); }}
                        />
                      ))}
                    </View>
                  </View>

                  {/* Step 4 — sleep & weight */}
                  <View style={[styles.slide, { width: slideWidth }]}>
                    <SectionHeader title={t("healthSnapshot")} />
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{trMetric("sleep")} (hrs)</Text>
                      <TextInput
                        value={sleepInput}
                        onChangeText={setSleepInput}
                        style={styles.inlineInput}
                        placeholder="e.g. 7.5"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        textContentType="none"
                        autoComplete="off"
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{trMetric("weight")} (kg)</Text>
                      <TextInput
                        value={weightInput}
                        onChangeText={setWeightInput}
                        style={styles.inlineInput}
                        placeholder="e.g. 62"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        textContentType="none"
                        autoComplete="off"
                      />
                    </View>
                    <Pressable
                      style={styles.nextStepBtn}
                      onPress={() => { selectionFeedback(); goToStep(4); }}
                    >
                      <Text style={styles.nextStepText}>{t("checkinYes", { defaultValue: "Continue" })}</Text>
                    </Pressable>
                  </View>

                  {/* Step 5 — thanks */}
                  <View style={[styles.slide, { width: slideWidth }]}>
                    <View style={styles.thanksWrap}>
                      <Text style={styles.thanksTitle}>{t("checkinThanks")}</Text>
                      {selectedMood ? (
                        <Text style={styles.moodEcho}>{t("checkinSelectedMood", { mood: moodLabelMap[selectedMood] })}</Text>
                      ) : null}
                      <Text style={styles.moodHint}>{t("checkinSymptomHint")}</Text>
                    </View>
                  </View>
                </Animated.View>
              </View>
            </AppCard>

            <AppCard style={styles.symptomCtaCard}>
              <View style={styles.symptomCtaHeader}>
                <View style={[styles.alertIcon, { backgroundColor: "#FDE7F1" }]}>
                  <Ionicons name="fitness-outline" size={16} color={colors.primaryDark} />
                </View>
                <Text style={styles.symptomCtaTitle}>{t("checkinSymptomTitle")}</Text>
              </View>
              <Text style={styles.symptomCtaSub}>{t("checkinSymptomCardSub")}</Text>
              <Text style={styles.symptomCtaHint}>
                {canOpenSymptoms ? t("checkinReadyToComplete") : t("checkinCompleteConversationFirst")}
              </Text>
              <Animated.View style={{ opacity: canOpenSymptoms ? 1 : 0.6, marginTop: 8 }}>
                <AppButton
                  label={t("checkinLogSymptoms")}
                  onPress={() => { if (canOpenSymptoms) setShowSymptomModal(true); }}
                />
              </Animated.View>
            </AppCard>
          </>
        ) : (
          <AppCard style={styles.doneCard}>
            <View style={styles.doneRow}>
              <Ionicons name="checkmark-circle" size={32} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.doneTitle}>{t("checkinCompleteTitle")}</Text>
                <Text style={styles.doneMsg}>{t("checkinCompleteMsg")}</Text>
              </View>
            </View>

            <View style={styles.snapshotGrid}>
              {([
                [t("checkinSymptomsExhaustion"), symptomResponses.exhaustion],
                [t("checkinSymptomsJointPain"), symptomResponses.jointPain],
                [t("checkinSymptomsHotFlashes"), symptomResponses.hotFlashes],
                [t("checkinSymptomsSleepIssues"), symptomResponses.sleepIssues],
                [t("checkinSymptomsVaginalDryness"), symptomResponses.vaginalDryness],
                [t("checkinSymptomsDepression"), symptomResponses.depression]
              ] as [string, number][]).map(([label, value]) => (
                <View key={label} style={styles.snapshotRow}>
                  <Text style={styles.snapshotLabel}>{label}</Text>
                  <Text style={[styles.snapshotValue, { color: symptomSeverityColor(value) }]}>
                    {symptomScaleToText(value, t)} ({formatNumber(value, i18n.language)})
                  </Text>
                </View>
              ))}
            </View>

            <AppButton label={t("checkinNewEntry")} variant="secondary" onPress={resetCheckin} />
          </AppCard>
        )}

        {/* Dashboard Cards */}
        {visibleCardCount === 0 ? (
          <AppCard>
            <Text style={styles.emptyTitle}>
              {t("noMetricsSelectedTitle", { name: profile?.fullName?.trim() || t("notAvailable") })}
            </Text>
            <Text style={styles.emptyText}>{t("noMetricsSelectedSubtitle")}</Text>
          </AppCard>
        ) : null}

        {sections.showMoodTrend && hasMoodData ? (
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

        {sections.showWellbeing && hasWellbeingData ? (
          <AppCard>
            <SectionHeader title={t("wellbeingScore")} />
            <ProgressRing score={wellbeingScore} />
            <Text style={styles.contextText}>{trendMsg}</Text>
          </AppCard>
        ) : null}

        {sections.showSnapshot && hasSnapshotData ? (
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
            {!prefs.showBp && !prefs.showWeight && !prefs.showSleep && !prefs.showMood ? (
              <Text style={styles.emptyText}>{t("homeMetricPrefsEmpty")}</Text>
            ) : null}
          </AppCard>
        ) : null}

        {sections.showSymptoms && hasSymptomData ? (
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

        {/* Alerts & Insights */}
        {hasAnyLogs || hasSymptomData ? (
          <AppCard>
            <SectionHeader title={t("homeAlertsTitle", { defaultValue: "Alerts & insights" })} />
            <View style={styles.alertStack}>
              {hasMoodData ? (
                <View style={styles.alertRow}>
                  <View style={[styles.alertIcon, { backgroundColor: "#FDE7F1" }]}>
                    <Ionicons name="analytics-outline" size={14} color={colors.primaryDark} />
                  </View>
                  <Text style={styles.alertText}>{trendMsg}</Text>
                </View>
              ) : null}
              {logs.some((l) => l.sleepHours != null) ? (
                <View style={styles.alertRow}>
                  <View style={[styles.alertIcon, { backgroundColor: "#FFF2E5" }]}>
                    <Ionicons name="moon-outline" size={14} color="#C2743E" />
                  </View>
                  <Text style={styles.alertText}>
                    {t("homeSleepAlert", { defaultValue: "Sleep trend needs attention on short-sleep days." })}
                  </Text>
                </View>
              ) : null}
              {hasSymptomData ? (
                <View style={styles.alertRow}>
                  <View style={[styles.alertIcon, { backgroundColor: "#EAF6EE" }]}>
                    <Ionicons name="medkit-outline" size={14} color="#3A8C63" />
                  </View>
                  <Text style={styles.alertText}>
                    {t("homeTopSymptom", { defaultValue: "Top symptom lately: {{symptom}}", symptom: topSymptomLabel })}
                  </Text>
                </View>
              ) : null}

              {partnerShared === "no" ? (
                <Pressable style={styles.alertRow} onPress={() => router.push("/(tabs)/insights" as any)}>
                  <View style={[styles.alertIcon, { backgroundColor: "#E8EDFD" }]}>
                    <Ionicons name="chatbubbles-outline" size={14} color="#5468B7" />
                  </View>
                  <Text style={[styles.alertText, styles.alertLink]}>
                    {t("insightPartnerComm", { defaultValue: "You chose not to share with your partner. Read an article on communicating during menopause." })}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              ) : null}

              {hasWellbeingData && wellbeingScore < 70 ? (
                <Pressable style={styles.alertRow} onPress={() => router.push("/(tabs)/insights" as any)}>
                  <View style={[styles.alertIcon, { backgroundColor: "#FDE7F1" }]}>
                    <Ionicons name="leaf-outline" size={14} color={colors.primaryDark} />
                  </View>
                  <Text style={[styles.alertText, styles.alertLink]}>
                    {t("insightLowWellbeing", { defaultValue: "Your wellbeing score is {{score}}. Explore self-care tips to feel better.", score: wellbeingScore })}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
          </AppCard>
        ) : null}

        {/* Talk to someone — counselor only */}
        <AppCard>
          <SectionHeader title={t("homeSupportTitle", { defaultValue: "Talk to someone" })} />
          <View style={styles.alertStack}>
            <Pressable style={styles.alertRow} onPress={openCounselorPopup}>
              <View style={[styles.alertIcon, { backgroundColor: "#FDE7F1" }]}>
                <Ionicons name="heart-circle-outline" size={16} color={colors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.supportTitle}>{t("homeSupportCounselor", { defaultValue: "Counselor" })}</Text>
                <Text style={styles.supportSub}>{t("homeSupportCounselorSub", { defaultValue: "Emotional support and coping plans" })}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        </AppCard>
      </ScrollView>

      {/* Customize modal */}
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

      {/* Symptom modal */}
      <SymptomModal
        visible={showSymptomModal}
        values={symptomResponses}
        onClose={() => setShowSymptomModal(false)}
        onChange={setSymptomValue}
        onSubmit={() => {
          if (!allSymptomsAnswered) {
            Alert.alert(t("checkinFillSymptomsTitle"), t("checkinFillSymptomsMsg"));
            return;
          }
          void onCheckinSubmit();
        }}
        submitting={submitting}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.md, paddingBottom: 100, gap: spacing.sm },

  // Check-in card
  checkinCard: {
    borderRadius: 30,
    backgroundColor: "#B45586",
    shadowColor: "#A74877",
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
    overflow: "hidden"
  },
  heroImage: { width: 90, height: 90, alignSelf: "center", marginBottom: 4 },
  checkinLabel: {
    color: "#F8DDE8",
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 8,
    textAlign: "center"
  },
  checkinQuestion: {
    color: "#FFFFFF",
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "800",
    marginBottom: spacing.md,
    textAlign: "center"
  },
  sliderViewport: { width: "100%", overflow: "hidden" },
  slider: { flexDirection: "row" },
  slide: { paddingRight: spacing.xs },
  checkinGrid: { gap: spacing.sm },
  flowOptions: { gap: spacing.xs },
  thanksWrap: { gap: spacing.md },
  thanksTitle: { color: "#FFFFFF", fontSize: 24, fontWeight: "800" },
  moodEcho: { color: "#FCE7EF", fontSize: 15 },
  moodHint: { color: "#FCE7EF", fontSize: 14 },

  // Sleep & weight inputs inside checkin
  inputGroup: { marginBottom: 12 },
  inputLabel: { color: "#FFFFFF", fontWeight: "700", marginBottom: 6 },
  inlineInput: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600"
  },
  nextStepBtn: {
    marginTop: 4,
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 12
  },
  nextStepText: { color: "#FFFFFF", fontWeight: "700" },

  // Symptom CTA card
  symptomCtaCard: { borderRadius: 24, backgroundColor: "#FFFFFF" },
  symptomCtaHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  symptomCtaTitle: { color: colors.text, fontWeight: "800", fontSize: 18 },
  symptomCtaSub: { color: colors.textMuted, marginTop: 4 },
  symptomCtaHint: { color: colors.primaryDark, fontWeight: "600", marginTop: spacing.sm },

  // Check-in complete
  doneCard: { backgroundColor: "#F2FBF5", borderWidth: 1, borderColor: "#D2EDDB" },
  doneRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: spacing.sm },
  doneTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  doneMsg: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  snapshotGrid: { marginBottom: spacing.sm },
  snapshotRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#DEF0E4"
  },
  snapshotLabel: { color: colors.text, fontWeight: "600" },
  snapshotValue: { fontWeight: "800" },

  // Dashboard
  delta: { marginTop: spacing.xs, color: colors.primaryDark, fontWeight: "700" },
  contextText: { color: colors.textMuted, textAlign: "center", marginTop: spacing.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  greetingCard: { backgroundColor: "#FCE8F2", borderWidth: 1, borderColor: "#F4DCE8" },
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

  // Alerts & support — unified style
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
  alertLink: { color: colors.primaryDark, fontWeight: "600" },
  supportTitle: { color: colors.text, fontWeight: "700" },
  supportSub: { color: colors.textMuted, marginTop: 2, fontSize: 12 },

  // Modals
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
