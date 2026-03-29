import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@/constants/theme";
import { ProfileMenuModal } from "@/components/ProfileMenuModal";
import { selectionFeedback } from "@/utils/feedback";

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export const TopBar = ({ title, subtitle }: TopBarProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <Pressable
          style={styles.menuBtn}
          onPress={() => {
            selectionFeedback();
            setOpen(true);
          }}
        >
          <Ionicons name="menu" size={20} color={colors.text} />
        </Pressable>
      </View>
      <ProfileMenuModal visible={open} onClose={() => setOpen(false)} />
    </>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md
  },
  title: { color: colors.text, fontSize: 28, fontWeight: "800", letterSpacing: -0.3 },
  subtitle: { marginTop: 2, color: colors.textMuted, fontSize: 14 },
  menuBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF9FD"
  }
});
