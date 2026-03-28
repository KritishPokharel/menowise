import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, radius, spacing } from "@/constants/theme";
import { selectionFeedback } from "@/utils/feedback";
import { formatNumber } from "@/utils/formatNumber";

interface PillPickerProps<T extends string | number> {
  options: T[];
  value: T;
  onChange: (value: T) => void;
}

export const PillPicker = <T extends string | number>({ options, value, onChange }: PillPickerProps<T>) => {
  const { i18n } = useTranslation();
  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => {
              selectionFeedback();
              onChange(opt);
            }}
            style={[styles.pill, active && styles.activePill]}
          >
            <Text style={[styles.pillText, active && styles.activePillText]}>
              {typeof opt === "number" ? formatNumber(opt, i18n.language) : String(opt)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: 2
  },
  pill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
    backgroundColor: "#FFF9FD"
  },
  activePill: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  pillText: { color: colors.text, fontSize: 13, textTransform: "capitalize", fontWeight: "600" },
  activePillText: { color: "#FFFFFF", fontWeight: "600" }
});
