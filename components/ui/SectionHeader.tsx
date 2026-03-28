import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/constants/theme";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onPressAction?: () => void;
}

export const SectionHeader = ({ title, subtitle, actionLabel, onPressAction }: SectionHeaderProps) => {
  return (
    <View style={styles.wrap}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onPressAction ? (
        <Pressable onPress={onPressAction}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm, gap: spacing.sm },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  subtitle: { marginTop: 2, color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  action: { color: colors.primaryDark, fontWeight: "600" }
});
