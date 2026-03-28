import { Pressable, StyleSheet, Text } from "react-native";
import { colors, radius, spacing } from "@/constants/theme";
import { selectionFeedback } from "@/utils/feedback";

interface ChipTagProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export const ChipTag = ({ label, selected = false, onPress }: ChipTagProps) => {
  return (
    <Pressable
      onPress={() => {
        selectionFeedback();
        onPress?.();
      }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFF8FC",
    paddingHorizontal: spacing.sm,
    paddingVertical: 8
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  text: {
    color: colors.text,
    fontWeight: "600",
    textTransform: "capitalize"
  },
  textSelected: {
    color: "#FFFFFF"
  }
});
