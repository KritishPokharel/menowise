import type { MoodEntry } from "@/types";

export interface MoodPattern {
  message: string;
  strength: "low" | "medium" | "high";
}

export const detectPatterns = (moods: MoodEntry[]): MoodPattern[] => {
  if (moods.length < 4) return [{ message: "Add a few more check-ins to unlock patterns.", strength: "low" }];

  const byWeekday: Record<number, number[]> = {};
  moods.forEach((m) => {
    const day = new Date(m.timestamp).getDay();
    if (!byWeekday[day]) byWeekday[day] = [];
    byWeekday[day].push(m.intensity);
  });

  let peakDay = 0;
  let peakAvg = -1;
  Object.entries(byWeekday).forEach(([day, values]) => {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    if (avg > peakAvg) {
      peakAvg = avg;
      peakDay = Number(day);
    }
  });

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const trend =
    moods.slice(-7).reduce((sum, m) => sum + m.intensity, 0) / Math.min(7, moods.length) <
    moods.slice(-21, -7).reduce((sum, m) => sum + m.intensity, 0) / Math.max(1, moods.slice(-21, -7).length)
      ? "You are trending calmer over recent entries."
      : "Stress intensity has risen recently; consider lighter task loads.";

  return [
    {
      message: `You report higher emotional intensity on ${dayNames[peakDay]}.`,
      strength: "medium"
    },
    { message: trend, strength: "high" }
  ];
};
