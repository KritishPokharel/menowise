import { Platform, Vibration } from "react-native";

export const selectionFeedback = () => {
  // iOS Simulator often logs CoreHaptics errors; keep feedback no-op there.
  if (Platform.OS === "ios") return;
  Vibration.vibrate(12);
};
