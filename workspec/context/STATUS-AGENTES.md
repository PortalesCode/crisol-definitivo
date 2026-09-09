# STATUS-AGENTES

> **Referencia viva del ecosistema dev** — qué tiene el ecosistema HOY y qué falta.
> NO es el estado del trabajo del proyecto anfitrión (eso va en STATUS.md).
> El historial de desarrollo (rondas, decisiones pasadas) vive en git history — no acá.

## Estado General

```
🔴 Sin definir     🟡 En construcción     🟢 Estable
```

**Estado actual:** 🟢 Estable

---

## Agentes

| Agente | Modo | Rol |
|---|---|---|
| `Refiner` | primary | Puerta de entrada. Entiende/refina la intención, consulta el triángulo, formula la acción. |
| `North` | subagent | El cerebro. Crea, descompone y administra el plan; delega a Executor/Auditor. |
| `Boehmio` | subagent | Creativo. Abre la cabeza, analiza ideas. |
| `Realistic` | subagent | Realista. Baja a tierra, valida, puntúa 1-10. |
| `Executor` | subagent | La mano de North. Ejecuta. |
| `Auditor` | subagent | Verifica que lo ejecutado esté perfecto. |
| `Patcheador` | subagent | Vía rápida para lo trivial (<10 líneas, 1 archivo). No pasa por North/Executor/Auditor. |
| `tunel-investigador` | primary (oculto) | Orquestador del túnel de investigación. Lo lanza SOLO la tool `econative_investigar` vía `opencode run`. NO se invoca con task(). |
| `tunel-investigador-web` | subagent (oculto) | Investiga crudo en la web. Solo lo llama tunel-investigador. |
| `tunel-validador` | subagent (oculto) | Control de calidad del túnel: estructura + fuentes + score. Solo lo llama tunel-investigador. |

**Regla de oro del túnel:** los agentes `tunel-*` NO se invocan con `task()` desde el ecosistema visible. La única puerta son las tools `econative_*`.

---

## Skills nativas

| Skill | Dueño | Propósito |
|---|---|---|
| `econative-architecture-review` | North | Evaluar arquitectura, impacto, riesgos |
| `econative-parallel-dispatch` | North | Detectar independencia y lanzar Executors en paralelo |
| `econative-skill-installer` | Refiner | Investigar skills externas y preparar intake (no instala) |
| `econative-adaptive-tone` | Refiner | Adaptar tono según nivel técnico del usuario |
| `econative-implement-safe` | Executor | Implementación segura (reglas, rollback) |
| `econative-debug-systematic` | Executor | Debugging metódico |
| `econative-test-and-validate` | Executor | Testing y validación |
| `econative-audit-review` | Auditor | Revisión estructurada |

---

## MCPs (6)

| MCP | Tipo | Detalle |
|---|---|---|
| `sequential-thinking` | local | Razonamiento estructurado multi-paso (solo tareas complejas) |
| `codegraph` | local | Grafo del código: símbolos, edges, blast radius (`npx @colbymchenry/codegraph@1.5.0`) |
| `headroom` | local | Optimización de contexto LLM (`uvx headroom-ai[mcp]`, requiere uv) |
| `context7` | remoto | Documentación de librerías bajo demanda |
| `chrome-devtools` | local | Navegación, snapshots, red y consola del navegador |
| `playwright` | local | Automatización E2E de navegador |

---

## Plugins (tools del ecosistema)

| Tool | Qué hace |
|---|---|
| `econative_start_session` | Inicio obligatorio de sesión (contexto + prefs + plan) |
| `econative_context_read` | Lee los .md de workspec/context/ |
| `econative_plan` | Única tool de gestión del plan (design/start/close/status/archive) |
| `econative_plan_read` / `econative_plan_archive` | Helpers del ciclo del plan |
| `econative_save_preferences` | Guarda nombre, idioma y nivel técnico |
| `constante_*` | Constantes de laburo del usuario (se inyectan en cada request) |
| `econative_patch_rapido` | Registra patch rápido (solo Patcheador) |
| `econative_investigar` | Lanza el túnel de investigación (no bloqueante, via opencode run) |
| `econative_conocimiento_buscar` | Index barato: título + descripción corta (ahorro de tokens) |
| `econative_conocimiento_leer` | Lee el entry completo de conocimiento (key "domain/slug") |

### Tools locales (`.opencode/tools/`)

| Tool | Qué hace |
|---|---|
| `skill_catalog_search` | Busca en el catálogo AgentSkillExchange (con `sortBy`: stars/downloads) |
| `skill_intake_inspect` | Inspecciona una skill remota sin instalar (ficha completa, read-only) |
| `skill_install_external` | Instala una skill aprobada (transaccional, rollback) |
| `skill_validate_external` | Valida una skill instalada (checksums, read-only) |

---

## Túnel de conocimiento

- **Biblioteca:** `workspec/knowledge-library/` (del proyecto anfitrión) — `index.json` (metadata barata) + `<domain>/<slug>.md` (formato estándar: # título, ## Descripción corta, ## Resumen ejecutivo, #### secciones, ## Fuentes).
- **Flujo:** `econative_conocimiento_buscar` (barato) → si no está, `econative_investigar` (async, no bloqueante) → cuando termine, `econative_conocimiento_leer` (completo).
- **Sellado:** el túnel es la única vía de investigación persistente indexada. Nunca `task()` a `tunel-*`.
- **Guard anti-recursión:** el proceso lanzado lleva `OPENCODE_SUBAGENT=1`.

---

## Proveedor de skills externas

- **AgentSkillExchange** es la única fuente de catálogo (2,976 skills, multi-framework: Claude Code, Codex, MCP, Gemini, etc.).
- Catálogo: `https://raw.githubusercontent.com/agentskillexchange/skills/main/skills.json`
- Instalación: preserva todo el paquete upstream en `.opencode/skills/extern/<slug>/` + `crisol-eco.yaml` + bloque `## Crisol-Eco: integración`.
- Dependencias MCP/CLI no se instalan implícitamente: se aprueban como tareas explícitas.
- Flujo: Refiner analiza y formula → North planifica → Executor instala → Auditor verifica.

---

## Próximos Pasos

- [ ] Probar el pipeline completo de skills con una skill real de ASE (CD-4)
- [ ] Script start/stop del server de OpenCode (CD-5)
- [ ] Decidir bootstrap curl|bash (CD-6)
- [ ] Probar en runtime la continuidad North→Refiner→North con task_id

---

## Issues Conocidos

| ID | Descripción | Estado | Prioridad |
|---|---|---|---|
| CD-4 | Skill autoinstalable sin pulir (pipeline nunca probado con skill real) | Abierto | Media |
| CD-5 | Script start/stop del server sin crear | Abierto | Media |
| CD-6 | Decisión de bootstrap curl\|bash pendiente | Abierto | Baja |
