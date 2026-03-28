import type { EmotionInsight, MoodTag, ReproductiveStage } from "@/types";

const moodMap: Record<MoodTag, EmotionInsight> = {
  stressed: {
    explanation: "Your stress response may be in overdrive from multiple cognitive demands.",
    likelyCause: "Task overload and low recovery windows.",
    response: "Shrink your next task to 10 minutes and complete only that."
  },
  overwhelmed: {
    explanation: "Overwhelm can happen when demands exceed perceived control.",
    likelyCause: "Too many decisions and unfinished loops.",
    response: "List everything on your mind, then circle one non-negotiable priority."
  },
  anxious: {
    explanation: "Anxiety often points to uncertainty or threat anticipation.",
    likelyCause: "Fear of outcomes or social pressure.",
    response: "Name what is in your control today and act on one item."
  },
  calm: {
    explanation: "Calm suggests good regulation and aligned pacing.",
    likelyCause: "Balanced energy and manageable workload.",
    response: "Use this stable window for a meaningful deep-work session."
  },
  motivated: {
    explanation: "Motivation rises when effort feels connected to purpose.",
    likelyCause: "Clear goals and progress visibility.",
    response: "Lock one strategic goal and protect focus time for it."
  },
  sad: {
    explanation: "Sadness can signal emotional processing and unmet needs.",
    likelyCause: "Loss, disconnection, or depletion.",
    response: "Choose a gentle action: reach out, rest, or journal for 5 minutes."
  },
  focused: {
    explanation: "Focus reflects reduced cognitive noise and strong intent.",
    likelyCause: "Good context setup and intentional planning.",
    response: "Continue with single-tasking and scheduled breaks."
  }
};

const stageNote: Record<ReproductiveStage, string> = {
  "pre-menopause": "cycle-related hormone shifts may influence mood patterns.",
  perimenopause: "perimenopause transitions can increase emotional variability.",
  pregnant: "pregnancy-related body changes can affect emotional regulation.",
  "post-menopause": "post-menopause changes can affect energy and cognitive steadiness."
};

export const buildEmotionInsight = (mood: MoodTag, stage?: ReproductiveStage): EmotionInsight => {
  const base = moodMap[mood];
  if (!stage) return base;
  return {
    ...base,
    likelyCause: `${base.likelyCause} Also, ${stageNote[stage]}`
  };
};
