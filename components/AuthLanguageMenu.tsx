import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, radius, spacing } from "@/constants/theme";
import { useAppStore } from "@/store/useAppStore";

const langs = [
  { code: "en" as const, key: "english" as const },
  { code: "hi" as const, key: "hindi" as const },
  { code: "ne" as const, key: "nepali" as const },
  { code: "es" as const, key: "spanish" as const }
];

export const AuthLanguageMenu = () => {
  const { t } = useTranslation();
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const [open, setOpen] = useState(false);

  return (
    <>
      <View style={styles.wrap}>
        <Pressable style={styles.button} onPress={() => setOpen(true)}>
          <Ionicons name="language-outline" size={16} color={colors.primaryDark} />
          <Text style={styles.buttonText}>{t(language === "en" ? "english" : language === "hi" ? "hindi" : language === "ne" ? "nepali" : "spanish")}</Text>
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.menu} onPress={() => undefined}>
            <Text style={styles.title}>{t("language")}</Text>
            {langs.map((lang) => (
              <Pressable
                key={lang.code}
                style={styles.row}
                onPress={() => {
                  void setLanguage(lang.code);
                  setOpen(false);
                }}
              >
                <Text style={styles.rowLabel}>{t(lang.key)}</Text>
                <Text style={styles.check}>{language === lang.code ? "✓" : ""}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    zIndex: 30
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFFFFFEE",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  buttonText: {
    color: colors.primaryDark,
    fontWeight: "700",
    fontSize: 12
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 72,
    paddingRight: spacing.md
  },
  menu: {
    width: 220,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border
  },
  title: {
    color: colors.text,
    fontWeight: "700",
    marginBottom: spacing.xs
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10
  },
  rowLabel: {
    color: colors.text,
    fontWeight: "600"
  },
  check: {
    color: colors.primaryDark,
    fontWeight: "700"
  }
});
