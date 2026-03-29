import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  ListRenderItemInfo,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/AppButton";
import { InputField } from "@/components/InputField";
import { AppCard } from "@/components/ui/AppCard";
import { colors, radius, spacing } from "@/constants/theme";
import { useAppStore, type HealthPreferences } from "@/store/useAppStore";
import type { MoodTag, ReproductiveStage, SymptomTag } from "@/types";
import { formatNumber } from "@/utils/formatNumber";
import { selectionFeedback } from "@/utils/feedback";

type JourneyStage = "pre-menopause" | "perimenopause" | "post-menopause" | "not-sure";
type PregnancyStatus = "yes" | "no" | "not-sure";
type SupportSystem = "strong" | "some" | "none" | "prefer-not";
type ChildrenChoice = "yes" | "no" | "prefer-not";
type PartnerChoice = "yes" | "no" | "prefer-not";
type CommunicationChoice = "yes" | "no" | "prefer-not";
type StepId =
  | "welcome"
  | "account"
  | "name"
  | "birth-year"
  | "life-stage"
  | "last-period"
  | "cycle-info"
  | "pregnancy"
  | "symptoms"
  | "support-children"
  | "emotional"
  | "complete";

interface LastPeriod {
  month: number;
  day: number;
  year: number;
}

interface OnboardingOutput {
  name: string;
  age: number;
  life_stage: JourneyStage;
  last_period: string | null;
  cycle_length: number | null;
  period_length: number | null;
  pregnant: PregnancyStatus;
  symptoms: string[];
  support_system: SupportSystem | null;
  has_partner: PartnerChoice | null;
  communicated_with_partner: CommunicationChoice | null;
  children: ChildrenChoice | null;
  children_count: number | null;
  communicated_with_children: CommunicationChoice | null;
  emotional_state: string;
}

const itemHeight = 48;
const wheelHeight = 220;
const symptomOptions: Array<{ key: SymptomTag | "other"; icon: keyof typeof Ionicons.glyphMap; category: "Physical" | "Emotional" | "Sleep" }> = [
  { key: "hot-flashes", icon: "flame-outline", category: "Physical" },
  { key: "joint-pain", icon: "body-outline", category: "Physical" },
  { key: "fatigue", icon: "battery-dead-outline", category: "Physical" },
  { key: "night-sweats", icon: "water-outline", category: "Physical" },
  { key: "brain-fog", icon: "cloud-outline", category: "Emotional" },
  { key: "anxiety", icon: "alert-circle-outline", category: "Emotional" },
  { key: "mood-swings", icon: "pulse-outline", category: "Emotional" },
  { key: "insomnia", icon: "moon-outline", category: "Sleep" },
  { key: "other", icon: "add-circle-outline", category: "Physical" }
];

const toLifecycleForSave = (stage: JourneyStage, pregnant: PregnancyStatus): ReproductiveStage => {
  if (pregnant === "yes") return "pregnant";
  if (stage === "pre-menopause") return "pre-menopause";
  if (stage === "post-menopause") return "post-menopause";
  return "perimenopause";
};

const deriveMoodBaseline = (text: string, symptoms: string[]): MoodTag => {
  const normalized = text.toLowerCase();
  if (normalized.includes("anxious") || symptoms.includes("anxiety")) return "anxious";
  if (normalized.includes("overwhelmed") || normalized.includes("burnout")) return "overwhelmed";
  if (normalized.includes("sad")) return "sad";
  if (normalized.includes("focus")) return "focused";
  if (normalized.includes("stress")) return "stressed";
  if (normalized.includes("motivated")) return "motivated";
  return "calm";
};

const shouldTrackSleep = (symptoms: string[]) => symptoms.includes("insomnia") || symptoms.includes("night-sweats") || symptoms.includes("fatigue");

