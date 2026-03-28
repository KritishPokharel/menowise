export type ReproductiveStage =
  | "pre-menopause"
  | "perimenopause"
  | "pregnant"
  | "post-menopause";

export type MoodTag =
  | "stressed"
  | "overwhelmed"
  | "anxious"
  | "calm"
  | "motivated"
  | "sad"
  | "focused";

export type SymptomTag =
  | "headache"
  | "bloating"
  | "fatigue"
  | "cramps"
  | "irritability"
  | "brain-fog"
  | "hot-flashes"
  | "anxiety"
  | "insomnia"
  | "joint-pain"
  | "mood-swings"
  | "night-sweats"
  | "sleep"
  | "vaginal-dryness"
  | "sexual-health"
  | "depression"
  | "bone-health";

export interface Profile {
  id?: string;
  name?: string;
  fullName?: string;
  birthYear?: number;
  age?: number;
  gender?: string;
  stage?: ReproductiveStage;
  lifecycleStage?: ReproductiveStage;
  cycleLength?: number;
  periodLength?: number;
  childrenCount?: number;
  dob?: string;
  heightCm?: number;
  weightKg?: number;
  language?: "en" | "hi" | "ne" | "es";
  feelingLately?: string;
}

export interface HealthMetricEntry {
  id: string;
  type: "bp" | "weight" | "sleep" | "cycle";
  value: string;
  timestamp: string;
}

export interface MoodEntry {
  id: string;
  mood: MoodTag;
  intensity: number;
  note?: string;
  symptoms: SymptomTag[];
  timestamp: string;
}

export interface EmotionInsight {
  explanation: string;
  likelyCause: string;
  response: string;
}

export interface Recommendation {
  actionStep: string;
  groundingExercise: string;
  psychInsight: string;
  learningResource: string;
}

export interface CommunityPost {
  id: string;
  author: string;
  text: string;
  likes: number;
  createdAt: string;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
}
