import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { colors, spacing } from "@/constants/theme";
import { useAppStore } from "@/store/useAppStore";

export default function SettingsScreen() {
  const { t } = useTranslation();
  const signOut = useAppStore((s) => s.signOut);

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
          <SectionHeader title={t("settings")} subtitle={t("settingsSubtitle")} />
          <AppButton label={t("language")} variant="secondary" onPress={() => router.push("/language" as any)} />
          <AppButton
            label={t("logout")}
            variant="secondary"
            onPress={async () => {
              await signOut();
              router.replace("/" as any);
            }}
          />
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
  backText: { color: colors.text, fontWeight: "600" }
});
