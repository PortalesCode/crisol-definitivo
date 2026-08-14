# Crisol Definitive — Ecosystem

> Ecosistema de desarrollo autónomo para OpenCode.
> **Refiner** entiende y refina la intención del usuario, y formula la acción.
> **North** es el cerebro: crea y descompone el plan, y delega a sus manos.
> **Boehmio** abre la cabeza, **Realistic** baja a tierra, **Executor** ejecuta, **Auditor** verifica.
> **Portable por proyecto**: se instala con `install.sh`.
> Publicable, clonable, mantenible.

<!-- CRISOL-DEFINITIVE — ARCHIVO DEL ECOSISTEMA. NO MODIFICAR AUTOMÁTICAMENTE. -->

## 🧭 Ecosistema vs Proyecto

`.opencode/` y `workspec/` son **herramientas del ecosistema** para entender y trabajar el proyecto — no son el propósito del repo.

- El **propósito** es el código del proyecto anfitrión (el repo donde se instaló el ecosistema).
- No edites `.opencode/` ni `workspec/` como si fueran el proyecto: son infraestructura del ecosistema.
- Las **convenciones del proyecto** (git, naming, estilo de código) viven en `workspec/context/CONVENTIONS.md` y las define el equipo anfitrión — no el ecosistema.
- Las convenciones de los agentes viven acá (AGENTS.md) y en `.opencode/agents/`.

## ⚙️ Manifiesto del proyecto

Refiner actualiza esta sección automáticamente. Consultala para saber qué skills y MCPs están disponibles.

### Stack

| Tecnología | Propósito |
|---|---|
| OpenCode | Runtime de agentes |
| TypeScript | Plugins (tools) |
| Markdown | Skills, contexto |

### Skills externas

Skills de terceros o custom del proyecto. Viven en `.opencode/skills/extern/<nombre-de-la-skill>/SKILL.md`.

- _(sin skills externas instaladas)_

### Tools locales de conocimiento

Las tools locales viven en `.opencode/tools/` y se cargan como parte del ecosistema:

| Tool | Qué hace |
|---|---|
| `knowledge_search` | Consulta la biblioteca configurable mediante `KNOWLEDGE_LIBRARY_HOME` (default: `~/biblioteca-conocimientos`). Sin `target`, lista o busca entradas; con `target`, lee una entrada completa; `sections` limita las secciones devueltas. |
| `knowledge_investigate` | Investiga un tema nuevo mediante el webhook n8n configurable por `N8N_KNOWLEDGE_WEBHOOK_URL` (default: localhost). Es asíncrona/fire-and-forget y hace dedupe antes de encolar. |

La biblioteca de conocimiento y n8n son dependencias externas configurables: no se incluyen ni viajan con este repositorio. Si no están disponibles, Refiner debe informarlo y aplicar el fallback documentado (`websearch`/`webfetch`).

### Skills nativas

| Skill | Dueño | Propósito |
|---|---|---|
| `econative-architecture-review` | North | Evaluar arquitectura, componentes, límites, impacto, escalabilidad |
| `econative-skill-installer` | Refiner | Instalar skills externas bajo demanda |
| `econative-parallel-dispatch` | North | Detectar tareas independientes y lanzar Executors en paralelo |
| `econative-implement-safe` | Executor | Implementación segura (reglas, rollback) |
| `econative-debug-systematic` | Executor | Debugging metódico |
| `econative-test-and-validate` | Executor | Testing y validación |
| `econative-audit-review` | Auditor | Revisión estructurada |

### MCPs del proyecto

MCPs configurados en `opencode.json`. Todos viajan en el repo y toman efecto al reiniciar OpenCode.

- `sequential-thinking` (ecosistema) — razonamiento estructurado multi-paso solo para tareas complejas
- `codegraph` — grafo de conocimiento del código (símbolos, edges, blast radius); portable vía `npx`, sin instalación global
- `headroom` — optimización de contexto LLM (recupera conocimiento relevante); portable vía `uvx`, requiere `uv`
- `context7` — documentación de librerías bajo demanda (remoto)

> **codegraph** se ejecuta vía `npx -y @colbymchenry/codegraph` (portable, el runtime lo levanta sin instalación global — mismo patrón que `sequential-thinking`). El paquete npm `codegraph` sin scope NO es el real; el real es `@colbymchenry/codegraph@1.5.0`. Usa un índice `.codegraph/` opcional por proyecto, creado con `codegraph init`; sin índice, el agente usa sus tools nativas (Read/Grep/Glob) — no bloquea nada.

