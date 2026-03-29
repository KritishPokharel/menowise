import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import i18n from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import type { MoodTag, Profile, ReproductiveStage, SymptomTag } from "@/types";

type Language = "en" | "hi" | "ne" | "es";

export interface HealthPreferences {
  showBp: boolean;
  showWeight: boolean;
  showSleep: boolean;
  showMood: boolean;
}

export interface DashboardSections {
  showMoodTrend: boolean;
  showWellbeing: boolean;
  showSnapshot: boolean;
  showSymptoms: boolean;
}

export interface HealthLog {
  id: string;
  date: string;
  bpSystolic?: number | null;
  bpDiastolic?: number | null;
  weight?: number | null;
  sleepHours?: number | null;
  moodScore?: number | null;
}

export interface SymptomLog {
  id: string;
  symptomName: string;
  intensity: number;
  createdAt: string;
}

interface OnboardingPayload {
  fullName: string;
  birthYear: number;
  lifecycleStage: ReproductiveStage;
  childrenCount: number;
  cycleLength?: number;
  periodLength?: number;
  moodBaseline: MoodTag;
  preferences: HealthPreferences;
}

interface AppStore {
  isBootstrapping: boolean;
  isLoading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  preferences: HealthPreferences;
  dashboardSections: DashboardSections;
  healthLogs: HealthLog[];
  symptoms: SymptomLog[];
  language: Language;
  error: string | null;
  initialize: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  saveOnboarding: (payload: OnboardingPayload) => Promise<{ error: string | null }>;
  updatePreferences: (prefs: Partial<HealthPreferences>) => Promise<{ error: string | null }>;
  updateDashboardSections: (patch: Partial<DashboardSections>) => void;
  addHealthLog: (payload: Omit<HealthLog, "id">) => Promise<{ error: string | null }>;
  addSymptom: (name: SymptomTag, intensity: number) => Promise<{ error: string | null }>;
  setLanguage: (lang: Language) => Promise<void>;
  seedDummyData: () => Promise<void>;
}

const defaultPreferences: HealthPreferences = {
  showBp: true,
  showWeight: true,
  showSleep: true,
  showMood: true
};

const defaultDashboardSections: DashboardSections = {
  showMoodTrend: true,
  showWellbeing: true,
  showSnapshot: true,
  showSymptoms: true
};

let authListenerInitialized = false;

