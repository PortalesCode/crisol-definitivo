#!/usr/bin/env python3
"""
lfx-research MCP — stdio server (FastMCP).

Tools:
  - knowledge_investigate(topic, domain): stub with validation + dedupe, placeholder for LFX flow
  - knowledge_search(query, domain, target, sections): wrapper over isolated .opencode/knowledge-library

Isolated library defaults to .opencode/knowledge-library (never touches ~/biblioteca-conocimientos).
Config priority: .opencode/mcp/lfx-research/.env > opencode.json env > host env (see config.py).

LFX runtime: `lfx run` stateless (no langflow.db) — wired later via placeholder.
The server must be discoverable even when OPENAI_API_KEY is missing (returns guidance).
"""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path
from typing import Optional

from mcp.server.fastmcp import FastMCP

from .config import settings

mcp = FastMCP("lfx-research")

# ---------------------------------------------------------------------------
# Helpers — slugify + dedupe (mirrors biblioteca-existe.sh / knowledge_investigate.ts)
# ---------------------------------------------------------------------------

def slugify(value: str) -> str:
    s = unicodedata.normalize("NFD", str(value))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    if len(s) <= 80:
        return s
    cut = s[:81]
    last = max(cut.rfind("-"), 40)
    if last > 40:
        return cut[:last]
    return s[:40]


def _read_index() -> dict:
    settings.ensure_library()
    index_path = settings.knowledge_library_home / "index.json"
    try:
        return json.loads(index_path.read_text(encoding="utf-8"))
    except Exception:
        return {"entries": {}, "domains": {}}


def _write_index(data: dict) -> None:
    settings.ensure_library()
    index_path = settings.knowledge_library_home / "index.json"
    index_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _is_similar(existing_slug: str, new_slug: str, domain: str) -> bool:
    if not existing_slug.startswith(f"{domain}/"):
        return False
    new_words = new_slug.split("/")[1].split("-") if "/" in new_slug else []
    existing_words = existing_slug.split("/")[1].split("-") if "/" in existing_slug else []
    common = 0
    for a, b in zip(new_words, existing_words):
        if a != b:
            break
        common += 1
    return common >= 4


def _normalize_terms(input_str: str) -> list[str]:
    return [t for t in re.split(r"[\s,;]+", input_str.lower()) if len(t) > 1]


def _entry_matches(entry: dict, terms: list[str]) -> bool:
    if not terms:
        return True
    haystack = " ".join(
        [
            str(entry.get("title", "")),
            str(entry.get("summary", "")),
            str(entry.get("domain", "")),
            str(entry.get("topic_key", "")),
            str(entry.get("descripcion_corta", "")),
            " ".join(entry.get("keywords", []) or []),
        ]
    ).lower()
    return all(t in haystack for t in terms)


def _split_sections(markdown: str) -> dict[str, str]:
    sections: dict[str, str] = {}
    current = ""
    buffer: list[str] = []
    for line in markdown.split("\n"):
        if re.match(r"^##\s+", line):
            if current:
                sections[current] = "\n".join(buffer).strip()
            current = re.sub(r"^##\s+", "", line).strip()
            buffer = [line]
        else:
            buffer.append(line)
    if current:
        sections[current] = "\n".join(buffer).strip()
    return sections


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------

@mcp.tool()
def knowledge_investigate(topic: str, domain: str = "general") -> str:
    """
    Investigate a topic and save it to the isolated knowledge library.

    The LFX flow (lfx run, stateless) will be wired here once OPENAI_API_KEY
    is configured. For now this is a validated stub that dedupes and guides.

    Args:
        topic: The topic to research, as specific as possible.
        domain: Domain folder; defaults to general. Slugified.
    """
    if not topic or not topic.strip():
        return "Error: topic is required and must be non-empty."

    domain_slug = slugify(domain or "general") or "general"
    topic_slug = slugify(topic)
    if not topic_slug:
        return "Error: topic produced an empty slug — use a more specific topic."
    slug = f"{domain_slug}/{topic_slug}"

    # Dedupe against isolated library
    index = _read_index()
    entries = index.get("entries", {})

    if slug in entries:
        return (
            f"Topic already exists in the isolated library as {slug} — not re-investigating. "
            f"Read it with knowledge_search target: \"{slug}\". "
            f"Library: {settings.knowledge_library_home}"
        )

    similar = next((k for k in entries.keys() if _is_similar(k, slug, domain_slug)), None)
    if similar:
        return (
            f"Topic is already covered as {similar} (near-duplicate of \"{slug}\") — not re-investigating. "
            f"Read it with knowledge_search target: \"{similar}\"."
        )

    # Not configured yet → guidance (must be discoverable without LFX)
    if not settings.is_lfx_configured():
        return (
            "LFX capability is not configured — complete .env first.\n\n"
            f"  MCP .env: {settings.dotenv_path}\n"
            f"  Template: {settings.mcp_root / '.env.example'}\n"
            "  Required: OPENAI_API_KEY and OPENAI_BASE_URL (OpenAI-compatible).\n"
            "  Optional: OPENAI_MODEL / LFX_RESEARCH_MODEL / LFX_AUDITOR_MODEL\n\n"
            f"  Topic validated and deduped: \"{topic}\" → {slug}\n"
            f"  Library (isolated): {settings.knowledge_library_home}\n"
            f"  Flow: {settings.lfx_flow_path} (placeholder until configured)\n\n"
            "Once .env is filled, this tool will run: lfx run --stateless "
            f"{settings.lfx_flow_path} and write .opencode/knowledge-library/{slug}.md + index.json"
        )

    # Configured but flow not yet wired — leave clear placeholder for next step
    # (do NOT touch ~/biblioteca-conocimientos)
    flow_exists = settings.lfx_flow_path.exists()
    flow_note = "found" if flow_exists else "placeholder (flows/investigacion-conocimiento.json not yet wired)"

    return (
        f"Investigation queued (stub) — LFX flow execution will be wired next.\n\n"
        f"  Topic: \"{topic}\" → {slug}\n"
        f"  Domain: {domain_slug}\n"
        f"  Library (isolated): {settings.knowledge_library_home}\n"
        f"  Flow: {settings.lfx_flow_path} [{flow_note}]\n"
        f"  Model: {settings.lfx_research_model} (auditor: {settings.lfx_auditor_model})\n"
        f"  Base URL: {settings.openai_base_url}\n\n"
        "Next: wire `lfx run --stateless` with the Langflow flow to generate "
        f".opencode/knowledge-library/{slug}.md and update index.json. "
        "For now the stub validates input and dedupes; no data was written."
    )