**Decisión de `codegraph init`:** Refiner lo propone al formular la acción (criterios: proyecto grande, módulos cruzados, necesidad de blast radius/call paths, trabajo de largo plazo). El usuario aprueba. North lo recibe como tarea de preparación. Executor lo ejecuta — única vía de init permitida. Auditor solo usa el índice existente. Nadie inicializa por cuenta propia.

> **graphify** no es un MCP en `opencode.json`: es una herramienta opcional (paquete PyPI `graphifyy`, CLI global) que se instala con el Paso 5/5 del `install.sh` (interactivo, `--yes`/`--no-tools`) o vía `uv tool install graphifyy`. Se integra como herramienta + skill (`graphify install --platform opencode`).

> **headroom** se ejecuta vía `uvx --from headroom-ai[mcp] headroom mcp serve` (portable, descarga bajo demanda a caché de uv, sin instalación global — mismo patrón que codegraph pero con uv en vez de npx). El npm `headroom-ai` no tiene binario (es librería); el real es el paquete PyPI `headroom-ai` con extra `mcp`. Requiere `uv` instalado — el install.sh Paso 5/5 lo instala si se acepta la instalación de herramientas.

#### Cómo decide usarlos el ecosistema

- North decide cuándo CodeGraph aporta símbolos, call paths y blast radius; si no hay índice `.codegraph/`, usa el fallback Read/Grep/Glob.
- Graphify es una herramienta opcional de grafo/visualización, no un MCP; se usa solo si está disponible y la tarea lo necesita.
- Headroom optimiza automáticamente el contexto vía `uvx`; requiere `uv` y no se configura manualmente durante una tarea.

#### Matriz operativa

| Agente | Uso de herramientas |
|---|---|
| Refiner | `knowledge_search`/`knowledge_investigate` y Context7 para investigar y precisar la acción. |
| North | Sequential Thinking solo para complejidad no obvia; decide CodeGraph y Graphify; Context7 para decisiones de APIs. |
| Executor | Context7 para implementar APIs; CodeGraph/Graphify cuando North lo indique o la tarea lo necesite. |
| Auditor | CodeGraph/Context7 para verificar; Graphify solo si aporta visualización. |
| Headroom | Automático vía MCP/`uvx`; ningún agente lo invoca manualmente. |

Context7 es documentación bajo demanda. Sequential Thinking no se usa por rutina. CodeGraph requiere un índice `.codegraph/` opcional y tiene fallback Read/Grep/Glob. Graphify no es MCP y los agentes no lo instalan por cuenta propia.

> **engram** NO viaja hardcodeado en el `opencode.json` del paquete (viaja limpio con los 4 MCPs de arriba). El `install.sh` lo agrega al `opencode.json` local del proyecto destino **solo si no lo tenés en tu config global de OpenCode** (`~/.config/opencode/opencode.json` o `.jsonc`) — así el MCP queda disponible sin duplicar y sin tocar la config global. El protocolo de memoria engram vive en `Agents-engram-memory/AGENTS.md` y se mergea al `~/.config/opencode/AGENTS.md` global.

### Links

- **Contexto del proyecto**: `workspec/context/`

---

## Agentes disponibles

| Agente | Modo | Rol |
|---|---|---|
| `Refiner` | primary | Puerta de entrada. Entiende, refina y clarifica la intención del user, coordina el análisis y formula la acción. Es la voz de North. |
| `North` | subagent | El cerebro. Recibe la acción formulada por Refiner, crea y descompone el plan, y delega. |
| `Boehmio` | subagent | Creativo. Analiza ideas, abre la cabeza. Lo consulta Refiner. |
| `Realistic` | subagent | Realista. Baja a tierra, valida, puntúa 1-10. Lo consulta Refiner. |
| `Executor` | subagent | La mano de North. Ejecuta. |
| `Auditor` | subagent | Verifica que lo ejecutado esté perfecto. |

### Filosofía

```
Refiner = entender, refinar la intención y formular la acción
North = el cerebro (crea, descompone y administra el plan; delega)
Boehmio / Realistic = análisis previo del triángulo
Executor = operación
Auditor = control
Context = estado del proyecto
Preferencias = configuración del usuario (nombre, idioma)
```

## Skills disponibles

### Nativas (`skills/native/`)

