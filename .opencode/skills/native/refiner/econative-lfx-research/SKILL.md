---
name: econative-lfx-research
description: Operativa del MCP lfx-research para investigación con LFX y biblioteca aislada; Refiner la usa, North también puede consultarla.
---

# LFX Research

## Qué es

MCP `lfx-research` — expone capacidad LFX dentro de este repo sin instalación global:

- Levanta con OpenCode vía `uvx --with mcp[cli] --with lfx --with python-dotenv --from .opencode/mcp/lfx-research lfx-research-mcp`.
- Ejecuta el flow Langflow de forma **stateless** con `lfx run --stateless` — no crea `langflow.db` ni `lfx.db`.
- LFX queda siempre dispuesto: el MCP se descubre al iniciar OpenCode, aunque falte `.env` (devuelve guía, no falla).

Dueño: **Refiner** (investiga). **North** puede consultarla para decidir si una tarea necesita conocimiento previo.

## Dónde vive

```
.opencode/mcp/lfx-research/              # MCP portable (viaja en el repo)
├── .env.example                         # template commitable
├── .env                                 # secretos — gitignored
├── pyproject.toml                       # deps: mcp[cli] + lfx + python-dotenv
├── server/config.py                     # prioridad: .env > opencode.json env > host env
├── server/main.py                       # FastMCP stdio — tools knowledge_*
└── flows/investigacion-conocimiento.json  # flow Langflow (lfx run)
.opencode/knowledge-library/             # biblioteca aislada (default)
├── index.json                           # índice: entries + domains
├── template.md
└── <domain>/<slug>.md
```

`opencode.json` declara el MCP con `KNOWLEDGE_LIBRARY_HOME=.opencode/knowledge-library` y `LFX_FLOW_PATH=.opencode/mcp/lfx-research/flows/investigacion-conocimiento.json` (relativos a repo root, resueltos en runtime). Nunca toca `~/biblioteca-conocimientos` salvo que configures `KNOWLEDGE_LIBRARY_HOME` explícitamente a esa ruta.

## Cómo usar — flujo Refiner

Refiner no ejecuta ni edita proyecto; solo investiga y delega. North puede usar `knowledge_search` en modo lectura.

### 1. Buscar primero

```
knowledge_search()                          # inventario (hasta 50)
knowledge_search(query="q", domain="d")     # filtrado (hasta 20, todos los términos AND)
knowledge_search(target="domain/slug")      # lectura completa
knowledge_search(target="domain/slug", sections="Resumen, Fuentes")  # solo secciones (split por ## )
```

- Sin `target`: lista compacta con `topic_key`, título, status y `updated_at`.
- Con `target`: lee el `.md` del entry; si `sections` no matchea, devuelve secciones disponibles.
- Usa `domain` para filtrar; `query` normaliza términos (split por espacio/coma).

### 2. Si no existe → investigar

```
knowledge_investigate(topic="mejores nichos KDP 2026", domain="amazon-kdp")
```

- Valida `topic`, slugifica, hace dedupe contra `index.json` y delega a LFX.
- Fire-and-forget si el flow ya está cableado; el ticket vuelve y la entrada aparece luego.
- Si falta configuración, devuelve guía para completar `.env` sin escribir nada.

### 3. Verificar

Cuando la investigación termina, `knowledge_search(target="<domain>/<slug>")` ya devuelve el entry. Si aún no está, todavía no terminó — no reintentes con otro slug.

## Reglas operativas

- **slugify (80 chars):** NFD + lower + `[^a-z0-9]+` → `-`; máx 80 chars (corte en último `-` > 40, si no 40). Domain y topic se slugifican por separado → `domain/slug`.
- **Dedupe:** 4 palabras iguales al inicio del slug dentro del mismo domain → near-duplicate, no re-investiga. Exact match `domain/slug` tampoco.
- **Biblioteca aislada:** todo en `.opencode/knowledge-library`. No tocar `~/biblioteca-conocimientos` salvo `KNOWLEDGE_LIBRARY_HOME` explícito — `config.py` advierte si apuntas al legacy.
- **index.json schema:** `{ entries: { "domain/slug": { title, domain, file:"domain/slug.md", summary, descripcion_corta?, keywords:[], status:"active", updated_at, topic_key } }, domains: { domain: {count} } }`. No editar a mano salvo que conozcas el schema; `ensure_library()` crea `entries:{}, domains:{}` si falta.
- **.env gitignored:** `.opencode/mcp/lfx-research/.env` y `.opencode/.gitignore` lo ignoran. Solo `.env.example` se commitea. Prioridad `.env` > `opencode.json` env > host env.
- **Sync vs fire-and-forget:** `knowledge_investigate` es fire-and-forget cuando el flow está cableado; `knowledge_search` es sync. Si `LFX_ENABLE_N8N_BRIDGE=true` se usa webhook n8n, pero el default es LFX directo.
- **Fallback:** si MCP/`.env`/`uv` no disponibles, Refiner informa y usa `websearch`/`webfetch`/`Context7`. No bloquea el workflow.
- **Reintento auditor:** si el auditor detecta entrada floja (resumen vacío, sin fuentes, estructura rota), Refiner puede re-lanzar `knowledge_investigate` con topic más específico — el dedupe evita duplicar si ya existe, usar variante de slug si hace falta corregir.

