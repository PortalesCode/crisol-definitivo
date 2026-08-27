# Knowledge Library (isolated)

Isolated knowledge library for `crisol-definitive`. This library lives **inside** `.opencode/knowledge-library/` and does **not** use `~/biblioteca-conocimientos`.

## Structure

```
.opencode/knowledge-library/
├── index.json        # Central index: entries + domains
├── README.md         # This file
├── template.md       # Template for new entries
└── <domain>/
    └── <slug>.md     # One file per investigated topic
```

## Index format

```json
{
  "entries": {
    "domain/slug": {
      "title": "Human title",
      "domain": "domain",
      "file": "domain/slug.md",
      "summary": "One-line summary",
      "descripcion_corta": "Short description (optional)",
      "keywords": ["kw1", "kw2"],
      "status": "active",
      "updated_at": "2026-08-27",
      "topic_key": "domain/slug"
    }
  },
  "domains": {
    "general": { "count": 0 }
  }
}
```

## Resolution

`KNOWLEDGE_LIBRARY_HOME` defaults to `.opencode/knowledge-library` (relative to repo root, resolved at runtime). The MCP `lfx-research` and the local tools `knowledge_search` / `knowledge_investigate` share this path.

- Relative paths are resolved from the git root (or from `opencode.json` location).
- Backward compatible: if `KNOWLEDGE_LIBRARY_HOME` is set to `~/biblioteca-conocimientos`, legacy tools still work.

## Usage

Entries are created by `knowledge_investigate` (MCP) and read by `knowledge_search`. Do not edit `index.json` manually unless you know the schema.
