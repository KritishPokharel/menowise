import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/AppButton";
import { InputField } from "@/components/InputField";
import { PillPicker } from "@/components/PillPicker";
import { AppCard } from "@/components/ui/AppCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { colors, spacing } from "@/constants/theme";
import { useAppStore } from "@/store/useAppStore";

export default function HealthPreferencesScreen() {
  const { t } = useTranslation();
  const prefs = useAppStore((s) => s.preferences);
  const updatePreferences = useAppStore((s) => s.updatePreferences);
  const addHealthLog = useAppStore((s) => s.addHealthLog);
  const [metricType, setMetricType] = useState<"bp" | "weight" | "sleep" | "mood">("bp");
  const [metricValue, setMetricValue] = useState("");

  const trMetric = (key: "bp" | "weight" | "sleep" | "mood") => {
    const v = t(`metrics.${key}`);
    return v === `metrics.${key}` ? key.toUpperCase() : v;
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
          <SectionHeader title={t("healthPreferences")} subtitle={t("chooseDashboardCards")} />
          <AppButton
            label={`${prefs.showBp ? "✓ " : ""}${trMetric("bp")}`}
            variant="secondary"
            onPress={() => void updatePreferences({ showBp: !prefs.showBp })}
          />
          <AppButton
            label={`${prefs.showWeight ? "✓ " : ""}${trMetric("weight")}`}
            variant="secondary"
            onPress={() => void updatePreferences({ showWeight: !prefs.showWeight })}
          />
          <AppButton
            label={`${prefs.showSleep ? "✓ " : ""}${trMetric("sleep")}`}
            variant="secondary"
            onPress={() => void updatePreferences({ showSleep: !prefs.showSleep })}
          />
          <AppButton
            label={`${prefs.showMood ? "✓ " : ""}${trMetric("mood")}`}
            variant="secondary"
            onPress={() => void updatePreferences({ showMood: !prefs.showMood })}
          />
        </AppCard>

        <AppCard>
          <SectionHeader title={t("addHealthLog")} />
          <PillPicker
            options={(["bp", "weight", "sleep", "mood"] as const).map((k) => trMetric(k))}
            value={trMetric(metricType)}
            onChange={(label: string | number) => {
              if (typeof label !== "string") return;
              const map: Record<string, "bp" | "weight" | "sleep" | "mood"> = {
                [trMetric("bp")]: "bp",
                [trMetric("weight")]: "weight",
                [trMetric("sleep")]: "sleep",
                [trMetric("mood")]: "mood"
              };
              if (map[label]) setMetricType(map[label]);
            }}
          />
          <InputField label={t("valueLabel")} value={metricValue} onChangeText={setMetricValue} placeholder={t("valuePlaceholder")} />
          <AppButton
            label={t("save")}
            onPress={async () => {
              if (!metricValue.trim()) return;
              const date = new Date().toISOString().slice(0, 10);
              if (metricType === "bp") {
                const [sys, dia] = metricValue.split("/").map((x) => Number(x.trim()));
                await addHealthLog({ date, bpSystolic: sys, bpDiastolic: dia });
              }
              if (metricType === "weight") await addHealthLog({ date, weight: Number(metricValue) });
              if (metricType === "sleep") await addHealthLog({ date, sleepHours: Number(metricValue) });
              if (metricType === "mood") await addHealthLog({ date, moodScore: Number(metricValue) });
              setMetricValue("");
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