Son **patrones operativos** del ecosistema — definen *cómo trabajan los agentes*, no importa el rubro del proyecto. Cada skill tiene un dueño que la carga antes de actuar.

| Skill | Dueño | Propósito |
|---|---|---|
| `econative-architecture-review` | North | Revisar arquitectura y detectar riesgos |
| `econative-skill-installer` | Refiner | Instalar skills bajo demanda desde el repositorio remoto |
| `econative-parallel-dispatch` | North | Detectar independencia y lanzar ejecutores paralelos |
| `econative-implement-safe` | Executor | Implementación segura (reglas de edición, rollback) |
| `econative-debug-systematic` | Executor | Debugging metódico (6 pasos + antipatrones) |
| `econative-test-and-validate` | Executor | Testing y validación con comandos por lenguaje |
| `econative-audit-review` | Auditor | Revisión estructurada (6 dimensiones + informe) |

## Flujo de trabajo (nueva arquitectura)

1. **Refiner** recibe la intención del usuario, la entiende, la refina y formula la acción
2. Si la idea es grande/abierta → consulta el triángulo (**Boehmio** + **Realistic**)
3. Refiner presenta al usuario la opinión de ambos resumida; Realistic da el veredicto técnico (1-10); **Refiner da el veredicto final**
4. **El usuario decide** pasar a acción o descartar/ajustar
5. Solo si el usuario decide ejecutar → la acción formulada va a **North**
6. **North** es dueño operativo del ciclo completo: usa `econative_plan({ action: "design", intention, phases, tasks })` para descomponer la acción, marca `start` antes de cada trabajo, coordina **Executor/Auditor**, marca `close` al terminar cada tarea y usa `status` para revisar progreso.
7. North usa `econative_plan_read` cuando necesita leer el plan completo y `econative_plan_archive` al cerrar un plan completo. Son helpers legítimos del mismo ciclo del plan, no sistemas alternativos ni duplicados: `econative_plan` sigue siendo la única tool de mutación/gestión operativa; `econative_plan_read` y `econative_plan_archive` completan el ciclo.
8. North devuelve el resultado a Refiner, Refiner lo sintetiza al usuario

### Continuidad Refiner ↔ North

#### Flujo de urgencia (solo durante ejecución)

El refinamiento previo de Refiner es otro momento del flujo y no debe confundirse con esta escalada: allí Refiner investiga, consulta el triángulo, formula la acción y el usuario decide si ejecutarla. El Flujo de urgencia solo comienza después de esa aprobación, cuando North ya creó un plan activo y tiene una tarea `in_progress`.

```text
North bloqueado durante plan/tarea activa
  → North consulta a Refiner (sin question() al usuario)
  → Refiner intenta resolver con contexto
  → si no puede resolver responsablemente, usa question() con el usuario
  → Refiner retoma North con el task_id original
  → North continúa la misma tarea y cierra al finalizar
```

- **Refiner** debe entregar a North una acción técnica completa y cerrada.
- **Protocolo obligatorio:** `North bloqueado → Refiner intenta resolver → solo si no puede → Refiner usa question() con el usuario → Refiner retoma North con el task_id original`.
- **North** nunca usa `question()` con el usuario ni escala dudas rutinarias, preferencias menores o decisiones resolubles con contexto: solo consulta a Refiner ante un bloqueo concreto, técnico y realmente bloqueante. Mantiene el plan y la tarea en `in_progress` mientras consulta.
- **Refiner** es el primer nivel de resolución: intenta resolver con la acción original, conversación, contexto, plan, documentación y herramientas disponibles. El usuario es el último nivel; `question()` debe explicar la duda concreta y sus opciones.
- El `task_id` primario lo obtiene y conserva **Refiner** en la respuesta de su propio `task(North, ...)`. North puede repetirlo al escalar como confirmación, pero Refiner no depende de que North se lo pase.
- **Refiner** retoma la misma sesión de North con el `task_id` original; no crea una sesión nueva, no reinicia la tarea ni cierra/archiva el plan mientras la duda siga abierta.
- Si el runtime no permite retomar con el `task_id`, se conservan intención, plan, tarea `in_progress` y punto de bloqueo: no se declara terminado ni se crea una tarea desconectada.
- **North** continúa la sesión y la tarea originales, y solo las cierra al terminar.

### Lectura post-compactación

- Refiner puede leer el plan después de compactación si la conversación quedó en Refiner.
- North puede leerlo si la compactación ocurrió en North.
- Auditor puede leerlo cuando la revisión necesita contexto del plan.
- Executor no necesita administrar ni aprender el plan completo; recibe una tarea concreta.

