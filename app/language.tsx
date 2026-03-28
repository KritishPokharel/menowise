import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppCard } from "@/components/ui/AppCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { colors, spacing } from "@/constants/theme";
import { useAppStore } from "@/store/useAppStore";

const langs = [
  { code: "en" as const, key: "english" as const },
  { code: "hi" as const, key: "hindi" as const },
  { code: "ne" as const, key: "nepali" as const },
  { code: "es" as const, key: "spanish" as const }
];

export default function LanguageScreen() {
  const { t } = useTranslation();
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Ionicons name="chevron-back" size={18} color={colors.text} />
            <Text style={styles.backText}>{t("back")}</Text>
          </Pressable>
        </View>
        <AppCard>
          <SectionHeader title={t("language")} subtitle={t("languageSubtitle")} />
          {langs.map((lang) => (
            <Pressable key={lang.code} style={styles.row} onPress={() => void setLanguage(lang.code)}>
              <Text style={styles.label}>{t(lang.key)}</Text>
              <Text style={styles.check}>{language === lang.code ? "✓" : ""}</Text>
            </Pressable>
          ))}
        </AppCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.md, paddingBottom: 44 },
  header: { marginBottom: spacing.sm },
  back: { flexDirection: "row", alignItems: "center", gap: 4 },
  backText: { color: colors.text, fontWeight: "600" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12 },
  label: { color: colors.text, fontWeight: "600" },
  check: { color: colors.primaryDark, fontWeight: "700" }
});
