# lfx-research MCP (portable)

Portable MCP that exposes **LFX research capacity** (`lfx run`, stateless, no `langflow.db`) inside `crisol-definitive`.

```
crisoles/crisol-definitive/
├── opencode.json                          # declares lfx-research (uvx --with mcp --with lfx)
├── .opencode/
│   ├── knowledge-library/                 # ISOLATED library (English, hyphen) — default
│   │   ├── index.json
│   │   └── <domain>/<slug>.md
│   └── mcp/lfx-research/                  # ← this MCP
│       ├── .env.example                   # template (commit)
│       ├── .env                           # secrets (gitignored)
│       ├── pyproject.toml                 # mcp[cli] + lfx + python-dotenv
│       ├── server/
│       │   ├── config.py                  # .env > opencode.json env > host env
│       │   └── main.py                    # FastMCP stdio — knowledge_* tools
│       ├── flows/
│       │   └── investigacion-conocimiento.json  # Langflow flow (lfx run)
│       └── scripts/validate.sh
```

## Why isolated?

- Default `KNOWLEDGE_LIBRARY_HOME` is `.opencode/knowledge-library` (relative to repo root, resolved at runtime).
- Never touches `~/biblioteca-conocimientos` unless you explicitly set `KNOWLEDGE_LIBRARY_HOME=~/biblioteca-conocimientos`.
- Existing local tools `knowledge_search` / `knowledge_investigate` remain compatible via the same env var, but the MCP overrides the default to the isolated path.

## Setup

```bash
# 1. Configure OpenAI-compatible API (any provider)
cp .opencode/mcp/lfx-research/.env.example .opencode/mcp/lfx-research/.env
# edit .env: OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL
# optional: LFX_RESEARCH_MODEL, LFX_AUDITOR_MODEL

# 2. Restart opencode so the MCP is discovered
# opencode mcp list  # should show lfx-research

# 3. Validate without starting the server
bash .opencode/mcp/lfx-research/scripts/validate.sh
python3 -m py_compile .opencode/mcp/lfx-research/server/*.py
```

### OpenAI-compatible providers

| Provider | `OPENAI_BASE_URL` | Notes |
|---|---|---|
| OpenAI | `https://api.openai.com/v1` | default |
| OpenRouter | `https://openrouter.ai/api/v1` | set `OPENAI_API_KEY` to your OR key |
| Ollama (local) | `http://localhost:11434/v1` | no key needed, model e.g. `llama3` |

The same `OPENAI_*` values are consumed by Refiner and by the Langflow/LFX workflow nodes.

## MCP declaration (opencode.json)

```json
"lfx-research": {
  "type": "local",
  "enabled": true,
  "command": ["uvx", "--with", "mcp[cli]", "--with", "lfx", "--with", "python-dotenv", "--from", ".opencode/mcp/lfx-research", "lfx-research-mcp"],
  "environment": {
    "KNOWLEDGE_LIBRARY_HOME": ".opencode/knowledge-library",
    "LFX_FLOW_PATH": ".opencode/mcp/lfx-research/flows/investigacion-conocimiento.json"
  }
}
```

- `uvx --with mcp --with lfx` leaves LFX capacity ready at `opencode` startup (stateless).
- `environment` sets the isolated defaults; `.env` overrides them if present.

## Tools

### `knowledge_investigate(topic, domain?)`

- Slugifies `topic`/`domain`, dedupes with 4-word prefix (like legacy `biblioteca-existe.sh`).
- Checks `index.json` at `KNOWLEDGE_LIBRARY_HOME`.
- If `OPENAI_API_KEY` missing → returns guidance to complete `.env` (still discoverable).
- If configured but flow not yet wired → stub message with next steps (no write).
- Future: `lfx run --stateless <flow> --inputs topic=... domain=...` then writes `<domain>/<slug>.md` + updates `index.json`.

### `knowledge_search(query?, domain?, target?, sections?)`

- Reads from the **isolated** library.
- Without `target`: inventory or filtered search (20 max).
- With `target`: full entry; `sections` filters by `##` headings.

## Flow

`flows/investigacion-conocimiento.json` is a placeholder today. Replace with the exported Langflow JSON once research/auditor nodes are designed. The server checks existence but does not fail startup if it is still a placeholder.

Expected nodes: `ChatInput → Prompt(research) → LLM(LFX_RESEARCH_MODEL) → Prompt(auditor) → LLM(LFX_AUDITOR_MODEL) → File write + Index update`.

Run stateless: `lfx run flows/investigacion-conocimiento.json --stateless`.

## Troubleshooting

- **MCP not listed**: `cat opencode.json` → check `mcp.lfx-research` block; restart opencode.
- **Module not found**: `uv` must be installed; `pyproject.toml` deps are fetched via `uvx --with`.
- **Still using old library**: `echo $KNOWLEDGE_LIBRARY_HOME` — if set to `~/biblioteca-conocimientos` in shell, it overrides opencode.json; unset or set to `.opencode/knowledge-library`.
- **Flow validation fails**: placeholder is valid JSON; replace with real flow when ready.
