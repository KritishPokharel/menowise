"""
getRelevantArticles — Backend retrieval function
Uses NVIDIA Nemotron LLM + Supabase to return articles relevant to a user's
emotional state and language preference.

Input shape:
    {
        "mood": "anxious",
        "language": "en",           # "en" or "ne"
        "answers": {
            "q1": "I've been feeling overwhelmed at work",
            "q2": "I struggle to sleep",
            "q3": "I feel disconnected from people"
        }
    }

Env vars (set before calling, or replace inline):
    SUPABASE_URL      — https://<ref>.supabase.co
    SUPABASE_ANON_KEY — your supabase anon/secret key
    NVIDIA_API_KEY    — nvapi-...
"""

import json
import re

from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
from supabase import create_client, Client

from supabase_key import secret_key, project_url

# ── Config ─────────────────────────────────────────────────────────────────────
SUPABASE_URL = project_url
SUPABASE_KEY = secret_key
NVIDIA_API_KEY = api_key  # Replace with your actual NVIDIA API key or set as env var

# Language code → stored value mapping (pipeline stores full word)
LANGUAGE_MAP = {
    "en": "english",
    "ne": "nepali",
    "english": "english",
    "nepali": "nepali",
}

# ── Clients ────────────────────────────────────────────────────────────────────
nvidia_client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=NVIDIA_API_KEY,
)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# ── Step 1 — Fetch all unique tags from Supabase ───────────────────────────────
def fetch_master_tags() -> list[str]:
    """
    Query the articles table, collect all tags arrays, flatten and deduplicate
    into a single sorted list.
    """
    result = supabase.table("articles").select("tags").execute()
    seen: set[str] = set()
    for row in result.data:
        for tag in row.get("tags") or []:
            seen.add(tag)
    return sorted(seen)


# ── Step 2 — Call NVIDIA Nemotron (streamed) to pick relevant tags ─────────────
def pick_tags_with_llm(mood: str, answers: dict, master_tags: list[str]) -> list[str]:
    """
    Stream a response from Nemotron Ultra and return up to 8 matching tags.
    Prompt prioritises WHAT the user is asking about (answers) over mood alone,
    so topic-specific tags (family, communication) are not drowned out by
    emotional-state tags (anxiety, stress).
    Falls back to an empty list on any parse error.
    """
    answers_text = "\n".join(f"  {k}: {v}" for k, v in answers.items())
    prompt = (
        f"A user's current mood: {mood}\n\n"
        f"What the user is specifically asking about or needs help with:\n{answers_text}\n\n"
        f"Available article tags: {json.dumps(master_tags)}\n\n"
        "Instructions:\n"
        "1. Read the user's answers carefully — they describe the TOPIC they need help with.\n"
        "2. Pick tags that match the TOPIC first (e.g. if they mention 'family' or 'talk', "
        "pick family/communication tags), then add emotional-state tags if slots remain.\n"
        "3. Return ONLY a raw JSON array of up to 8 tags from the available list above.\n"
        "No markdown, no explanation, just the raw JSON array.\n"
        'Example: ["family-communication", "relationships", "anxiety", "stress"]'
    )

    stream = nvidia_client.chat.completions.create(
        model="nvidia/llama-3.1-nemotron-ultra-253b-v1",
        messages=[{"role": "user", "content": prompt}],
        temperature=1,
        top_p=1,
        max_tokens=512,
        stream=True,
    )

    raw = ""
    for chunk in stream:
        if not getattr(chunk, "choices", None):
            continue
        delta_content = getattr(chunk.choices[0].delta, "content", None)
        if delta_content:
            raw += delta_content

    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw.strip())

    try:
        tags = json.loads(raw)
        if not isinstance(tags, list):
            return []
        valid = [t for t in tags if t in set(master_tags)]
        return valid[:8]
    except json.JSONDecodeError:
        print(f"[warn] LLM returned invalid JSON: {raw!r}")
        return []


