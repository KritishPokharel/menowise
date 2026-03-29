#!/usr/bin/env python3
"""
Nepal-US Hackathon Article Pipeline
Extracts articles from PDF, enriches with NVIDIA LLM, stores in Supabase.

Before running, execute this SQL in your Supabase SQL editor:
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS articles (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    title       text        NOT NULL,
    content     text        NOT NULL,
    language    text        NOT NULL,
    summary     text,
    keywords    text[],
    topics      text[],
    intent      text,
    tags        text[],
    created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS master_tags (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    tag         text        UNIQUE NOT NULL,
    count       integer     DEFAULT 1,
    created_at  timestamptz DEFAULT now()
);

-- GIN index so array-overlap queries (&&) on tags are fast at retrieval time
CREATE INDEX IF NOT EXISTS articles_tags_gin ON articles USING GIN (tags);
-- Index for language filter
CREATE INDEX IF NOT EXISTS articles_language_idx ON articles (language);
------------------------------------------------------------
"""

import json
import re
import sys

import fitz  # pymupdf
from openai import OpenAI
from supabase import create_client, Client

from supabase_key import secret_key, project_url

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL = project_url
NVIDIA_API_KEY = (
    "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"
)
PDF_PATH = "New_Docs.pdf"
NVIDIA_MODEL = "meta/llama-3.3-70b-instruct"

# ── Clients ───────────────────────────────────────────────────────────────────
nvidia = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=NVIDIA_API_KEY,
)
supabase: Client = create_client(SUPABASE_URL, secret_key)


# ── PDF Extraction ────────────────────────────────────────────────────────────
def _join_wrapped_titles(text: str) -> str:
    """
    PyMuPDF sometimes splits a long article title across two lines, e.g.:
        "Article 5: How do I talk to my family about how I'm"
        "feeling?"
    This pass joins such lines into one so the heading regex can match.
    Works for both English ("Article N:") and Nepali ("लेख N:") titles.
    """
    en_start = re.compile(r"^Article\s+\d+:\s+\S")
    ne_start = re.compile(r"^लेख\s+[१२३४५६७८९\d]+:\s+\S")

    lines = text.splitlines()
    result: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        is_title = en_start.match(stripped) or ne_start.match(stripped)
        # If this looks like a title but doesn't end with ? join the next line
        if is_title and not stripped.endswith("?"):
            next_stripped = lines[i + 1].strip() if i + 1 < len(lines) else ""
            # Only join if the next line is not itself a new article heading
            if next_stripped and not en_start.match(next_stripped) and not ne_start.match(next_stripped):
                result.append(stripped + " " + next_stripped)
                i += 2
                continue
        result.append(line)
        i += 1
    return "\n".join(result)


def extract_articles_from_pdf(pdf_path: str) -> list[dict]:
    """
    Extract English and Nepali articles from the PDF.
    Splits on 'Article N:' (English) and 'लेख N:' (Nepali) title lines.
    Skips the leading 'Data' section.
    """
    doc = fitz.open(pdf_path)
    pages_text = [page.get_text() for page in doc]
    doc.close()

    # Join wrapped title lines before running the heading regex
    full_text = _join_wrapped_titles("\n".join(pages_text))

    # Match both EN and NE article headings (the full-title versions, not the stub pages)
    en_re = re.compile(r"(?m)^(Article\s+\d+:\s+.+\?)", re.MULTILINE)
    ne_re = re.compile(r"(?m)^(लेख\s+[१२३४५६७८९\d]+:\s+.+[\?।]?)", re.MULTILINE)

    segments: list[tuple[int, str, str]] = []  # (pos, language, title)

    for m in en_re.finditer(full_text):
        title = m.group(1).strip()
        # Skip one-liner stub pages (title only, real content page has the same title + body)
        # We deduplicate by keeping only the first occurrence of each title
        if not any(s[2] == title for s in segments):
            segments.append((m.start(), "english", title))

    for m in ne_re.finditer(full_text):
        title = m.group(1).strip()
        if not any(s[2] == title for s in segments):
            segments.append((m.start(), "nepali", title))

    segments.sort(key=lambda x: x[0])

    articles = []
    for i, (start, language, title) in enumerate(segments):
        end = segments[i + 1][0] if i + 1 < len(segments) else len(full_text)
        body = full_text[start:end].strip()

        # Remove repeated title at the start of the body
        if body.startswith(title):
            body = body[len(title) :].strip()

        # Drop "Authentic Sources & Links" footer section from content
        body = re.split(r"Authentic Sources & Links|प्रामाणिक स्रोत", body)[0].strip()

        if len(body) > 100:  # skip stub pages with almost no content
            articles.append({"title": title, "content": body, "language": language})

    return articles