export const useAppStore = create<AppStore>((set, get) => ({
  isBootstrapping: true,
  isLoading: false,
  session: null,
  user: null,
  profile: null,
  preferences: defaultPreferences,
  dashboardSections: defaultDashboardSections,
  healthLogs: [],
  symptoms: [],
  language: "en",
  error: null,

  initialize: async () => {
    set({ isBootstrapping: true, isLoading: true, error: null });
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      set({ error: error.message, isBootstrapping: false, isLoading: false });
      return;
    }

    const session = data.session;
    set({ session, user: session?.user ?? null });

    if (!authListenerInitialized) {
      authListenerInitialized = true;
      supabase.auth.onAuthStateChange((_event, currentSession) => {
        set({ session: currentSession, user: currentSession?.user ?? null });
        if (currentSession?.user) {
          void get().refreshUserData();
        } else {
          set({
            profile: null,
            healthLogs: [],
            symptoms: [],
            preferences: defaultPreferences,
            dashboardSections: defaultDashboardSections
          });
        }
      });
    }

    if (session?.user) {
      await get().refreshUserData();
    }

    set({ isBootstrapping: false, isLoading: false });
  },

  refreshUserData: async () => {
    const userId = get().user?.id;
    if (!userId) return;
    set({ isLoading: true, error: null });

    const [{ data: profile, error: profileError }, { data: prefs }, { data: logs }, { data: symptomRows }] =
      await Promise.all([
        supabase.from("users_profile").select("*").eq("id", userId).maybeSingle(),
        supabase.from("health_preferences").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("health_logs").select("*").eq("user_id", userId).order("date", { ascending: true }),
        supabase.from("symptoms").select("*").eq("user_id", userId).order("created_at", { ascending: false })
      ]);

    if (profileError) {
      set({ error: profileError.message, isLoading: false });
      return;
    }

    const language = (profile?.preferred_language as Language | undefined) ?? "en";
    await i18n.changeLanguage(language);

    set({
      profile: profile
        ? {
            id: profile.id,
            fullName: profile.full_name,
            birthYear: profile.birth_year,
            age: profile.age,
            lifecycleStage: profile.lifecycle_stage,
            childrenCount: profile.children_count,
            cycleLength: profile.cycle_length,
            periodLength: profile.period_length,
            feelingLately: profile.mood_baseline,
            language
          }
        : null,
      preferences: prefs
        ? {
            showBp: prefs.show_bp,
            showWeight: prefs.show_weight,
            showSleep: prefs.show_sleep,
            showMood: prefs.show_mood
          }
        : defaultPreferences,
      healthLogs: (logs ?? []).map((l) => ({
        id: l.id,
        date: l.date,
        bpSystolic: l.bp_systolic,
        bpDiastolic: l.bp_diastolic,
        weight: l.weight,
        sleepHours: l.sleep_hours,
        moodScore: l.mood_score
      })),
      symptoms: (symptomRows ?? []).map((s) => ({
        id: s.id,
        symptomName: s.symptom_name,
        intensity: s.intensity,
        createdAt: s.created_at
      })),
      language,
      isLoading: false
    });
  },

  signUp: async (email, password) => {
    set({ isLoading: true, error: null });
    const { error } = await supabase.auth.signUp({ email, password });
    set({ isLoading: false, error: error?.message ?? null });
    return { error: error?.message ?? null };
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ isLoading: false, error: error.message });
      return { error: error.message };
    }
    set({ session: data.session, user: data.user, isLoading: false });
    await get().refreshUserData();
    return { error: null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({
      session: null,
      user: null,
      profile: null,
      preferences: defaultPreferences,
      dashboardSections: defaultDashboardSections,
      healthLogs: [],
      symptoms: []
    });
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error: error?.message ?? null };
  },

  saveOnboarding: async (payload) => {
    const userId = get().user?.id;
    if (!userId) return { error: "Not authenticated" };

    const age = new Date().getFullYear() - payload.birthYear;
    const profilePayload = {
      id: userId,
      full_name: payload.fullName,
      birth_year: payload.birthYear,
      age,
      lifecycle_stage: payload.lifecycleStage,
      children_count: payload.childrenCount,
      cycle_length: payload.cycleLength ?? null,
      period_length: payload.periodLength ?? null,
      mood_baseline: payload.moodBaseline,
      preferred_language: get().language
    };

    const prefPayload = {
      user_id: userId,
      show_bp: payload.preferences.showBp,
      show_weight: payload.preferences.showWeight,
      show_sleep: payload.preferences.showSleep,
      show_mood: payload.preferences.showMood
    };

    const [{ error: profileError }, { error: prefsError }] = await Promise.all([
      supabase.from("users_profile").upsert(profilePayload, { onConflict: "id" }),
      supabase.from("health_preferences").upsert(prefPayload, { onConflict: "user_id" })
    ]);

    if (profileError || prefsError) {
      return { error: profileError?.message ?? prefsError?.message ?? "Failed to save onboarding" };
    }

    await get().refreshUserData();
    return { error: null };
  },

  updatePreferences: async (prefsPatch) => {
    const userId = get().user?.id;
    if (!userId) return { error: "Not authenticated" };
    const next = { ...get().preferences, ...prefsPatch };

    const { error } = await supabase.from("health_preferences").upsert(
      {
        user_id: userId,
        show_bp: next.showBp,
        show_weight: next.showWeight,
        show_sleep: next.showSleep,
        show_mood: next.showMood
      },
      { onConflict: "user_id" }
    );
    if (error) return { error: error.message };
    set({ preferences: next });
    return { error: null };
  },

  updateDashboardSections: (patch) =>
    set((state) => ({
      dashboardSections: {
        ...state.dashboardSections,
        ...patch
      }
    })),

  addHealthLog: async (payload) => {
    const userId = get().user?.id;
    if (!userId) return { error: "Not authenticated" };

    const { error } = await supabase.from("health_logs").insert({
      user_id: userId,
      date: payload.date,
      bp_systolic: payload.bpSystolic ?? null,
      bp_diastolic: payload.bpDiastolic ?? null,
      weight: payload.weight ?? null,
      sleep_hours: payload.sleepHours ?? null,
      mood_score: payload.moodScore ?? null
    });
    if (error) return { error: error.message };
    await get().refreshUserData();
    return { error: null };
  },

  addSymptom: async (name, intensity) => {
    const userId = get().user?.id;
    if (!userId) return { error: "Not authenticated" };
    const { error } = await supabase.from("symptoms").insert({
      user_id: userId,
      symptom_name: name,
      intensity
    });
    if (error) return { error: error.message };
    await get().refreshUserData();
    return { error: null };
  },

  setLanguage: async (lang) => {
    await i18n.changeLanguage(lang);
    set({ language: lang });
    const userId = get().user?.id;
    if (!userId) return;
    await supabase.from("users_profile").upsert(
      {
        id: userId,
        preferred_language: lang
      },
      { onConflict: "id" }
    );
  },

  seedDummyData: async () => {
    const userId = get().user?.id;
    if (!userId) return;

    const existing = get().healthLogs;
    if (existing.length >= 14) return;

    const existingDates = new Set(existing.map((l) => l.date));
    const logs: Array<{
      user_id: string;
      date: string;
      mood_score: number;
      bp_systolic: number;
      bp_diastolic: number;
      weight: number;
      sleep_hours: number;
    }> = [];
    const symptomRows: Array<{
      user_id: string;
      symptom_name: string;
      intensity: number;
    }> = [];
    const now = new Date();

    const symptomPool: SymptomTag[] = [
      "fatigue",
      "hot-flashes",
      "sleep",
      "joint-pain",
      "headache",
      "mood-swings"
    ];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      if (existingDates.has(dateStr)) continue;

      logs.push({
        user_id: userId,
        date: dateStr,
        mood_score: Math.round(50 + Math.random() * 40),
        bp_systolic: Math.round(110 + Math.random() * 20),
        bp_diastolic: Math.round(70 + Math.random() * 15),
        weight: Math.round((58 + Math.random() * 4) * 10) / 10,
        sleep_hours: Math.round((5.5 + Math.random() * 3) * 10) / 10
      });

      const count = 1 + Math.floor(Math.random() * 3);
      const shuffled = [...symptomPool].sort(() => Math.random() - 0.5);
      for (let j = 0; j < count; j++) {
        symptomRows.push({
          user_id: userId,
          symptom_name: shuffled[j],
          intensity: Math.floor(Math.random() * 3)
        });
      }
    }

    if (logs.length > 0) {
      await supabase.from("health_logs").insert(logs);
    }
    if (symptomRows.length > 0) {
      await supabase.from("symptoms").insert(symptomRows);
    }
    if (logs.length > 0 || symptomRows.length > 0) {
      await get().refreshUserData();
    }
  }
}));