# ── Step 2b — Keyword search on title + summary as a safety net ───────────────
_STOP_WORDS = {
    "i",
    "me",
    "my",
    "we",
    "the",
    "a",
    "an",
    "is",
    "are",
    "was",
    "be",
    "to",
    "of",
    "and",
    "in",
    "it",
    "do",
    "how",
    "what",
    "why",
    "when",
    "with",
    "that",
    "this",
    "but",
    "not",
    "have",
    "for",
    "about",
    "more",
    "want",
    "feel",
    "know",
    "can",
    "don't",
    "just",
    "so",
    "at",
    "on",
    "or",
    "if",
    "them",
    "they",
    "their",
    "from",
    "start",
    "been",
    "like",
}


def search_by_answer_keywords(answers: dict, language: str) -> list[dict]:
    """
    Extract the most meaningful words from the user's answers and run an
    ilike search against article title + summary.  This catches articles
    that are clearly topically relevant even when their tags weren't picked.
    """
    db_language = LANGUAGE_MAP.get(language.lower(), language.lower())

    # Pull all answer text, tokenise, remove stop words, take top 4 words
    all_words = " ".join(answers.values()).lower()
    tokens = re.findall(r"[a-z]{4,}", all_words)  # words ≥ 4 chars only
    keywords = [w for w in tokens if w not in _STOP_WORDS]

    # Deduplicate while preserving order, keep first 4
    seen: set[str] = set()
    unique_kw: list[str] = []
    for w in keywords:
        if w not in seen:
            seen.add(w)
            unique_kw.append(w)
        if len(unique_kw) == 4:
            break

    if not unique_kw:
        return []

    print(f"[info] Keyword search terms: {unique_kw}")

    # Build OR filter: each keyword checked against title AND summary
    or_parts = ",".join(f"title.ilike.%{kw}%,summary.ilike.%{kw}%" for kw in unique_kw)

    result = (
        supabase.table("articles")
        .select("id, title, summary, content, tags, language")
        .or_(or_parts)
        .eq("language", db_language)
        .limit(10)
        .execute()
    )

    return result.data or []


# ── Step 3 — Query Supabase with matched tags + language ──────────────────────
def query_articles(matched_tags: list[str], language: str) -> list[dict]:
    """
    Return up to 10 articles whose tags array overlaps matched_tags
    and whose language matches.  Falls back to empty list gracefully.
    """
    if not matched_tags:
        return []

    db_language = LANGUAGE_MAP.get(language.lower(), language.lower())

    # PostgREST array-overlap operator: "ov" maps to the && PostgreSQL operator.
    # The value must be formatted as a Postgres array literal: {tag1,tag2,...}
    pg_array = "{" + ",".join(matched_tags) + "}"

    result = (
        supabase.table("articles")
        .select("id, title, summary, content, tags, language")
        .filter("tags", "ov", pg_array)
        .eq("language", db_language)
        .limit(10)  # fetch wider pool — LLM re-ranks to top 5 below
        .execute()
    )

    if not result.data:
        return []

    # Pre-sort by tag overlap count so the LLM gets the strongest candidates first
    matched_set = set(matched_tags)
    ranked = sorted(
        result.data,
        key=lambda row: len(matched_set & set(row.get("tags") or [])),
        reverse=True,
    )
    return ranked


