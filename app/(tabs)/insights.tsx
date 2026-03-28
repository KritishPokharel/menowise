import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { TopBar } from "@/components/TopBar";
import { AppCard } from "@/components/ui/AppCard";
import { ChipTag } from "@/components/ui/ChipTag";
import { colors, spacing } from "@/constants/theme";

type DemoArticle = {
  id: string;
  category: string;
  title: string;
  summary: string;
  readTime: string;
};

export default function InsightsScreen() {
  const { t } = useTranslation();

  const demoArticles = useMemo<DemoArticle[]>(
    () => [
      {
        id: "a1",
        category: t("articlesCatMenopause"),
        title: t("articlesTitleMenopause"),
        summary: t("articlesSummaryMenopause"),
        readTime: t("articlesRead5")
      },
      {
        id: "a2",
        category: t("articlesCatMood"),
        title: t("articlesTitleMood"),
        summary: t("articlesSummaryMood"),
        readTime: t("articlesRead4")
      },
      {
        id: "a3",
        category: t("articlesCatSleep"),
        title: t("articlesTitleSleep"),
        summary: t("articlesSummarySleep"),
        readTime: t("articlesRead6")
      }
    ],
    [t]
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TopBar title={t("insights")} subtitle={t("insightsArticlesSubtitle")} />

        <AppCard style={styles.infoCard}>
          <Text style={styles.infoTitle}>{t("insightsArticlesTitle")}</Text>
          <Text style={styles.infoText}>{t("insightsArticlesDesc")}</Text>
          <View style={styles.infoTags}>
            <ChipTag label={t("insightsApiReady")} />
            <ChipTag label="Supabase" />
          </View>
        </AppCard>

        {demoArticles.map((article) => (
          <AppCard key={article.id} style={styles.articleCard}>
            <View style={styles.articleTop}>
              <Text style={styles.category}>{article.category}</Text>
              <Text style={styles.meta}>{article.readTime}</Text>
            </View>
            <Text style={styles.title}>{article.title}</Text>
            <Text style={styles.summary}>{article.summary}</Text>
            <Text style={styles.link}>{t("insightsReadMore")}</Text>
          </AppCard>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.md, paddingBottom: 100, gap: spacing.sm },
  infoCard: {
    borderWidth: 1,
    borderColor: "#F0DFE8",
    backgroundColor: "#FFFAFD"
  },
  infoTitle: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 16
  },
  infoText: {
    color: colors.textMuted,
    marginTop: 6,
    lineHeight: 20
  },
  infoTags: { marginTop: 10, flexDirection: "row", gap: 8, flexWrap: "wrap" },
  articleCard: {
    borderWidth: 1,
    borderColor: "#F0DFE8",
    backgroundColor: "#FFFFFF"
  },
  articleTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  category: {
    color: colors.primaryDark,
    fontWeight: "700",
    fontSize: 12
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600"
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24
  },
  summary: {
    color: colors.textMuted,
    marginTop: 8,
    lineHeight: 21
  },
  link: {
    marginTop: 12,
    color: colors.primaryDark,
    fontWeight: "700"
  }
});
