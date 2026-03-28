import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/AppButton";
import { InputField } from "@/components/InputField";
import { AppCard } from "@/components/ui/AppCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { colors, spacing } from "@/constants/theme";
import { useAppStore } from "@/store/useAppStore";

export default function ProfileScreen() {
  const { t } = useTranslation();
  const profile = useAppStore((s) => s.profile);
  const saveOnboarding = useAppStore((s) => s.saveOnboarding);
  const preferences = useAppStore((s) => s.preferences);
  const [fullName, setFullName] = useState(profile?.fullName ?? "");
  const [birthYear, setBirthYear] = useState(String(profile?.birthYear ?? ""));
  const [childrenCount, setChildrenCount] = useState(String(profile?.childrenCount ?? 0));
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!profile?.lifecycleStage) return;
    const result = await saveOnboarding({
      fullName,
      birthYear: Number(birthYear),
      lifecycleStage: profile.lifecycleStage,
      childrenCount: Number(childrenCount) || 0,
      cycleLength: profile.cycleLength,
      periodLength: profile.periodLength,
      moodBaseline: (profile.feelingLately as any) ?? "calm",
      preferences
    });
    setError(result.error);
  };

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
          <SectionHeader title={t("profile")} subtitle={t("profileSubtitle")} />
          <InputField label={t("fullName")} value={fullName} onChangeText={setFullName} />
          <InputField label={t("birthYearLabel")} value={birthYear} onChangeText={setBirthYear} keyboardType="numeric" />
          <InputField label={t("childrenCountLabel")} value={childrenCount} onChangeText={setChildrenCount} keyboardType="numeric" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AppButton label={t("save")} onPress={save} />
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
  error: { color: "#B83D5B", marginBottom: spacing.sm }
});
