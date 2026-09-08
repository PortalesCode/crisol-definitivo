# STATUS-AGENTES

> **Referencia viva del ecosistema dev** — cómo está evolucionando el ecosistema (rondas, decisiones, issues CD-x).
> NO es el estado del trabajo del proyecto anfitrión (eso va en STATUS.md).

## Estado General

```
🔴 Sin definir     🟡 En construcción     🟢 Estable
```

**Estado actual:** 🟢 Estable — estructura limpia y coherente post-ronda 6 (túnel de investigación CD-7 implementado)

---

## Última Sesión

| Campo | Detalle |
|---|---|
| **Fecha** | 2026-09-08 |
| **Qué pasó** | Ronda 5: eliminación del MCP lfx-research y toda conexión con la biblioteca de conocimiento del ecosistema. Borrados `.opencode/mcp/lfx-research/`, `.opencode/knowledge-library/` y la skill `econative-lfx-research`. Limpiadas todas las referencias en AGENTS.md, Refiner.md, North.md, README.md, opencode.json, econative-inject-summary.ts y .gitignores. Refiner ahora investiga con websearch/webfetch/Context7 directo (sin biblioteca ni fallback). Decisión del usuario: el futuro motor de investigación será OpenCode puro con subagentes no bloqueantes (`opencode run`), no Langflow/LFX. |
| **Fecha** | 2026-09-08 (2a sesión) |
| **Qué pasó** | Ronda 6: implementación del motor de investigación CD-7 (túnel sellado). Creados 3 agentes ocultos (tunel-investigador primary, tunel-investigador-web, tunel-validador), plugin econative-conocimiento.ts con 3 tools (econative_investigar no bloqueante vía opencode run, econative_conocimiento_buscar barato, econative_conocimiento_leer), biblioteca movida a workspec/knowledge-library/. Agregados MCPs chrome-devtools y playwright al opencode.json (6 totales). langflow eliminado de la config global. Auditoría PASS. |
| **Decisiones** | Ver sección "Decisiones" abajo |


---

## Decisiones

