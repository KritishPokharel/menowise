import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { TopBar } from "@/components/TopBar";
import { AppCard } from "@/components/ui/AppCard";
import { ChipTag } from "@/components/ui/ChipTag";
import { colors, spacing } from "@/constants/theme";
import { getCachedInsightsArticles, type InsightArticle } from "@/services/insightsPdfService";
import { useAppStore } from "@/store/useAppStore";

const API_BASE = "http://127.0.0.1:8000";

const moodFromScore = (score: number): string => {
  if (score >= 80) return "motivated";
  if (score >= 70) return "calm";
  if (score >= 60) return "okay";
  if (score >= 50) return "stressed";
  return "anxious";
};

export default function InsightsScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const logs = useAppStore((s) => s.healthLogs);
  const symptoms = useAppStore((s) => s.symptoms);
  const profile = useAppStore((s) => s.profile);

  const [articles, setArticles] = useState<InsightArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<InsightArticle | null>(null);

  const fetchArticlesFromApi = useCallback(async () => {
    const latestLog = logs.at(-1);
    const mood = moodFromScore(latestLog?.moodScore ?? 60);

    const topSymptomNames = Object.entries(
      symptoms.slice(0, 20).reduce<Record<string, number>>((acc, s) => {
        acc[s.symptomName] = (acc[s.symptomName] ?? 0) + 1;
        return acc;
      }, {})
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    const answers: Record<string, string> = {
      q1: topSymptomNames.length
        ? `I have been experiencing ${topSymptomNames.join(", ")} lately`
        : "I want to learn about managing menopause symptoms",
      q2: `My current mood is ${mood} and I want to feel better`,
      q3: profile?.lifecycleStage
        ? `I am in the ${profile.lifecycleStage} stage and looking for guidance`
        : "I want tips for overall wellbeing during menopause"
    };

    return fetch(`${API_BASE}/articles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood, language: i18n.language === "ne" ? "ne" : "en", answers })
    });
  }, [logs, symptoms, profile, i18n.language]);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getCachedInsightsArticles(i18n.language);
      setArticles(data);
    } catch (e: any) {
      setArticles([]);
      setError(e.message || "Failed to load articles");
    }

    setLoading(false);
  }, [i18n.language]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const formatContent = (raw: string): string[] => {
    // Split into paragraphs, trim whitespace
    return raw
      .split(/\n{2,}/)
      .map((p) => p.replace(/\n/g, " ").trim())
      .filter((p) => p.length > 0);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TopBar title={t("insights")} subtitle={t("insightsArticlesSubtitle")} />

        {/* Status bar */}
        {loading ? (
          <AppCard style={styles.statusCard}>
            <ActivityIndicator size="small" color={colors.primaryDark} />
            <Text style={styles.statusText}>
              {t("insightsLoading", { defaultValue: "Loading articles..." })}
            </Text>
          </AppCard>
        ) : error ? (
          <AppCard style={styles.statusCard}>
            <View style={[styles.alertIcon, { backgroundColor: "#FFF2E5" }]}>
              <Ionicons name="warning-outline" size={14} color="#C2743E" />
            </View>
            <Text style={styles.statusText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={fetchArticles}>
              <Text style={styles.retryText}>{t("checkinNewEntry", { defaultValue: "Retry" })}</Text>
            </Pressable>
          </AppCard>
        ) : articles.length === 0 ? (
          <AppCard style={styles.statusCard}>
            <Text style={styles.statusText}>
              {t("insightsEmptyState", {
                defaultValue: "No articles available right now."
              })}
            </Text>
          </AppCard>
        ) : null}

        {/* Article list */}
        {articles.map((article) => (
          <AppCard key={article.id} style={styles.articleCard}>
            <Text style={styles.title}>{article.title}</Text>
            <Text style={styles.summary}>{article.summary}</Text>
            {article.tags?.length ? (
              <View style={styles.tagRow}>
                {article.tags.slice(0, 4).map((tag) => (
                  <ChipTag key={tag} label={tag} />
                ))}
              </View>
            ) : null}
            <Pressable style={styles.readBtn} onPress={() => setSelectedArticle(article)}>
              <Text style={styles.readBtnText}>{t("insightsReadMore", { defaultValue: "Read article" })}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primaryDark} />
            </Pressable>
          </AppCard>
        ))}
      </ScrollView>

      {/* Full article modal */}
      <Modal
        visible={!!selectedArticle}
        animationType="slide"
        onRequestClose={() => setSelectedArticle(null)}
      >
        <SafeAreaView style={styles.modalSafe} edges={["top"]}>
          <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, spacing.sm) + 6 }]}>
            <Pressable
              style={styles.backBtn}
              onPress={() => setSelectedArticle(null)}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={12}
            >
              <Ionicons name="arrow-back" size={22} color={colors.text} />
              <Text style={styles.backBtnText}>{t("back", { defaultValue: "Back" })}</Text>
            </Pressable>
            <Text style={styles.modalHeaderTitle} numberOfLines={1}>
              {t("insights")}
            </Text>
            <View style={styles.modalSpacer} />
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalContent}>
            <Text style={styles.articleTitle}>{selectedArticle?.title}</Text>

            {selectedArticle?.tags?.length ? (
              <View style={styles.tagRow}>
                {selectedArticle.tags.slice(0, 5).map((tag) => (
                  <ChipTag key={tag} label={tag} />
                ))}
              </View>
            ) : null}

            <View style={styles.divider} />

            {selectedArticle
              ? formatContent(selectedArticle.content).map((para, idx) => {
                  // Detect headings (lines that are short and end without period)
                  const isHeading = para.length < 80 && !para.endsWith(".") && !para.endsWith("?");
                  return isHeading ? (
                    <Text key={idx} style={styles.contentHeading}>
                      {para}
                    </Text>
                  ) : (
                    <Text key={idx} style={styles.contentPara}>
                      {para}
                    </Text>
                  );
                })
              : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.md, paddingBottom: 100, gap: spacing.sm },

  // Status
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFAFD",
    borderWidth: 1,
    borderColor: "#F0DFE8"
  },
  statusText: { flex: 1, color: colors.textMuted, lineHeight: 19 },
  alertIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  retryBtn: {
    borderWidth: 1,
    borderColor: colors.primaryDark,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  retryText: { color: colors.primaryDark, fontWeight: "700", fontSize: 12 },

  // Article cards
  articleCard: {
    borderWidth: 1,
    borderColor: "#F0DFE8",
    backgroundColor: "#FFFFFF"
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 23
  },
  summary: {
    color: colors.textMuted,
    marginTop: 8,
    lineHeight: 21
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10
  },
  readBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  readBtnText: {
    color: colors.primaryDark,
    fontWeight: "700"
  },

  // Full article modal
  modalSafe: { flex: 1, backgroundColor: colors.bg },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  backBtn: {
    minWidth: 88,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: "#FFF9FD",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10
  },
  backBtnText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600"
  },
  modalHeaderTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    textAlign: "center"
  },
  modalSpacer: { width: 72 },
  modalBody: { flex: 1 },
  modalContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: 60
  },
  articleTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 30
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md
  },
  contentHeading: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    lineHeight: 24
  },
  contentPara: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 24,
    marginBottom: spacing.sm
  }
});
