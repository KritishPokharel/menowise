import { useMemo, useRef, useState } from "react";
import { Alert, Animated, Easing, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/AppButton";
import { OptionButton } from "@/components/checkin/OptionButton";
import { SymptomModal, type SymptomResponses, type SymptomKey } from "@/components/checkin/SymptomModal";
import { TopBar } from "@/components/TopBar";
import { AppCard } from "@/components/ui/AppCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { colors, spacing } from "@/constants/theme";
import { useAppStore } from "@/store/useAppStore";
import { selectionFeedback } from "@/utils/feedback";

type MoodLevel = "low" | "okay" | "good" | "great";
type ShareWithPartner = "yes" | "no" | "prefer-not";
type ShareWithChildren = "yes" | "no" | "na";

const moodMap: Record<MoodLevel, number> = {
  low: 40,
  okay: 60,
  good: 75,
  great: 90
};

const moodLabelMap: Record<MoodLevel, string> = {
  low: "😔 Low",
  okay: "😐 Okay",
  good: "🙂 Good",
  great: "😊 Great"
};

const symptomScaleToText = (score: number, t: (key: string, options?: any) => string) => {
  if (score <= 1) return t("checkin.mild", { defaultValue: "Mild" });
  if (score === 2) return t("checkin.moderate", { defaultValue: "Moderate" });
  return t("checkin.severe", { defaultValue: "Severe" });
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

export default function CheckInScreen() {
  const { t } = useTranslation();
  const addHealthLog = useAppStore((s) => s.addHealthLog);
  const addSymptom = useAppStore((s) => s.addSymptom);
  const [step, setStep] = useState(0);
  const [selectedMood, setSelectedMood] = useState<MoodLevel | null>(null);
  const [partnerShared, setPartnerShared] = useState<ShareWithPartner | null>(null);
  const [childrenShared, setChildrenShared] = useState<ShareWithChildren | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [symptomResponses, setSymptomResponses] = useState<SymptomResponses>(initialSymptomResponses);
  const [slideWidth, setSlideWidth] = useState(320);

  const translateX = useRef(new Animated.Value(0)).current;

  const goToStep = (nextStep: number) => {
    if (!slideWidth) return;
    Animated.timing(translateX, {
      toValue: -nextStep * slideWidth,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
    setStep(nextStep);
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

  const allSymptomsAnswered = useMemo(
    () => Object.values(symptomResponses).every((v) => v >= 0),
    [symptomResponses]
  );
  const canOpenSymptoms = !!selectedMood && !!partnerShared && !!childrenShared;

  const onSubmit = async () => {
    if (!selectedMood || !allSymptomsAnswered) return;
    setSubmitting(true);
    const date = new Date().toISOString().slice(0, 10);
    await addHealthLog({
      date,
      moodScore: moodMap[selectedMood]
    });

    await Promise.all([
      addSymptom("fatigue", symptomResponses.exhaustion),
      addSymptom("joint-pain", symptomResponses.jointPain),
      addSymptom("hot-flashes", symptomResponses.hotFlashes),
      addSymptom("sleep", symptomResponses.sleepIssues),
      addSymptom("vaginal-dryness", symptomResponses.vaginalDryness),
      addSymptom("depression", symptomResponses.depression)
    ]);

    setSubmitting(false);
    setShowModal(false);
    setIsComplete(true);
    selectionFeedback();
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        {!isComplete ? (
          <>
            <TopBar title={t("checkin")} subtitle={t("checkinSubtitle")} />
            <AppCard style={styles.heroCard}>
              <Image source={require("../../assets/icon.png")} style={styles.heroImage} resizeMode="contain" />
              <Text style={styles.heroTitle}>{t("checkin.dailyTitle", { defaultValue: "DAILY CHECK-IN" })}</Text>
              <Text style={styles.question}>{t("checkin.mainQuestion", { defaultValue: "How are you feeling today?" })}</Text>

              <View
                style={styles.sliderViewport}
                onLayout={(event) => {
                  const nextWidth = Math.round(event.nativeEvent.layout.width);
                  if (nextWidth > 0) setSlideWidth(nextWidth);
                }}
              >
                <Animated.View style={[styles.slider, { width: slideWidth * 4, transform: [{ translateX }] }]}>
                  <View style={[styles.slide, { width: slideWidth }]}>
                    <View style={styles.grid}>
                      <OptionButton label={t("checkin.low", { defaultValue: "Low" })} emoji="😔" selected={selectedMood === "low"} onPress={() => onMoodSelect("low")} />
                      <OptionButton label={t("checkin.okay", { defaultValue: "Okay" })} emoji="😐" selected={selectedMood === "okay"} onPress={() => onMoodSelect("okay")} />
                      <OptionButton label={t("checkin.good", { defaultValue: "Good" })} emoji="🙂" selected={selectedMood === "good"} onPress={() => onMoodSelect("good")} />
                      <OptionButton label={t("checkin.great", { defaultValue: "Great" })} emoji="😊" selected={selectedMood === "great"} onPress={() => onMoodSelect("great")} />
                    </View>
                  </View>

                  <View style={[styles.slide, { width: slideWidth }]}>
                    <SectionHeader title={t("checkin.partnerQuestion", { defaultValue: "Have you shared how you're feeling with your partner?" })} />
                    <View style={styles.flowOptions}>
                      {[
                        { key: "yes" as const, label: t("checkin.yes", { defaultValue: "Yes" }) },
                        { key: "no" as const, label: t("checkin.no", { defaultValue: "No" }) },
                        { key: "prefer-not" as const, label: t("checkin.preferNot", { defaultValue: "Prefer not to say" }) }
                      ].map((item) => (
                        <OptionButton
                          key={item.key}
                          label={item.label}
                          selected={partnerShared === item.key}
                          onPress={() => {
                            selectionFeedback();
                            setPartnerShared(item.key);
                            goToStep(2);
                          }}
                        />
                      ))}
                    </View>
                  </View>

                  <View style={[styles.slide, { width: slideWidth }]}>
                    <SectionHeader title={t("checkin.childrenQuestion", { defaultValue: "Have you shared this with your children?" })} />
                    <View style={styles.flowOptions}>
                      {[
                        { key: "yes" as const, label: t("checkin.yes", { defaultValue: "Yes" }) },
                        { key: "no" as const, label: t("checkin.no", { defaultValue: "No" }) },
                        { key: "na" as const, label: t("checkin.notApplicable", { defaultValue: "Not applicable" }) }
                      ].map((item) => (
                        <OptionButton
                          key={item.key}
                          label={item.label}
                          selected={childrenShared === item.key}
                          onPress={() => {
                            selectionFeedback();
                            setChildrenShared(item.key);
                            goToStep(3);
                          }}
                        />
                      ))}
                    </View>
                  </View>

                  <View style={[styles.slide, { width: slideWidth }]}>
                    <View style={styles.thanksWrap}>
                      <Text style={styles.thanksTitle}>{t("checkin.thanks", { defaultValue: "Thanks for sharing 💛" })}</Text>
                      {selectedMood ? (
                        <Text style={styles.moodEcho}>
                          {t("checkin.selectedMood", {
                            defaultValue: "Mood today: {{mood}}",
                            mood: moodLabelMap[selectedMood]
                          })}
                        </Text>
                      ) : null}
                      <Text style={styles.moodHint}>
                        {t("checkin.symptomHint", { defaultValue: "Your symptom check-in is ready below." })}
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              </View>
            </AppCard>

            <AppCard style={styles.symptomCard}>
              <Text style={styles.symptomCardTitle}>🩺 {t("checkin.symptomTitle", { defaultValue: "Log symptoms" })}</Text>
              <Text style={styles.symptomCardSub}>
                {t("checkin.symptomCardSub", {
                  defaultValue: "Complete the symptom check-in separately for a clearer daily snapshot."
                })}
              </Text>
              <View style={styles.symptomCtaWrap}>
                <Text style={styles.symptomCtaHint}>
                  {canOpenSymptoms
                    ? t("checkin.readyToComplete", { defaultValue: "Ready to complete check-in" })
                    : t("checkin.completeConversationFirst", { defaultValue: "Finish the 3 quick questions above first" })}
                </Text>
                <Animated.View style={{ opacity: canOpenSymptoms ? 1 : 0.6 }}>
                  <AppButton
                    label={t("checkin.logSymptoms", { defaultValue: "Log symptoms & complete check-in →" })}
                    onPress={() => {
                      if (!canOpenSymptoms) return;
                      setShowModal(true);
                    }}
                  />
                </Animated.View>
              </View>
            </AppCard>
          </>
        ) : (
          <ScrollView contentContainerStyle={styles.doneScroll}>
            <View style={styles.doneHero}>
              <Ionicons name="checkmark-circle" size={88} color={colors.success} />
              <Text style={styles.doneTitle}>{t("checkin.completeTitle", { defaultValue: "Check-in complete" })}</Text>
              <Text style={styles.doneMsg}>
                {t("checkin.completeMsg", {
                  defaultValue:
                    "Your symptoms are in the mild range today. Keep logging — patterns over time tell us more than a single day."
                })}
              </Text>
            </View>

            <AppCard>
              <SectionHeader title={t("checkin.snapshotTitle", { defaultValue: "TODAY'S SNAPSHOT" })} />
              {[
                ["Physical & mental exhaustion", symptomResponses.exhaustion],
                ["Joint discomfort", symptomResponses.jointPain],
                ["Hot flashes", symptomResponses.hotFlashes],
                ["Sleep", symptomResponses.sleepIssues],
                ["Vaginal dryness", symptomResponses.vaginalDryness],
                ["Mood", selectedMood ? moodMap[selectedMood] / 25 - 1 : 1],
                ["Depression", symptomResponses.depression]
              ].map(([label, value]) => {
                const score = Number(value);
                return (
                  <View key={String(label)} style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{label}</Text>
                    <Text style={[styles.summaryValue, { color: symptomSeverityColor(score) }]}>{symptomScaleToText(score, t)}</Text>
                  </View>
                );
              })}
            </AppCard>

            <AppButton
              label={t("checkin.newEntry", { defaultValue: "Start another check-in" })}
              variant="secondary"
              onPress={() => {
                setStep(0);
                setSelectedMood(null);
                setPartnerShared(null);
                setChildrenShared(null);
                setSymptomResponses(initialSymptomResponses);
                setIsComplete(false);
                translateX.setValue(0);
              }}
            />
          </ScrollView>
        )}
      </View>

      <SymptomModal
        visible={showModal}
        values={symptomResponses}
        onClose={() => setShowModal(false)}
        onChange={setSymptomValue}
        onSubmit={() => {
          if (!allSymptomsAnswered) {
            Alert.alert(
              t("checkin.fillSymptomsTitle", { defaultValue: "Almost there" }),
              t("checkin.fillSymptomsMsg", { defaultValue: "Please answer all symptom questions before submitting." })
            );
            return;
          }
          void onSubmit();
        }}
        submitting={submitting}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFF3F7" },
  container: { flex: 1, backgroundColor: "#FFF3F7", paddingHorizontal: spacing.md },
  heroCard: {
    borderRadius: 30,
    backgroundColor: "#B45586",
    shadowColor: "#A74877",
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
    overflow: "hidden"
  },
  heroImage: {
    width: 112,
    height: 112,
    alignSelf: "center",
    marginBottom: 6
  },
  heroTitle: {
    color: "#F8DDE8",
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 10,
    textAlign: "center"
  },
  question: {
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    marginBottom: spacing.md,
    textAlign: "center"
  },
  sliderViewport: {
    width: "100%",
    overflow: "hidden"
  },
  slider: {
    flexDirection: "row"
  },
  slide: {
    paddingRight: spacing.xs
  },
  grid: {
    gap: spacing.sm
  },
  flowOptions: {
    gap: spacing.xs
  },
  thanksWrap: {
    gap: spacing.md
  },
  thanksTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800"
  },
  moodEcho: {
    color: "#FCE7EF",
    fontSize: 15
  },
  moodHint: {
    color: "#FCE7EF",
    fontSize: 14
  },
  symptomCard: {
    borderRadius: 24,
    backgroundColor: "#FFFFFF"
  },
  symptomCardTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 20
  },
  symptomCardSub: {
    color: colors.textMuted,
    marginTop: 6
  },
  symptomCtaWrap: {
    marginTop: spacing.sm,
    gap: 8
  },
  symptomCtaHint: {
    color: colors.primaryDark,
    fontWeight: "600"
  },
  doneScroll: {
    paddingBottom: 100,
    gap: spacing.md
  },
  doneHero: {
    alignItems: "center",
    paddingVertical: spacing.lg
  },
  doneTitle: {
    marginTop: spacing.sm,
    color: colors.text,
    fontSize: 28,
    fontWeight: "800"
  },
  doneMsg: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3E3EA"
  },
  summaryLabel: {
    color: colors.text,
    fontWeight: "600"
  },
  summaryValue: {
    fontWeight: "800"
  }
});