1. **Cableado skill()**: ✅ RESTAURADO — todos los agentes instruyen cargar sus skills con `skill()`.
2. **context7 MCP**: ✅ CONFIGURADO y activo en definitive (viaja con el paquete, remoto).
3. **ARCHITECTURE.md**: ✅ Template completo de 51 líneas restaurado como referencia.
4. **Estructura del definitivo**: ✅ `.opencode/` + `workspec/` hermanas, `AGENTS.md` y `opencode.json` en raíz, `install.sh` para el despliegue (sin modo desembarco).
5. **README idioma**: ✅ RESUELTO — español (README.md creado con ruido de despliegue, AGENTS.md enfocado en el usuario).
6. **Rol Refiner/North**: ✅ DEFINIDO — Refiner entiende/refina la intención y formula la acción; North crea, descompone y administra el ciclo completo del plan (flujo: Refiner → triángulo → North → Executor → Auditor).
7. **Especialista-Bibliotecario**: ✅ ELIMINADO — la investigación la hereda Refiner (herramienta no bloqueante del entorno, tipo knowledge_search/knowledge_investigate; fallback websearch/webfetch).
8. **Sistema de domains**: ✅ ELIMINADO — plugins, carpeta y referencias limpiadas.
9. **sequential-thinking**: ✅ key MCP con nombre real (sin abreviar).
10. **Sistema de memorias del proyecto**: ✅ ELIMINADO — plugins `remember-it`/`remember-list`/`remember-show` y `stack-snapshot` borrados; `preferences-user` subió a `workspec/preferences-user/`; la carpeta de memorias fue eliminada (decisión del usuario). Documentación actualizada en AGENTS.md, README.md, .gitignore, install.sh y contextos.
11. **Matriz operativa de MCPs/tools**: ✅ PUBLICADA — uso de CodeGraph, Context7, Sequential Thinking, Headroom y Graphify por agente (commit f3872129).
12. **Separación STATUS.md / STATUS-AGENTES.md**: ✅ HECHA — STATUS.md documenta el proyecto anfitrión; STATUS-AGENTES.md es referencia viva del ecosistema dev.
13. **Engram**: ✅ DECISIÓN — NO se forkeará por ahora. Se mantiene el criterio de instalación condicional (install.sh lo agrega a opencode.json local solo si no está en config global). No se reportan problemas de Engram.
14. **lfx-research / biblioteca de conocimiento**: ✅ ELIMINADOS — el MCP `lfx-research` (Langflow/LFX), la biblioteca aislada (`.opencode/knowledge-library`, hoy en `workspec/knowledge-library/`) y la skill `econative-lfx-research` fueron borrados del árbol (queda en git history). Cero conexión con `~/biblioteca-conocimientos` ni n8n. Refiner investiga directo con `websearch`/`webfetch`/`Context7`. El futuro motor de investigación se decide en la siguiente ronda: **OpenCode puro + subagentes no bloqueantes con `opencode run`** (propuesta del usuario, pendiente de diseño).
15. **Túnel de investigación CD-7**: ✅ IMPLEMENTADO — motor OpenCode puro (sin Langflow/LFX): tool `econative_investigar` hace spawn no bloqueante de `opencode run --agent tunel-investigador` desde la raíz del repo (cwd=context.directory), con OPENCODE_SUBAGENT=1 (guard anti-recursión) y detached/unref. 3 agentes ocultos: tunel-investigador (orquestador, primary), tunel-investigador-web (investiga crudo), tunel-validador (QA con score/verdict/feedback, verifica URLs). Regla de oro: NUNCA task() a agentes del túnel — solo tools. Auditoría PASS.
16. **Biblioteca de conocimiento**: ✅ MOVIDA a `workspec/knowledge-library/` (era `.opencode/knowledge-library/`) — el conocimiento es del proyecto anfitrión, no del ecosistema. index.json (metadata barata: title + descripcion_corta) + template.md (formato estándar: ## metadata, #### secciones, ## Fuentes). Cero conexión con ~/biblioteca-conocimientos.
17. **MCPs del definitive**: ✅ 6 totales — sequential-thinking, codegraph, headroom, context7 + chrome-devtools + playwright (nuevos, los usa tunel-investigador-web para contenido dinámico). langflow ELIMINADO de la config global de OpenCode.


## Proveedor y ciclo de skills externas

El ecosistema **no mantiene un catálogo curado propio** de skills externas. El proveedor principal es **AgentSkillExchange**:

- Repositorio: <https://github.com/agentskillexchange/skills>
- Índice: <https://raw.githubusercontent.com/agentskillexchange/skills/main/skills.json>

El índice sirve para descubrir skills, mientras que la fuente upstream original declarada para cada skill se conserva como su origen de instalación. `skill-library`/PortalesCode no es una fuente operativa de skills externas; las referencias a PortalesCode en el README se limitan al repositorio del ecosistema.

Al instalar una skill de terceros, se preserva todo su contenido en `.opencode/skills/extern/<slug>/`, se agrega `crisol-eco.yaml` y se añade el bloque `## Crisol-Eco: integración`. Las dependencias MCP/CLI no se instalan implícitamente: el usuario debe aprobarlas como tareas explícitas.

Routing/refining: **Refiner** analiza y formula; **North** planifica; **Executor** instala; **Auditor** verifica.

---

## Próximos Pasos

- [ ] Probar el túnel de investigación en runtime con una investigación real (CD-7 implementado, falta prueba E2E)
- [ ] Pulir skill autoinstalable
- [ ] Script start/stop del server de OpenCode
- [ ] Decidir bootstrap curl|bash
- [ ] Probar en runtime la continuidad North→Refiner→North con task_id

---

## Issues Conocidos

| ID | Descripción | Estado | Prioridad |
|---|---|---|---|
| CD-4 | Skill autoinstalable sin pulir | Abierto | Media |
| CD-5 | Script start/stop del server sin crear | Abierto | Media |
| CD-6 | Decisión de bootstrap curl|bash pendiente | Abierto | Baja |
| CD-7 | Motor de investigación: ✅ IMPLEMENTADO (túnel sellado) — pendiente prueba E2E en runtime | Abierto (prueba) | Alta |
