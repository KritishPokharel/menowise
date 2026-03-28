import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@/constants/theme";

interface MetricTileProps {
  label: string;
  value: string;
}

export const MetricTile = ({ label, value }: MetricTileProps) => {
  return (
    <View style={styles.tile}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: "#FFF9FD",
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 88
  },
  label: { color: colors.textMuted, fontSize: 13, marginBottom: 8 },
  value: { color: colors.text, fontSize: 20, fontWeight: "700" }
});