@mcp.tool()
def knowledge_search(
    query: Optional[str] = None,
    domain: Optional[str] = None,
    target: Optional[str] = None,
    sections: Optional[str] = None,
) -> str:
    """
    Search the isolated knowledge library.

    Without target: compact inventory or up to 20 matching results.
    With target: read the complete entry or selected sections.

    Args:
        query: Search terms; omit to list inventory.
        domain: Filter by domain folder.
        target: Topic key (e.g. general/my-topic) to read in full.
        sections: Comma-separated section names to read only; requires target.
    """
    MAX_SEARCH = 20
    MAX_INVENTORY = 50

    index = _read_index()
    entries: dict = index.get("entries", {}) or {}
    all_entries = [{**v, "topic_key": k} for k, v in entries.items()]

    if target:
        entry = entries.get(target)
        if not entry:
            similar = [e["topic_key"] for e in all_entries if target.lower() in e["topic_key"].lower()]
            return f'Entry "{target}" not found. Similar: {", ".join(similar) or "none"}. Library: {settings.knowledge_library_home}'

        file_rel = entry.get("file", f"{target}.md")
        # file is relative to library home
        content_path = settings.knowledge_library_home / file_rel
        # Fallback: also try target.md
        if not content_path.exists():
            alt = settings.knowledge_library_home / f"{target}.md"
            if alt.exists():
                content_path = alt
            else:
                return f"Entry exists in index but file not found: {content_path} (tried {file_rel})"

        try:
            content = content_path.read_text(encoding="utf-8")
        except Exception as e:
            return f"Entry exists but could not be read {content_path}: {e}"

        if sections:
            wanted = [s.strip().lower() for s in sections.split(",") if s.strip()]
            picked = [(n, b) for n, b in _split_sections(content).items() if n.lower() in wanted]
            if picked:
                return "\n\n".join(b for _, b in picked)
            avail = ", ".join(_split_sections(content).keys()) or "(none)"
            return f"Sections not found. Available: {avail}"

        return content

    terms = _normalize_terms(query or "")
    domain_filter = domain.lower() if domain else None

    hits = [e for e in all_entries if (not domain_filter or (e.get("domain", "").lower() == domain_filter))]
    hits = [e for e in hits if _entry_matches(e, terms)]
    hits.sort(key=lambda e: str(e.get("updated_at", "")), reverse=True)

    if not hits:
        q = query or ""
        d = f' in domain "{domain_filter}"' if domain_filter else ""
        return f'No entries in the isolated library match "{q}"{d}. Library: {settings.knowledge_library_home}'

    if not terms:
        shown = hits[:MAX_INVENTORY]
        lines = [f'{i+1}. **{e["topic_key"]}** — {e.get("title","(no title)")} [{e.get("status","")}]' for i, e in enumerate(shown)]
        note = (
            f"\n\nShowing {len(shown)} of {len(hits)} entries. Filter with query or domain, or use target: \"<topic_key>\" to read one."
            if len(hits) > len(shown)
            else f"\n\nTotal: {len(hits)} entries{ f' in domain \"{domain_filter}\"' if domain_filter else ''}. Use target: \"<topic_key>\" to read one."
        )
        return "\n".join(lines) + note

    shown = hits[:MAX_SEARCH]
    lines = []
    for i, e in enumerate(shown):
        desc = (e.get("descripcion_corta") or "").strip() or (e.get("summary") or "(no summary)")
        # Show short desc vs summary
        prefix = "Description" if e.get("descripcion_corta") else "Summary"
        lines.append(
            f'{i+1}. **{e["topic_key"]}** — {e.get("title","")} [{e.get("status","")}] (updated {e.get("updated_at","")})\n'
            f'   {prefix}: {desc}\n'
            f'   File: {e.get("file","")}'
        )
    note = (
        f"\n\nShowing {len(shown)} of {len(hits)} results. Use target: \"<topic_key>\" to read one."
        if len(hits) > len(shown)
        else '\n\nUse target: "<topic_key>" (or sections) to read one in full.'
    )
    return "\n".join(lines) + note


def main() -> None:
    """Entrypoint for uvx / console_scripts."""
    settings.ensure_library()
    # Validate but do not fail to start — MCP must be discoverable
    for msg in settings.validate():
        # Log to stderr; FastMCP will surface startup warnings
        import sys
        print(f"[lfx-research] warning: {msg}", file=sys.stderr)
    mcp.run()


if __name__ == "__main__":
    main()
