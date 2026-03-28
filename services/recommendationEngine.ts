import type { MoodEntry, Recommendation, ReproductiveStage } from "@/types";

const resourcesByMood = {
  stressed: "Try a short 4-7-8 breathing guide video.",
  overwhelmed: "Watch a 5-minute task triage method walkthrough.",
  anxious: "Use a CBT thought-labeling micro lesson.",
  calm: "Try a mindful productivity planning clip.",
  motivated: "Watch a habit-stacking strategy short.",
  sad: "Listen to a self-compassion guided audio.",
  focused: "Use a deep-work rhythm explainer."
};

export const buildRecommendation = (
  moodEntry: MoodEntry,
  stage?: ReproductiveStage
): Recommendation => {
  const stageHint =
    stage
      ? `Given your ${stage.replace("-", " ")} context, pace gently.`
      : "Keep the next step intentionally small.";

  return {
    actionStep: `Next step: spend 12 minutes on one concrete task linked to today's priority.`,
    groundingExercise:
      moodEntry.mood === "anxious" || moodEntry.mood === "overwhelmed"
        ? "Grounding: 3-3-3 reset (3 breaths, 3 things you see, 3 body sensations)."
        : "Grounding: 90-second body scan and unclench shoulders/jaw.",
    psychInsight: `${stageHint} Emotions tend to soften when action is specific and finite.`,
    learningResource: resourcesByMood[moodEntry.mood]
  };
};
