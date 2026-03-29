import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const pdfPath = path.join(projectRoot, "docs_file.pdf");
const outputPath = path.join(projectRoot, "data", "insightsArticles.ts");
const nvidiaApiKey = process.env.NVIDIA_API_KEY;
const forceRefresh = process.argv.includes("--force");

const ensureOutputDirectory = () => {
  mkdirSync(path.dirname(outputPath), { recursive: true });
};

const toAsciiSlug = (value) =>
  value
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "article";

const normalizeWhitespace = (value) =>
  value
    .replace(/\f/g, "\n")
    .replace(/\u200b/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const stripArticlePrefix = (title) =>
  title
    .replace(/^Article\s+\d+:\s*/i, "")
    .replace(/^लेख\s+[०१२३४५६७८९\d]+:\s*/i, "")
    .trim();

const joinWrappedTitles = (text) => {
  const englishHeading = /^Article\s+\d+:\s+\S/;
  const nepaliHeading = /^लेख\s+[०१२३४५६७८९\d]+:\s+\S/;
  const lines = text.split("\n");
  const merged = [];

  for (let i = 0; i < lines.length; i += 1) {
    const current = lines[i].trim();
    const next = lines[i + 1]?.trim() ?? "";
    const isHeading = englishHeading.test(current) || nepaliHeading.test(current);
    const canJoin = isHeading && next && !englishHeading.test(next) && !nepaliHeading.test(next);

    if (canJoin && !/[?.!]$/.test(current)) {
      merged.push(`${current} ${next}`);
      i += 1;
      continue;
    }

    merged.push(lines[i]);
  }

  return merged.join("\n");
};

const parseArticleNumber = (rawValue) => {
  const nepaliDigits = {
    "०": "0",
    "१": "1",
    "२": "2",
    "३": "3",
    "४": "4",
    "५": "5",
    "६": "6",
    "७": "7",
    "८": "8",
    "९": "9"
  };

  const normalized = rawValue.replace(/[०-९]/g, (digit) => nepaliDigits[digit] ?? digit);
  return Number.parseInt(normalized, 10);
};

const cleanContent = (value) =>
  normalizeWhitespace(
    value
      .replace(/^Authentic Sources & Links[\s\S]*$/m, "")
      .replace(/^प्रामाणिक स्रोत[\s\S]*$/m, "")
      .replace(/\[Image:[^\]]+\]/g, "")
  );

const fallbackSummary = (content) => {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((item) => item.replace(/\n/g, " ").trim())
    .filter((item) => item.length > 40);

  if (paragraphs.length === 0) {
    return "Menopause guidance article from the local document cache.";
  }

  const summary = paragraphs.slice(0, 2).join(" ");
  return summary.length > 220 ? `${summary.slice(0, 217).trim()}...` : summary;
};

const fallbackTags = (content) => {
  const stopWords = new Set([
    "about", "after", "again", "along", "also", "because", "being", "below", "between",
    "could", "during", "first", "from", "have", "helps", "into", "just", "many", "more",
    "most", "much", "need", "only", "same", "than", "that", "their", "them", "then", "they",
    "this", "time", "very", "when", "with", "your"
  ]);
  const matches = content.toLowerCase().match(/[a-z]{4,}/g) ?? [];
  const unique = [];

  for (const match of matches) {
    if (stopWords.has(match)) continue;
    if (!unique.includes(match)) unique.push(match);
    if (unique.length === 5) break;
  }

  return unique.map((tag) => tag.replace(/\s+/g, "-"));
};