# ── Step 3b — Re-rank candidates by comparing summaries to user's answers ──────
def rerank_by_summary(mood: str, answers: dict, candidates: list[dict]) -> list[dict]:
    """
    Send the user context + each article's title+summary to the LLM.
    Ask it to return the article IDs ordered from most to least relevant.
    Falls back to the original order if the LLM response is unparseable.
    """
    if not candidates:
        return candidates

    answers_text = "\n".join(f"  {k}: {v}" for k, v in answers.items())

    # Build a compact list of {index, id, title, summary} for the prompt
    candidates_text = "\n\n".join(
        f"[{i}] id={a['id']}\n"
        f"    title: {a['title']}\n"
        f"    summary: {(a.get('summary') or '').strip()}"
        for i, a in enumerate(candidates)
    )

    prompt = (
        f"A user is feeling: {mood}\n"
        f"Their answers:\n{answers_text}\n\n"
        "Below are candidate articles (index, id, title, summary):\n\n"
        f"{candidates_text}\n\n"
        "Return ONLY a raw JSON array of article IDs ordered from MOST to LEAST relevant "
        "to the user's specific situation and answers. No markdown, no explanation.\n"
        'Example: ["uuid-1", "uuid-2", "uuid-3"]'
    )

    stream = nvidia_client.chat.completions.create(
        model="nvidia/llama-3.1-nemotron-ultra-253b-v1",
        messages=[{"role": "user", "content": prompt}],
        temperature=1,
        top_p=1,
        max_tokens=256,
        stream=True,
    )

    raw = ""
    for chunk in stream:
        if not getattr(chunk, "choices", None):
            continue
        delta = getattr(chunk.choices[0].delta, "content", None)
        if delta:
            raw += delta

    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw.strip())

    try:
        ordered_ids: list[str] = json.loads(raw)
        if not isinstance(ordered_ids, list):
            return candidates[:10]

        id_to_article = {a["id"]: a for a in candidates}
        reranked = [id_to_article[oid] for oid in ordered_ids if oid in id_to_article]

        # Append any candidates the LLM omitted (safety net)
        seen = set(ordered_ids)
        for a in candidates:
            if a["id"] not in seen:
                reranked.append(a)

        return reranked[:10]

    except json.JSONDecodeError:
        print(f"[warn] Re-rank LLM returned invalid JSON: {raw!r}")
        return candidates[:10]


# ── Public API ─────────────────────────────────────────────────────────────────
def getRelevantArticles(userInput: dict) -> list[dict]:
    """
    Main entry point.

    Args:
        userInput: dict with keys mood (str), language (str), answers (dict)

    Returns:
        List of up to 10 article dicts: {id, title, summary, tags, language}
        Returns [] on any unrecoverable error.
    """
    mood = userInput.get("mood", "")
    language = userInput.get("language", "en")
    answers = userInput.get("answers", {})

    # Step 1 — get master tag list from Supabase
    master_tags = fetch_master_tags()
    if not master_tags:
        print("[warn] No tags found in articles table — is the pipeline run?")
        return []

    # Step 2 — ask LLM to pick the 5 most relevant tags
    matched_tags = pick_tags_with_llm(mood, answers, master_tags)
    if not matched_tags:
        print("[warn] LLM returned no valid tags; returning empty result.")
        return []

    print(f"[info] Matched tags: {matched_tags}")

    # Step 3a — retrieve tag-matched candidates (up to 10)
    tag_candidates = query_articles(matched_tags, language)
    print(f"[info] Tag-matched candidates: {len(tag_candidates)}")

    # Step 3b — keyword search on title+summary (catches topic-specific articles
    #            that may have been missed by tag selection, e.g. communication articles
    #            when mood was anxious)
    kw_candidates = search_by_answer_keywords(answers, language)
    print(f"[info] Keyword-matched candidates: {len(kw_candidates)}")

    # Merge both pools, deduplicate by id, preserve tag-match order
    seen_ids: set[str] = set()
    merged: list[dict] = []
    for article in tag_candidates + kw_candidates:
        if article["id"] not in seen_ids:
            seen_ids.add(article["id"])
            merged.append(article)

    if not merged:
        print("[info] No articles found from either search.")
        return []

    print(f"[info] Merged candidate pool: {len(merged)}")

    # Step 3c — re-rank the merged pool by comparing summaries to user's answers
    articles = rerank_by_summary(mood, answers, merged)
    print(f"[info] Returning {len(articles)} article(s) after summary re-rank")
    return articles


# ── Flask App ──────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)


@app.route("/articles", methods=["POST"])
def articles_endpoint():
    """
    POST /articles
    Body (JSON):
        {
            "mood": "anxious",
            "language": "en",
            "answers": {
                "q1": "...",
                "q2": "...",
                "q3": "..."
            }
        }
    Returns JSON array of up to 10 relevant articles.
    """
    body = request.get_json(silent=True)
    if not body:
        return jsonify({"error": "Request body must be JSON"}), 400

    if "mood" not in body or "answers" not in body:
        return jsonify({"error": "Missing required fields: mood, answers"}), 400

    results = getRelevantArticles(body)
    return jsonify(results)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