# ── NVIDIA LLM Enrichment ─────────────────────────────────────────────────────
def enrich_with_llm(title: str, content: str, language: str) -> dict:
    """Call NVIDIA LLM to produce summary, keywords, topics, intent, and tags."""
    prompt = (
        "You are a health content analyst. Analyze the article below and return ONLY "
        "a valid JSON object — no markdown, no code fences, no extra text.\n\n"
        "Required fields:\n"
        "  summary   : string — 2-3 sentence plain-language summary\n"
        "  keywords  : list of 5-8 keyword strings\n"
        "  topics    : list of 3-5 main topic strings\n"
        '  intent    : one of "educate" | "inform" | "guide" | "support"\n'
        "  tags      : list of 5-10 lowercase hyphenated tag strings\n\n"
        f"Article Language: {language}\n"
        f"Article Title: {title}\n\n"
        f"Content (first 3000 chars):\n{content[:3000]}"
    )

    response = nvidia.chat.completions.create(
        model=NVIDIA_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=600,
        stream=False,
    )

    raw = response.choices[0].message.content.strip()
    # Strip accidental markdown code fences
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw.strip())
    return json.loads(raw)


# ── Master Tag List ───────────────────────────────────────────────────────────
def update_master_tags(new_tags: list[str]) -> None:
    """Upsert tags into master_tags; increment count for existing ones."""
    existing_result = supabase.table("master_tags").select("tag, count").execute()
    existing = {row["tag"]: row["count"] for row in existing_result.data}

    for tag in new_tags:
        if tag in existing:
            supabase.table("master_tags").update({"count": existing[tag] + 1}).eq(
                "tag", tag
            ).execute()
            existing[tag] += 1  # keep local cache consistent
        else:
            supabase.table("master_tags").insert({"tag": tag, "count": 1}).execute()
            existing[tag] = 1


# ── Main Pipeline ─────────────────────────────────────────────────────────────
def main() -> None:
    print("=" * 60)
    print("Nepal-US Hackathon Article Pipeline")
    print("=" * 60)

    # 1. Extract articles from PDF
    print(f"\nExtracting articles from: {PDF_PATH}")
    articles = extract_articles_from_pdf(PDF_PATH)
    print(f"Found {len(articles)} articles to process\n")

    # Fetch all existing titles once upfront to avoid N queries
    existing_titles: set[str] = {
        row["title"]
        for row in supabase.table("articles").select("title").execute().data
    }
    print(f"Existing articles in DB: {len(existing_titles)}\n")

    success_count = 0
    skipped_count = 0
    failure_count = 0

    for article in articles:
        title = article["title"]
        content = article["content"]
        language = article["language"]

        if title in existing_titles:
            print(f"Skipped (duplicate): {title}")
            skipped_count += 1
            continue

        print(f"Processing: {title}")

        try:
            # 2. Enrich with NVIDIA LLM
            metadata = enrich_with_llm(title, content, language)
            tags = metadata.get("tags", [])
            print(f"  Tags generated: {', '.join(tags)}")

            # 3. Insert into articles table
            result = (
                supabase.table("articles")
                .insert(
                    {
                        "title": title,
                        "content": content,
                        "language": language,
                        "summary": metadata.get("summary", ""),
                        "keywords": metadata.get("keywords", []),
                        "topics": metadata.get("topics", []),
                        "intent": metadata.get("intent", ""),
                        "tags": tags,
                    }
                )
                .execute()
            )

            article_id = result.data[0]["id"]
            print(f"  Stored successfully: {article_id}")

            # 4. Update master tag list with any new tags
            update_master_tags(tags)

            success_count += 1

        except json.JSONDecodeError as e:
            print(f"  Failed: {title} — LLM returned invalid JSON: {e}")
            failure_count += 1
        except Exception as e:
            print(f"  Failed: {title} — {e}")
            failure_count += 1

    print("\n" + "=" * 60)
    print(
        f"Pipeline complete — Success: {success_count}  Skipped: {skipped_count}  Failed: {failure_count}"
    )
    print("=" * 60)


if __name__ == "__main__":
    main()