## Configurar provider OpenAI-compatible

`.opencode/mcp/lfx-research/.env` (copiar de `.env.example`):

```bash
cp .opencode/mcp/lfx-research/.env.example .opencode/mcp/lfx-research/.env
# editar:
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
LFX_RESEARCH_MODEL=gpt-4o-mini
LFX_AUDITOR_MODEL=gpt-4o
```

| Provider | `OPENAI_BASE_URL` | Notas |
|---|---|---|
| OpenAI | `https://api.openai.com/v1` | default |
| OpenRouter | `https://openrouter.ai/api/v1` | Claude/GPT/Gemini con una key, ej `anthropic/claude-3.5-sonnet`, `openai/gpt-4o` |
| Groq | `https://api.groq.com/openai/v1` | rápido |
| Together | `https://api.together.xyz/v1` |  |
| Fireworks | `https://api.fireworks.ai/inference/v1` |  |
| Perplexity | `https://api.perplexity.ai` | omit `/v1` |
| **DeepSeek** | `https://api.deepseek.com` | OpenAI-compatible directo, modelos `deepseek-chat`, `deepseek-reasoner` |
| **OpenCode Zen** | `https://opencode.ai/zen/v1` | pay-as-you-go, key en https://opencode.ai/zen, `GET /v1/models`, modelos ej `deepseek-v4-flash`, `qwen3.6-plus` |
| **OpenCode Go** | `https://opencode.ai/zen/go/v1` | flat $10/mo, misma key Zen/Go, endpoint siempre `+ /chat/completions` |
| Ollama local | `http://localhost:11434/v1` | sin key, `OPENAI_MODEL=llama3`, `gpt-oss-20b` etc |
| LMStudio | `http://localhost:1234/v1` | sin key |
| vLLM / TGI / custom | `http://localhost:8000/v1` | self-hosted OpenAI-compatible |

Los mismos `OPENAI_*` los consumen Refiner y los nodos LLM del flow Langflow (`{{env.OPENAI_*}}`). `LFX_RESEARCH_MODEL`/`LFX_AUDITOR_MODEL` sobreescriben por nodo. Para **Claude** hay dos vías: 1) OpenAI-compatible vía OpenRouter `anthropic/claude-3.5-sonnet` con este `OPENAI_BASE_URL` (recomendado, queda dentro del estándar), 2) **Claude directo** `https://api.anthropic.com` + `x-api-key` es **NO** OpenAI-compatible — requiere bundle nativo Anthropic en Langflow (no usa `OPENAI_*`). Para **DeepSeek directo** sí es OpenAI-compatible (`https://api.deepseek.com`, `deepseek-chat`). Tras editar `.env`, reiniciar OpenCode.

```bash
bash .opencode/mcp/lfx-research/scripts/validate.sh
python3 -m py_compile .opencode/mcp/lfx-research/server/*.py
```

## Troubleshooting

| Síntoma | Causa / fix |
|---|---|
| `LFX capability is not configured — complete .env first` | Falta `OPENAI_API_KEY`/`OPENAI_BASE_URL` en `.opencode/mcp/lfx-research/.env`. Copiar `.env.example` y completar. |
| MCP no listado (`opencode mcp list` sin `lfx-research`) | Revisar `opencode.json` bloque `mcp.lfx-research`; reiniciar OpenCode. |
| `uv: command not found` / `Module not found` | Instalar `uv` (`curl -LsSf https://astral.sh/uv/install.sh | sh`); deps se bajan vía `uvx --with`. |
| Flow placeholder | `flows/investigacion-conocimiento.json` es stub vacío hasta cablear nodos reales (ChatInput → Prompt research → LLM → Prompt auditor → LLM → write + index). `lfx run --stateless` valida pero no escribe hasta reemplazarlo. |
| Biblioteca vacía / `No entries match` | Normal si aún no investigaste; `index.json` empieza `{entries:{},domains:{}}`. Lanzar `knowledge_investigate` y luego `knowledge_search(target=...)`. |
| `Entry exists but file not found` | `index.json` apunta a `file` que no existe — revisar `KNOWLEDGE_LIBRARY_HOME` y que no se borró el `.md` a mano. |
| Sigue usando `~/biblioteca-conocimientos` | `KNOWLEDGE_LIBRARY_HOME` seteado en shell/host env pisa `opencode.json`; `unset` o setear a `.opencode/knowledge-library`. |

## Checklist rápido

- [ ] `.env` completo y `uv` instalado
- [ ] `knowledge_search` antes de `knowledge_investigate`
- [ ] slug ≤80, dedupe 4 palabras respetado
- [ ] no se tocó `~/biblioteca-conocimientos` ni `index.json` a mano
- [ ] tras `knowledge_investigate`, verificar con `knowledge_search(target=...)`
