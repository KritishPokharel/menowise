import { INSIGHTS_ARTICLES } from "@/data/insightsArticles";

export interface InsightArticle {
  id: string;
  articleNumber: number;
  language: "english" | "nepali";
  title: string;
  summary: string;
  content: string;
  tags: string[];
  source: string;
}

const normalizeLanguage = (language: string): InsightArticle["language"] => (
  language === "ne" ? "nepali" : "english"
);

const stripArticlePrefix = (title: string) =>
  title
    .replace(/^Article\s+\d+:\s*/i, "")
    .replace(/^लेख\s+[०१२३४५६७८९\d]+:\s*/i, "")
    .trim();

const sanitizePdfText = (value: string) =>
  value
    .replace(/\u200b/g, "")
    .replace(/[●•▪◦◆◇■□▶►]/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const deriveSummary = (article: InsightArticle) => {
  if (article.summary.trim().length > 24) {
    return sanitizePdfText(article.summary.trim());
  }

  const summary = sanitizePdfText(article.content)
    .split(/\n{2,}/)
    .map((item) => item.replace(/\n/g, " ").trim())
    .filter((item) => item.length > 40)
    .slice(0, 2)
    .join(" ");

  return summary || article.summary.trim() || "Menopause guidance from the local PDF article cache.";
};

export const getCachedInsightsArticles = async (language: string): Promise<InsightArticle[]> => {
  const normalizedLanguage = normalizeLanguage(language);

  return INSIGHTS_ARTICLES
    .filter((article) => article.language === normalizedLanguage)
    .map((article) => ({
      ...article,
      title: sanitizePdfText(stripArticlePrefix(article.title)),
      summary: deriveSummary(article),
      content: sanitizePdfText(article.content),
      tags: article.tags.map((tag) => sanitizePdfText(tag)).filter(Boolean)
    }))
    .sort((a, b) => a.articleNumber - b.articleNumber);
};
