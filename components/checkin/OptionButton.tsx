import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@/constants/theme";

interface OptionButtonProps {
  label: string;
  emoji?: string;
  selected?: boolean;
  onPress: () => void;
}

export const OptionButton = ({ label, emoji, selected = false, onPress }: OptionButtonProps) => {
  return (
    <Pressable onPress={onPress} style={[styles.wrap, selected && styles.wrapSelected]}>
      <View style={styles.row}>
        {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
        <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
      </View>
      {selected ? <View style={styles.dot} /> : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFF9FD",
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    minHeight: 68,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  wrapSelected: {
    borderColor: colors.primaryDark,
    backgroundColor: "#FDE7F1",
    shadowOpacity: 0.1
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  emoji: {
    fontSize: 22
  },
  label: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    flex: 1
  },
  labelSelected: {
    color: colors.primaryDark
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.primaryDark,
    position: "absolute",
    top: 10,
    right: 10
  }
});