## ⚖️ ¿Cuándo llamar al Auditor?

North decide según estas reglas:

| Situación | ¿Auditor? |
|---|---|
| Cambio trivial (typo, rename, 1 archivo, < 10 líneas) | ❌ No — directo |
| Feature nuevo o cambio en +3 archivos | ⚠️ A criterio de North |
| Cambia lógica crítica (auth, datos sensibles, core del negocio) | ✅ Sí, siempre |
| Múltiples Executors tocaron los mismos archivos | ✅ Sí — detectar conflictos |
| Código legacy sin tests | ⚠️ A criterio (North decide según impacto) |
| Usuario dice explícitamente "no hace falta revisión" | ❌ No |
| Antes de mergear a main o tag | ✅ Sí |
| Refactor grande (> 5 archivos o > 200 líneas tocadas) | ✅ Sí |
| El usuario pidió expresamente una revisión | ✅ Sí |
| North no está segura del resultado | ✅ Sí — mejor prevenir |

**Regla práctica:** Ante la duda, llamalo. Es más barato detectar un problema en revisión que arreglarlo en producción.

## Plugins disponibles (tools)

| Tool | Qué hace |
|---|---|
| `econative_start_session` | **Obligatorio** al inicio. Carga contexto, preferencias y plan; devuelve `onboarding_required`, `preferences`, `context`, `plan_created` y `plan`, y auto-crea `plan.md` si no existe. Para leer otro estado del proyecto, usá la tool correspondiente. |
| `econative_context_read` | Lee todos los .md de `workspec/context/` (PROJECT, CONVENTIONS, ARCHITECTURE, STATUS, etc). |
| `econative_plan` | **Única tool de mutación/gestión operativa** del plan. North la usa para `design`, `start`, `close`, `status` y `archive`. |
| `econative_plan_read` | Helper legítimo del mismo ciclo: consulta el plan activo completo (`workspec/plans/active/plan.md`) cuando el agente necesita leerlo; no es un sistema alternativo ni duplicado. |
| `econative_plan_archive` | Helper legítimo del mismo ciclo: archiva un plan completado a `workspec/plans/old/` con timestamp; no es un sistema alternativo ni duplicado. |
| `econative_save_preferences` | Guarda nombre e idioma del usuario en `workspec/preferences-user/`. |
| `constante_*` | Plugin de constantes de laburo: `constante_crear`, `constante_leer`, `constante_listar`, `constante_modificar`, `constante_desactivar` — reglas del usuario que se inyectan en cada request. Las gestiona Refiner. Archivo: `workspec/constante/contantes.md`. |

La estructura `.opencode/` también incluye la carpeta `.opencode/tools/` para las tools locales de conocimiento. Estas tools y sus dependencias externas no deben confundirse con los plugins del ecosistema.

> **Constantes de laburo:** las constantes ACTIVAS se inyectan en el system prompt de CADA request vía hook (inline, sin recarga). Refiner es el dueño operativo: cuando el usuario expresa una preferencia de trabajo ("no toques los servidores", "no ejecutes X"), la registra con `constante_crear`; `constante_leer` y `constante_listar` consultan; `constante_modificar` ajusta; `constante_desactivar` deja de aplicarla sin borrarla. El próximo request ya recibe el estado actualizado, sin recargar OpenCode.

## Tools nativas de OpenCode

| Tool | Para qué |
|---|---|
| `question()` | Refiner: onboarding o bloqueo imprescindible no resoluble; último recurso. North: no disponible (`question: deny`). |
| `sequential_thinking` | Razonamiento estructurado multi-paso, solo tareas complejas |

## Contexto

- `workspec/context/PROJECT.md` — qué es el proyecto anfitrión
- `workspec/context/ARCHITECTURE.md` — arquitectura del proyecto anfitrión
- `workspec/context/CONVENTIONS.md` — reglas del repo anfitrión
- `workspec/context/STATUS.md` — estado del TRABAJO del proyecto anfitrión
- `workspec/context/STATUS-AGENTES.md` — referencia viva del ecosistema dev (rondas, decisiones, issues CD-x). NO es el estado del anfitrión.

## Notas

- Los agentes se cargan desde `agents/`
- Las skills en `skills/native/`
- Los plugins en `plugins/`
- Las preferencias del usuario viven en `workspec/preferences-user/`