const requestMetadata = async ({ language, title, content }) => {
  if (!nvidiaApiKey) {
    return {
      title: stripArticlePrefix(title),
      summary: fallbackSummary(content),
      tags: fallbackTags(content)
    };
  }

  const prompt = [
    "You are cleaning article metadata for a menopause support app.",
    "Return only valid JSON with this exact shape:",
    '{"title":"string","summary":"string","tags":["tag-one","tag-two"]}',
    "Rules:",
    "- Keep the article in its original language.",
    "- Title should be concise and user-friendly.",
    "- Summary should be 2 short sentences.",
    "- Tags should be 3 to 6 lowercase hyphenated tags.",
    `Language: ${language}`,
    `Title: ${title}`,
    "Content:",
    content.slice(0, 5000)
  ].join("\n");

  const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${nvidiaApiKey}`
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-20b",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      top_p: 1,
      max_tokens: 500,
      stream: false
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`NVIDIA request failed: ${response.status} ${errorText}`);
  }

  const json = await response.json();
  const raw = json.choices?.[0]?.message?.content?.trim() ?? "";
  const parsed = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim());

  return {
    title: parsed.title || stripArticlePrefix(title),
    summary: parsed.summary || fallbackSummary(content),
    tags: Array.isArray(parsed.tags) && parsed.tags.length ? parsed.tags : fallbackTags(content)
  };
};

const extractArticles = () => {
  if (!existsSync(pdfPath)) {
    throw new Error(`Missing PDF at ${pdfPath}`);
  }

  const rawText = execFileSync("pdftotext", ["-layout", pdfPath, "-"], {
    cwd: projectRoot,
    encoding: "utf8"
  });

  const text = joinWrappedTitles(normalizeWhitespace(rawText));
  const headingPattern = /^(Article\s+(\d+):\s+.+|लेख\s+([०१२३४५६७८९\d]+):\s+.+)$/gm;
  const headings = [];
  let match;

  while ((match = headingPattern.exec(text)) !== null) {
    const fullHeading = match[1].trim();
    const articleNumber = parseArticleNumber(match[2] || match[3]);
    const language = fullHeading.startsWith("Article") ? "english" : "nepali";

    headings.push({
      index: match.index,
      title: fullHeading,
      articleNumber,
      language
    });
  }

  const articlesByKey = new Map();

  for (let i = 0; i < headings.length; i += 1) {
    const current = headings[i];
    const next = headings[i + 1];
    const end = next ? next.index : text.length;
    let content = text.slice(current.index, end).trim();

    while (content.startsWith(current.title)) {
      content = content.slice(current.title.length).trim();
    }

    content = cleanContent(content);
    if (content.length < 140) continue;

    const key = `${current.language}-${current.articleNumber}`;
    const existing = articlesByKey.get(key);

    if (!existing || content.length > existing.content.length) {
      articlesByKey.set(key, {
        id: `${current.language.slice(0, 2)}-${String(current.articleNumber).padStart(2, "0")}-${toAsciiSlug(current.title)}`,
        articleNumber: current.articleNumber,
        language: current.language,
        title: stripArticlePrefix(current.title),
        summary: "",
        content,
        tags: [],
        source: "docs_file.pdf"
      });
    }
  }

  return [...articlesByKey.values()].sort((a, b) => {
    if (a.articleNumber !== b.articleNumber) return a.articleNumber - b.articleNumber;
    return a.language.localeCompare(b.language);
  });
};

const writeCacheFile = (articles) => {
  ensureOutputDirectory();

  const fileContents = [
    'import type { InsightArticle } from "@/services/insightsPdfService";',
    "",
    "export const INSIGHTS_ARTICLES: InsightArticle[] = ",
    `${JSON.stringify(articles, null, 2)} as InsightArticle[];`,
    ""
  ].join("\n");

  writeFileSync(outputPath, fileContents, "utf8");
};

const main = async () => {
  if (!forceRefresh && existsSync(outputPath)) {
    const current = readFileSync(outputPath, "utf8");
    if (!current.includes("= [];")) {
      console.log(`Cache already exists at ${outputPath}. Use --force to rebuild.`);
      return;
    }
  }

  const baseArticles = extractArticles();
  const enrichedArticles = [];

  for (const article of baseArticles) {
    const metadata = await requestMetadata(article);

    enrichedArticles.push({
      ...article,
      title: metadata.title,
      summary: metadata.summary,
      tags: metadata.tags
    });

    console.log(`Processed ${article.language} article ${article.articleNumber}`);
  }

  writeCacheFile(enrichedArticles);
  console.log(`Wrote ${enrichedArticles.length} articles to ${outputPath}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
