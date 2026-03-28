import { buildEmotionInsight } from "@/services/emotionEngine";
import { buildRecommendation } from "@/services/recommendationEngine";
import type { AssistantMessage, MoodEntry, Profile } from "@/types";

const parseMoodFromText = (text: string): MoodEntry["mood"] => {
  const v = text.toLowerCase();
  if (v.includes("anx")) return "anxious";
  if (v.includes("stress")) return "stressed";
  if (v.includes("overwhelm")) return "overwhelmed";
  if (v.includes("sad")) return "sad";
  if (v.includes("focus")) return "focused";
  if (v.includes("motiv")) return "motivated";
  return "calm";
};

export const mockAssistantReply = (
  userText: string,
  profile: Profile,
  latestMood?: MoodEntry
): AssistantMessage => {
  const inferredMood = latestMood?.mood ?? parseMoodFromText(userText);
  const moodForEngine: MoodEntry =
    latestMood ??
    ({
      id: "synthetic",
      mood: inferredMood,
      intensity: 6,
      timestamp: new Date().toISOString(),
      symptoms: []
    } as MoodEntry);

  const insight = buildEmotionInsight(moodForEngine.mood, profile.stage);
  const reco = buildRecommendation(moodForEngine, profile.stage);

  const text = [
    `I hear you. Based on your current state, ${insight.explanation}`,
    `Likely driver: ${insight.likelyCause}`,
    `Try now: ${reco.actionStep}`,
    `${reco.groundingExercise}`
  ].join("\n\n");

  return {
    id: `a-${Date.now()}`,
    role: "assistant",
    text,
    createdAt: new Date().toISOString()
  };
};
