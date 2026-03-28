import type { MoodEntry } from "@/types";

const moodBase: Record<MoodEntry["mood"], number> = {
  stressed: 48,
  overwhelmed: 42,
  anxious: 45,
  calm: 82,
  motivated: 78,
  sad: 40,
  focused: 75
};

export const moodToScore = (entry: MoodEntry) => {
  const normalizedIntensity = (11 - entry.intensity) * 2;
  return Math.max(15, Math.min(95, moodBase[entry.mood] + normalizedIntensity));
};

export const wellbeingScore = (moods: MoodEntry[], activityBoost = 5) => {
  if (!moods.length) return 60;
  const recent = moods.slice(-14);
  const avg = recent.reduce((sum, m) => sum + moodToScore(m), 0) / recent.length;
  return Math.round(Math.max(10, Math.min(100, avg + activityBoost)));
};