export default function OnboardingScreen() {
  const { i18n } = useTranslation();
  const user = useAppStore((s) => s.user);
  const signUp = useAppStore((s) => s.signUp);
  const signIn = useAppStore((s) => s.signIn);
  const profile = useAppStore((s) => s.profile);
  const saveOnboarding = useAppStore((s) => s.saveOnboarding);
  const updateDashboardSections = useAppStore((s) => s.updateDashboardSections);
  const addSymptom = useAppStore((s) => s.addSymptom);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: currentYear - 1940 - 12 + 1 }).map((_, idx) => currentYear - 12 - idx);
  }, []);
  const months = useMemo(() => Array.from({ length: 12 }).map((_, i) => i + 1), []);
  const monthDays = useMemo(() => Array.from({ length: 31 }).map((_, i) => i + 1), []);

  const [stepIndex, setStepIndex] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState(profile?.fullName ?? "");
  const [birthYear, setBirthYear] = useState(profile?.birthYear ?? (years[24] ?? 1990));
  const [stage, setStage] = useState<JourneyStage>(
    profile?.lifecycleStage === "pre-menopause" || profile?.lifecycleStage === "perimenopause" || profile?.lifecycleStage === "post-menopause"
      ? profile.lifecycleStage
      : "not-sure"
  );
  const [lastPeriod, setLastPeriod] = useState<LastPeriod>({
    month: new Date().getMonth() + 1,
    day: new Date().getDate(),
    year: new Date().getFullYear()
  });
  const [cycleLength, setCycleLength] = useState(profile?.cycleLength ?? 28);
  const [periodLength, setPeriodLength] = useState(profile?.periodLength ?? 5);
  const [cycleNotSure, setCycleNotSure] = useState(false);
  const [pregnant, setPregnant] = useState<PregnancyStatus>("no");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [supportSystem, setSupportSystem] = useState<SupportSystem | null>(null);
  const [hasPartner, setHasPartner] = useState<PartnerChoice | null>(null);
  const [partnerCommunication, setPartnerCommunication] = useState<CommunicationChoice | null>(null);
  const [children, setChildren] = useState<ChildrenChoice | null>(null);
  const [childrenCount, setChildrenCount] = useState(1);
  const [childrenCommunication, setChildrenCommunication] = useState<CommunicationChoice | null>(null);
  const [emotionalState, setEmotionalState] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedDraft, setLoadedDraft] = useState(false);

  const listRef = useRef<FlatList<number>>(null);
  const animOpacity = useRef(new Animated.Value(1)).current;
  const animY = useRef(new Animated.Value(0)).current;
  const age = new Date().getFullYear() - birthYear;

  const identityKey = user?.id ?? "guest";
  const draftKey = `menowise:onboarding:draft:${identityKey}`;
  const showCycleSteps = stage === "pre-menopause" || stage === "perimenopause";

  const steps = useMemo<StepId[]>(() => {
    const base: StepId[] = ["welcome"];
    if (!user) {
      base.push("account");
    }
    base.push("name", "birth-year", "life-stage");
    if (showCycleSteps) {
      base.push("last-period", "cycle-info");
    }
    base.push("pregnancy", "symptoms", "support-children", "emotional", "complete");
    return base;
  }, [showCycleSteps, user]);

  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];
  const journeySteps = steps.filter((s) => s !== "welcome" && s !== "complete");
  const journeyPosition = currentStep === "welcome" || currentStep === "complete" ? 0 : journeySteps.indexOf(currentStep) + 1;
  const progress = journeySteps.length ? journeyPosition / journeySteps.length : 0;

  useEffect(() => {
    void (async () => {
      const raw = await AsyncStorage.getItem(draftKey);
      if (!raw) {
        setLoadedDraft(true);
        return;
      }
      try {
        const parsed = JSON.parse(raw) as Partial<{
          stepIndex: number;
          email: string;
          password: string;
          confirmPassword: string;
          name: string;
          birthYear: number;
          stage: JourneyStage;
          lastPeriod: LastPeriod;
          cycleLength: number;
          periodLength: number;
          cycleNotSure: boolean;
          pregnant: PregnancyStatus;
          symptoms: string[];
          supportSystem: SupportSystem | null;
          hasPartner: PartnerChoice | null;
          partnerCommunication: CommunicationChoice | null;
          children: ChildrenChoice | null;
          childrenCount: number;
          childrenCommunication: CommunicationChoice | null;
          emotionalState: string;
        }>;
        if (typeof parsed.stepIndex === "number") setStepIndex(parsed.stepIndex);
        if (typeof parsed.email === "string") setEmail(parsed.email);
        if (typeof parsed.password === "string") setPassword(parsed.password);
        if (typeof parsed.confirmPassword === "string") setConfirmPassword(parsed.confirmPassword);
        if (typeof parsed.name === "string") setName(parsed.name);
        if (typeof parsed.birthYear === "number") setBirthYear(parsed.birthYear);
        if (parsed.stage) setStage(parsed.stage);
        if (parsed.lastPeriod) setLastPeriod(parsed.lastPeriod);
        if (typeof parsed.cycleLength === "number") setCycleLength(parsed.cycleLength);
        if (typeof parsed.periodLength === "number") setPeriodLength(parsed.periodLength);
        if (typeof parsed.cycleNotSure === "boolean") setCycleNotSure(parsed.cycleNotSure);
        if (parsed.pregnant) setPregnant(parsed.pregnant);
        if (Array.isArray(parsed.symptoms)) setSymptoms(parsed.symptoms);
        if (parsed.supportSystem) setSupportSystem(parsed.supportSystem);
        if (parsed.hasPartner) setHasPartner(parsed.hasPartner);
        if (parsed.partnerCommunication) setPartnerCommunication(parsed.partnerCommunication);
        if (parsed.children) setChildren(parsed.children);
        if (typeof parsed.childrenCount === "number") setChildrenCount(parsed.childrenCount);
        if (parsed.childrenCommunication) setChildrenCommunication(parsed.childrenCommunication);
        if (typeof parsed.emotionalState === "string") setEmotionalState(parsed.emotionalState);
      } catch {
        // ignore invalid draft
      } finally {
        setLoadedDraft(true);
      }
    })();
  }, [draftKey]);

  useEffect(() => {
    if (!loadedDraft) return;
    void AsyncStorage.setItem(
      draftKey,
      JSON.stringify({
        stepIndex,
        email,
        password,
        confirmPassword,
        name,
        birthYear,
        stage,
        lastPeriod,
        cycleLength,
        periodLength,
        cycleNotSure,
        pregnant,
        symptoms,
        supportSystem,
        hasPartner,
        partnerCommunication,
        children,
        childrenCount,
        childrenCommunication,
        emotionalState
      })
    );
  }, [
    birthYear,
    children,
    childrenCommunication,
    childrenCount,
    cycleLength,
    cycleNotSure,
    draftKey,
    email,
    emotionalState,
    hasPartner,
    lastPeriod,
    loadedDraft,
    name,
    confirmPassword,
    password,
    partnerCommunication,
    periodLength,
    pregnant,
    stage,
    stepIndex,
    supportSystem,
    symptoms
  ]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animOpacity, { toValue: 0, duration: 90, useNativeDriver: true }),
      Animated.timing(animY, { toValue: 8, duration: 90, useNativeDriver: true })
    ]).start(() => {
      Animated.parallel([
        Animated.timing(animOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(animY, { toValue: 0, duration: 180, useNativeDriver: true })
      ]).start();
    });
  }, [animOpacity, animY, currentStep]);

  const canContinue = useMemo(() => {
    if (currentStep === "welcome") return true;
    if (currentStep === "account") return email.includes("@") && password.length >= 6 && confirmPassword.length >= 6;
    if (currentStep === "name") return name.trim().length > 1;
    if (currentStep === "birth-year") return birthYear >= 1940;
    if (currentStep === "life-stage") return !!stage;
    if (currentStep === "last-period") return !!lastPeriod.month && !!lastPeriod.day && !!lastPeriod.year;
    if (currentStep === "cycle-info") return cycleNotSure || (cycleLength > 0 && periodLength > 0);
    if (currentStep === "pregnancy") return !!pregnant;
    if (currentStep === "symptoms") return symptoms.length > 0;
    if (currentStep === "support-children") {
      if (!supportSystem || !hasPartner || !children) return false;
      if (hasPartner === "yes" && !partnerCommunication) return false;
      if (children === "yes" && (!childrenCommunication || childrenCount < 1)) return false;
      return true;
    }
    if (currentStep === "emotional") return emotionalState.trim().length > 0;
    return true;
  }, [
    birthYear,
    children,
    childrenCommunication,
    childrenCount,
    confirmPassword.length,
    currentStep,
    cycleLength,
    cycleNotSure,
    email,
    emotionalState,
    hasPartner,
    lastPeriod.day,
    lastPeriod.month,
    lastPeriod.year,
    name,
    partnerCommunication,
    password.length,
    periodLength,
    pregnant,
    stage,
    supportSystem,
    symptoms.length
  ]);

  const onYearMomentumEnd = (offsetY: number) => {
    const index = Math.round(offsetY / itemHeight);
    const selected = years[Math.max(0, Math.min(years.length - 1, index))];
    setBirthYear(selected);
  };

  const next = () => {
    if (!canContinue) return;
    if (currentStep === "account" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    selectionFeedback();
    Keyboard.dismiss();
    setError(null);
    setStepIndex((s) => Math.min(steps.length - 1, s + 1));
  };

  const back = () => {
    selectionFeedback();
    Keyboard.dismiss();
    setError(null);
    setStepIndex((s) => Math.max(0, s - 1));
  };

  const finish = async () => {
    setSaving(true);
    setError(null);

    const lifecycleForSave = toLifecycleForSave(stage, pregnant);
    const moodBaseline = deriveMoodBaseline(emotionalState, symptoms);
    const prefs: HealthPreferences = {
      showMood: true,
      showSleep: shouldTrackSleep(symptoms),
      showWeight: pregnant === "yes" || symptoms.includes("fatigue"),
      showBp: lifecycleForSave === "post-menopause" || lifecycleForSave === "perimenopause" || lifecycleForSave === "pregnant"
    };

    const accountEmail = email.trim().toLowerCase();
    if (!user) {
      const signupResult = await signUp(accountEmail, password);
      if (signupResult.error && !signupResult.error.toLowerCase().includes("already")) {
        setSaving(false);
        setError(signupResult.error);
        return;
      }
      const loginResult = await signIn(accountEmail, password);
      if (loginResult.error) {
        setSaving(false);
        setError(loginResult.error);
        return;
      }
    }

    const activeUser = useAppStore.getState().user;
    if (!activeUser) {
      setSaving(false);
      setError("Could not create your account. Please try again.");
      return;
    }

    const onboardingOutput: OnboardingOutput = {
      name: name.trim(),
      age,
      life_stage: stage,
      last_period: showCycleSteps
        ? `${lastPeriod.year}-${String(lastPeriod.month).padStart(2, "0")}-${String(lastPeriod.day).padStart(2, "0")}`
        : null,
      cycle_length: showCycleSteps && !cycleNotSure ? cycleLength : null,
      period_length: showCycleSteps && !cycleNotSure ? periodLength : null,
      pregnant,
      symptoms,
      support_system: supportSystem,
      has_partner: hasPartner,
      communicated_with_partner: hasPartner === "yes" ? partnerCommunication : null,
      children,
      children_count: children === "yes" ? childrenCount : null,
      communicated_with_children: children === "yes" ? childrenCommunication : null,
      emotional_state: emotionalState.trim()
    };
    const outputKey = `menowise:onboarding:output:${activeUser.id}`;
    await AsyncStorage.setItem(outputKey, JSON.stringify(onboardingOutput));

    const saved = await saveOnboarding({
      fullName: name.trim(),
      birthYear,
      lifecycleStage: lifecycleForSave,
      childrenCount: children === "yes" ? childrenCount : 0,
      cycleLength: showCycleSteps && !cycleNotSure ? cycleLength : undefined,
      periodLength: showCycleSteps && !cycleNotSure ? periodLength : undefined,
      moodBaseline,
      preferences: prefs
    });

    if (saved.error) {
      setSaving(false);
      setError(saved.error);
      return;
    }

    const normalizedSymptoms = symptoms.filter((s) => s !== "other");
    for (const symptom of normalizedSymptoms) {
      await addSymptom(symptom as SymptomTag, 2);
    }

    updateDashboardSections({
      showMoodTrend: true,
      showWellbeing: true,
      showSymptoms: normalizedSymptoms.length > 0,
      showSnapshot: prefs.showBp || prefs.showWeight || prefs.showSleep || prefs.showMood
    });

    await AsyncStorage.removeItem(draftKey);
    await AsyncStorage.removeItem(`menowise:onboarding:draft:${activeUser.id}`);
    setSaving(false);
    router.replace("/(tabs)/home" as any);
  };

  if (!loadedDraft) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.glowOne} />
          <View style={styles.glowTwo} />

          {currentStep !== "welcome" && currentStep !== "complete" ? (
            <View style={styles.progressWrap}>
              <Text style={styles.progressText}>
                {formatNumber(journeyPosition, i18n.language)}/{formatNumber(journeySteps.length, i18n.language)}
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
            </View>
          ) : null}

          <Animated.View style={[styles.content, { opacity: animOpacity, transform: [{ translateY: animY }] }]}>
            <AppCard style={styles.card}>
              {currentStep === "welcome" ? (
                <View style={styles.stepWrap}>
                  <Image source={require("../assets/icon.png")} style={styles.welcomeLogo} resizeMode="contain" />
                  <Text style={styles.title}>Your compassionate all-in-one guide through menopause and beyond</Text>
                  <AppButton label="Get Started" onPress={next} />
                  <AppButton label="Log In" variant="secondary" onPress={() => router.replace("/login" as any)} />
                </View>
              ) : null}

              {currentStep === "account" ? (
                <View style={styles.stepWrap}>
                  <Text style={styles.title}>Create your account</Text>
                  <Text style={styles.subtitle}>Use your email to get your personalized dashboard.</Text>
                  <InputField label="Email" value={email} onChangeText={setEmail} placeholder="you@email.com" />
                  <InputField label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />
                  <InputField
                    label="Confirm password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    placeholder="••••••••"
                  />
                </View>
              ) : null}

              {currentStep === "name" ? (
                <View style={styles.stepWrap}>
                  <Text style={styles.title}>What would you like us to call you?</Text>
                  <Text style={styles.subtitle}>We’ll personalize your experience</Text>
                  <InputField label="Name" value={name} onChangeText={setName} placeholder="Your name" />
                </View>
              ) : null}

              {currentStep === "birth-year" ? (
                <View style={styles.stepWrap}>
                  <Text style={styles.title}>What year were you born?</Text>
                  <Text style={styles.subtitle}>We’ll use this to tailor insights and care recommendations.</Text>
                  <View style={styles.wheelWrap}>
                    <View pointerEvents="none" style={styles.selectorOverlay} />
                    <FlatList
                      ref={listRef}
                      data={years}
                      keyExtractor={(item) => String(item)}
                      getItemLayout={(_, index) => ({ length: itemHeight, offset: itemHeight * index, index })}
                      initialScrollIndex={24}
                      snapToInterval={itemHeight}
                      decelerationRate="fast"
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.wheelContent}
                      onMomentumScrollEnd={(e) => onYearMomentumEnd(e.nativeEvent.contentOffset.y)}
                      renderItem={({ item }: ListRenderItemInfo<number>) => (
                        <View style={styles.yearRow}>
                          <Text style={[styles.yearText, item === birthYear && styles.yearTextActive]}>
                            {formatNumber(item, i18n.language)}
                          </Text>
                        </View>
                      )}
                      style={{ maxHeight: wheelHeight }}
                    />
                  </View>
                  <Text style={styles.helperText}>Age {formatNumber(age, i18n.language)}</Text>
                </View>
              ) : null}

              {currentStep === "life-stage" ? (
                <View style={styles.stepWrap}>
                  <Text style={styles.title}>Where are you in your journey?</Text>
                  <Text style={styles.subtitle}>This helps us show only what’s relevant to you.</Text>
                  <View style={styles.optionList}>
                    {[
                      { key: "pre-menopause" as JourneyStage, label: "Pre-menopause" },
                      { key: "perimenopause" as JourneyStage, label: "Perimenopause" },
                      { key: "post-menopause" as JourneyStage, label: "Post-menopause" },
                      { key: "not-sure" as JourneyStage, label: "Not sure" }
                    ].map((option) => (
                      <Pressable
                        key={option.key}
                        style={[styles.optionCard, stage === option.key && styles.optionCardActive]}
                        onPress={() => {
                          selectionFeedback();
                          setStage(option.key);
                        }}
                      >
                        <Text style={[styles.optionLabel, stage === option.key && styles.optionLabelActive]}>{option.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}

              {currentStep === "last-period" ? (
                <View style={styles.stepWrap}>
                  <Text style={styles.title}>When was your last period?</Text>
                  <Text style={styles.subtitle}>Approximate is okay.</Text>
                  <Text style={styles.smallLabel}>Month</Text>
                  <View style={styles.optionListRow}>
                    {months.map((m) => (
                      <Pressable key={`m-${m}`} style={[styles.chip, lastPeriod.month === m && styles.chipActive]} onPress={() => setLastPeriod((p) => ({ ...p, month: m }))}>
                        <Text style={[styles.chipText, lastPeriod.month === m && styles.chipTextActive]}>{formatNumber(m, i18n.language)}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={styles.smallLabel}>Day / Year</Text>
                  <View style={styles.row}>
                    <View style={styles.half}>
                      <FlatList
                        data={monthDays}
                        keyExtractor={(item) => `d-${item}`}
                        style={styles.smallWheel}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                          <Pressable style={[styles.smallRow, lastPeriod.day === item && styles.smallRowActive]} onPress={() => setLastPeriod((p) => ({ ...p, day: item }))}>
                            <Text style={[styles.smallRowText, lastPeriod.day === item && styles.smallRowTextActive]}>{formatNumber(item, i18n.language)}</Text>
                          </Pressable>
                        )}
                      />
                    </View>
                    <View style={styles.half}>
                      <FlatList
                        data={years}
                        keyExtractor={(item) => `y-${item}`}
                        style={styles.smallWheel}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                          <Pressable style={[styles.smallRow, lastPeriod.year === item && styles.smallRowActive]} onPress={() => setLastPeriod((p) => ({ ...p, year: item }))}>
                            <Text style={[styles.smallRowText, lastPeriod.year === item && styles.smallRowTextActive]}>{formatNumber(item, i18n.language)}</Text>
                          </Pressable>
                        )}
                      />
                    </View>
                  </View>
                </View>
              ) : null}

              {currentStep === "cycle-info" ? (
                <View style={styles.stepWrap}>
                  <Text style={styles.title}>Tell us about your cycle</Text>
                  <Text style={styles.subtitle}>You can skip precise values if you’re not sure.</Text>
                  <Pressable style={[styles.optionCard, cycleNotSure && styles.optionCardActive]} onPress={() => setCycleNotSure((v) => !v)}>
                    <Text style={[styles.optionLabel, cycleNotSure && styles.optionLabelActive]}>Not sure</Text>
                  </Pressable>
                  <View style={styles.stepperRow}>
                    <Text style={styles.stepperLabel}>Average cycle length</Text>
                    <View style={styles.stepper}>
                      <Pressable disabled={cycleNotSure} style={styles.stepBtn} onPress={() => setCycleLength((v) => Math.max(18, v - 1))}>
                        <Text style={styles.stepBtnText}>-</Text>
                      </Pressable>
                      <Text style={styles.stepValue}>{formatNumber(cycleLength, i18n.language)}</Text>
                      <Pressable disabled={cycleNotSure} style={styles.stepBtn} onPress={() => setCycleLength((v) => Math.min(40, v + 1))}>
                        <Text style={styles.stepBtnText}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                  <View style={styles.stepperRow}>
                    <Text style={styles.stepperLabel}>Period length</Text>
                    <View style={styles.stepper}>
                      <Pressable disabled={cycleNotSure} style={styles.stepBtn} onPress={() => setPeriodLength((v) => Math.max(2, v - 1))}>
                        <Text style={styles.stepBtnText}>-</Text>
                      </Pressable>
                      <Text style={styles.stepValue}>{formatNumber(periodLength, i18n.language)}</Text>
                      <Pressable disabled={cycleNotSure} style={styles.stepBtn} onPress={() => setPeriodLength((v) => Math.min(10, v + 1))}>
                        <Text style={styles.stepBtnText}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ) : null}

              {currentStep === "pregnancy" ? (
                <View style={styles.stepWrap}>
                  <Text style={styles.title}>Are you currently pregnant?</Text>
                  <View style={styles.optionList}>
                    {[
                      { key: "yes" as PregnancyStatus, label: "Yes" },
                      { key: "no" as PregnancyStatus, label: "No" },
                      { key: "not-sure" as PregnancyStatus, label: "Not sure" }
                    ].map((option) => (
                      <Pressable key={option.key} style={[styles.optionCard, pregnant === option.key && styles.optionCardActive]} onPress={() => setPregnant(option.key)}>
                        <Text style={[styles.optionLabel, pregnant === option.key && styles.optionLabelActive]}>{option.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                  {pregnant === "yes" ? <Text style={styles.helperText}>We’ll switch your dashboard to pregnancy support mode.</Text> : null}
                </View>
              ) : null}

              {currentStep === "symptoms" ? (
                <View style={styles.stepWrap}>
                  <Text style={styles.title}>What have you been experiencing lately?</Text>
                  <Text style={styles.subtitle}>Select all that apply.</Text>
                  {(["Physical", "Emotional", "Sleep"] as const).map((category) => (
                    <View key={category} style={styles.symptomGroup}>
                      <Text style={styles.smallLabel}>{category}</Text>
                      <View style={styles.symptomGrid}>
                        {symptomOptions
                          .filter((item) => item.category === category)
                          .map((item) => {
                            const active = symptoms.includes(item.key);
                            return (
                              <Pressable
                                key={item.key}
                                style={[styles.symptomCard, active && styles.symptomCardActive]}
                                onPress={() =>
                                  setSymptoms((prev) =>
                                    prev.includes(item.key) ? prev.filter((it) => it !== item.key) : [...prev, item.key]
                                  )
                                }
                              >
                                <Ionicons name={item.icon} size={18} color={active ? "#FFFFFF" : colors.primaryDark} />
                                <Text style={[styles.symptomLabel, active && styles.symptomLabelActive]}>{item.key.replace(/-/g, " ")}</Text>
                              </Pressable>
                            );
                          })}
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              {currentStep === "support-children" ? (
                <View style={styles.stepWrap}>
                  <Text style={styles.title}>Do you have a support system?</Text>
                  <View style={styles.optionList}>
                    {[
                      { key: "strong" as SupportSystem, label: "Yes, strong support" },
                      { key: "some" as SupportSystem, label: "Some support" },
                      { key: "none" as SupportSystem, label: "Not really" },
                      { key: "prefer-not" as SupportSystem, label: "Prefer not to say" }
                    ].map((option) => (
                      <Pressable key={option.key} style={[styles.optionCard, supportSystem === option.key && styles.optionCardActive]} onPress={() => setSupportSystem(option.key)}>
                        <Text style={[styles.optionLabel, supportSystem === option.key && styles.optionLabelActive]}>{option.label}</Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={[styles.title, { fontSize: 20, marginTop: spacing.md }]}>Do you have a partner?</Text>
                  <View style={styles.optionListRow}>
                    {[
                      { key: "yes" as PartnerChoice, label: "Yes" },
                      { key: "no" as PartnerChoice, label: "No" },
                      { key: "prefer-not" as PartnerChoice, label: "Prefer not to say" }
                    ].map((option) => (
                      <Pressable key={option.key} style={[styles.chip, hasPartner === option.key && styles.chipActive]} onPress={() => setHasPartner(option.key)}>
                        <Text style={[styles.chipText, hasPartner === option.key && styles.chipTextActive]}>{option.label}</Text>
                      </Pressable>
                    ))}
                  </View>

                  {hasPartner === "yes" ? (
                    <>
                      <Text style={[styles.title, { fontSize: 18, marginTop: spacing.sm }]}>Have you communicated with your partner?</Text>
                      <View style={styles.optionListRow}>
                        {[
                          { key: "yes" as CommunicationChoice, label: "Yes" },
                          { key: "no" as CommunicationChoice, label: "No" },
                          { key: "prefer-not" as CommunicationChoice, label: "Prefer not to say" }
                        ].map((option) => (
                          <Pressable
                            key={option.key}
                            style={[styles.chip, partnerCommunication === option.key && styles.chipActive]}
                            onPress={() => setPartnerCommunication(option.key)}
                          >
                            <Text style={[styles.chipText, partnerCommunication === option.key && styles.chipTextActive]}>{option.label}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </>
                  ) : null}

                  <Text style={[styles.title, { fontSize: 20, marginTop: spacing.md }]}>Do you have children?</Text>
                  <View style={styles.optionListRow}>
                    {[
                      { key: "yes" as ChildrenChoice, label: "Yes" },
                      { key: "no" as ChildrenChoice, label: "No" },
                      { key: "prefer-not" as ChildrenChoice, label: "Prefer not to say" }
                    ].map((option) => (
                      <Pressable key={option.key} style={[styles.chip, children === option.key && styles.chipActive]} onPress={() => setChildren(option.key)}>
                        <Text style={[styles.chipText, children === option.key && styles.chipTextActive]}>{option.label}</Text>
                      </Pressable>
                    ))}
                  </View>

                  {children === "yes" ? (
                    <>
                      <View style={styles.stepperRow}>
                        <Text style={styles.stepperLabel}>How many children?</Text>
                        <View style={styles.stepper}>
                          <Pressable style={styles.stepBtn} onPress={() => setChildrenCount((v) => Math.max(1, v - 1))}>
                            <Text style={styles.stepBtnText}>-</Text>
                          </Pressable>
                          <Text style={styles.stepValue}>{formatNumber(childrenCount, i18n.language)}</Text>
                          <Pressable style={styles.stepBtn} onPress={() => setChildrenCount((v) => Math.min(12, v + 1))}>
                            <Text style={styles.stepBtnText}>+</Text>
                          </Pressable>
                        </View>
                      </View>

                      <Text style={[styles.title, { fontSize: 18, marginTop: spacing.sm }]}>Have you communicated with your children?</Text>
                      <View style={styles.optionListRow}>
                        {[
                          { key: "yes" as CommunicationChoice, label: "Yes" },
                          { key: "no" as CommunicationChoice, label: "No" },
                          { key: "prefer-not" as CommunicationChoice, label: "Prefer not to say" }
                        ].map((option) => (
                          <Pressable
                            key={option.key}
                            style={[styles.chip, childrenCommunication === option.key && styles.chipActive]}
                            onPress={() => setChildrenCommunication(option.key)}
                          >
                            <Text style={[styles.chipText, childrenCommunication === option.key && styles.chipTextActive]}>{option.label}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </>
                  ) : null}
                </View>
              ) : null}

              {currentStep === "emotional" ? (
                <View style={styles.stepWrap}>
                  <Text style={styles.title}>How have you been feeling lately?</Text>
                  <Text style={styles.subtitle}>Share as much or as little as you’d like…</Text>
                  <InputField label="Emotional check-in" value={emotionalState} onChangeText={setEmotionalState} multiline placeholder="Share as much or as little as you’d like…" />
                </View>
              ) : null}

              {currentStep === "complete" ? (
                <View style={styles.stepWrap}>
                  <Text style={styles.title}>You’re all set, {name.trim() || "there"}!</Text>
                  <Text style={styles.subtitle}>We’re here for every step of your journey.</Text>
                  <AppButton label={saving ? "Saving..." : "Open My Dashboard"} onPress={() => void finish()} />
                </View>
              ) : null}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              {currentStep !== "welcome" && currentStep !== "complete" ? (
                <View style={styles.actions}>
                  <AppButton label="Back" variant="secondary" onPress={back} />
                  <AppButton label="Continue" onPress={next} />
                </View>
              ) : null}
            </AppCard>
          </Animated.View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.md, justifyContent: "center" },
  glowOne: {
    position: "absolute",
    top: -80,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: "#FBD8EA"
  },
  glowTwo: {
    position: "absolute",
    bottom: -60,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 200,
    backgroundColor: "#EEDCFF"
  },
  progressWrap: { marginBottom: spacing.sm },
  progressText: { color: colors.textMuted, fontWeight: "600", marginBottom: 6 },
  progressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 999,
    backgroundColor: "#F2E5EC",
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.primaryDark
  },
  content: { justifyContent: "center", paddingBottom: spacing.md },
  card: { marginVertical: 0 },
  stepWrap: { gap: spacing.sm },
  welcomeLogo: { width: 150, height: 150, alignSelf: "center", marginBottom: spacing.xs },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", letterSpacing: -0.3 },
  subtitle: { color: colors.textMuted, lineHeight: 20, marginBottom: spacing.xs },
  helperText: { color: colors.textMuted, fontSize: 13 },
  optionList: { gap: spacing.xs },
  optionListRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  optionCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFF9FD",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  optionCardActive: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.primaryDark
  },
  optionLabel: { color: colors.text, fontWeight: "600" },
  optionLabelActive: { color: "#FFFFFF" },
  wheelWrap: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFF9FD",
    overflow: "hidden"
  },
  wheelContent: { paddingVertical: (wheelHeight - itemHeight) / 2 },
  selectorOverlay: {
    position: "absolute",
    left: 10,
    right: 10,
    top: wheelHeight / 2 - itemHeight / 2,
    height: itemHeight,
    borderRadius: radius.md,
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: colors.primary,
    zIndex: 0
  },
  yearRow: { height: itemHeight, alignItems: "center", justifyContent: "center" },
  yearText: { color: colors.textMuted, fontSize: 20, fontWeight: "500" },
  yearTextActive: { color: colors.text, fontWeight: "800" },
  row: { flexDirection: "row", gap: spacing.sm },
  half: { flex: 1 },
  smallWheel: {
    maxHeight: 160,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: "#FFF9FD"
  },
  smallRow: { paddingVertical: 10, alignItems: "center" },
  smallRowActive: { backgroundColor: "#FBE1ED" },
  smallRowText: { color: colors.textMuted, fontWeight: "600" },
  smallRowTextActive: { color: colors.primaryDark, fontWeight: "800" },
  smallLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  stepperRow: { gap: spacing.xs },
  stepperLabel: { color: colors.text, fontWeight: "600" },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FBE1ED"
  },
  stepBtnText: { color: colors.primaryDark, fontSize: 18, fontWeight: "700" },
  stepValue: { minWidth: 36, textAlign: "center", color: colors.text, fontWeight: "700" },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFF9FD",
    paddingHorizontal: spacing.sm,
    paddingVertical: 8
  },
  chipActive: { borderColor: colors.primaryDark, backgroundColor: colors.primaryDark },
  chipText: { color: colors.text, fontWeight: "600" },
  chipTextActive: { color: "#FFFFFF" },
  symptomGroup: { gap: spacing.xs },
  symptomGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  symptomCard: {
    width: "48%",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFF9FD",
    padding: spacing.sm,
    gap: 6
  },
  symptomCardActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark
  },
  symptomLabel: {
    textTransform: "capitalize",
    color: colors.text,
    fontWeight: "600"
  },
  symptomLabelActive: { color: "#FFFFFF" },
  actions: { marginTop: spacing.md, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  error: { color: "#B83D5B", marginTop: spacing.sm }
});
