import { Pressable, StyleSheet, Text } from "react-native";
import { colors, radius, spacing } from "@/constants/theme";

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
}

export const AppButton = ({ label, onPress, variant = "primary" }: AppButtonProps) => {
  const isPrimary = variant === "primary";
  return (
    <Pressable onPress={onPress} style={[styles.button, isPrimary ? styles.primary : styles.secondary]}>
      <Text style={[styles.label, isPrimary ? styles.primaryLabel : styles.secondaryLabel]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    marginTop: spacing.xs
  },
  primary: {
    backgroundColor: colors.primary
  },
  secondary: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border
  },
  label: { fontWeight: "600" },
  primaryLabel: { color: "#FFFFFF" },
  secondaryLabel: { color: colors.text }
});
