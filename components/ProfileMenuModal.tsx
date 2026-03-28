import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@/constants/theme";
import { useAppStore } from "@/store/useAppStore";

interface ProfileMenuModalProps {
  visible: boolean;
  onClose: () => void;
}

const items = [
  { labelKey: "profile", route: "/profile", icon: "person-outline" },
  { labelKey: "settings", route: "/settings", icon: "settings-outline" },
  { labelKey: "language", route: "/language", icon: "language-outline" }
] as const;

export const ProfileMenuModal = ({ visible, onClose }: ProfileMenuModalProps) => {
  const { t } = useTranslation();
  const signOut = useAppStore((s) => s.signOut);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.panel} onPress={() => undefined}>
          {items.map((item) => (
            <Pressable
              key={item.labelKey}
              style={styles.row}
              onPress={() => {
                onClose();
                router.push(item.route as any);
              }}
            >
              <Ionicons name={item.icon} size={18} color={colors.text} />
              <Text style={styles.label}>{t(item.labelKey)}</Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.row, styles.logout]}
            onPress={async () => {
              onClose();
              await signOut();
              router.replace("/" as any);
            }}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.primaryDark} />
            <Text style={styles.logoutText}>{t("logout")}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 84,
    paddingHorizontal: spacing.md
  },
  panel: {
    width: 240,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm
  },
  label: { color: colors.text, fontWeight: "600" },
  logout: { marginTop: 4, backgroundColor: "#FFF6FA" },
  logoutText: { color: colors.primaryDark, fontWeight: "700" }
});
