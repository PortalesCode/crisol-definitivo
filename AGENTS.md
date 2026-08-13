# Crisol Definitive — Ecosystem

> Ecosistema de desarrollo autónomo para OpenCode.
> **Refiner** entiende la intención del usuario, la clarifica y crea el plan.
> **North** es el cerebro: serializa el plan y delega a sus manos.
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

Skills de terceros o custom del proyecto. Viven en `.opencode/skills/extern/<nombre-de-la-skill>/Skill.md`.

- _(sin skills externas instaladas)_

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

> **graphify** no es un MCP en `opencode.json`: es una herramienta opcional (paquete PyPI `graphifyy`, CLI global) que se instala con el Paso 5/5 del `install.sh` (interactivo, `--yes`/`--no-tools`) o vía `uv tool install graphifyy`. Se integra como herramienta + skill (`graphify install --platform opencode`).

> **headroom** se ejecuta vía `uvx --from headroom-ai[mcp] headroom mcp serve` (portable, descarga bajo demanda a caché de uv, sin instalación global — mismo patrón que codegraph pero con uv en vez de npx). El npm `headroom-ai` no tiene binario (es librería); el real es el paquete PyPI `headroom-ai` con extra `mcp`. Requiere `uv` instalado — el install.sh Paso 5/5 lo instala si se acepta la instalación de herramientas.

> **engram** NO viaja hardcodeado en el `opencode.json` del paquete (viaja limpio con los 4 MCPs de arriba). El `install.sh` lo agrega al `opencode.json` local del proyecto destino **solo si no lo tenés en tu config global de OpenCode** (`~/.config/opencode/opencode.json` o `.jsonc`) — así el MCP queda disponible sin duplicar y sin tocar la config global. El protocolo de memoria engram vive en `Agents-engram-memory/AGENTS.md` y se mergea al `~/.config/opencode/AGENTS.md` global.

### Links

- **Contexto del proyecto**: `workspec/context/`

---

## Agentes disponibles

| Agente | Modo | Rol |
|---|---|---|
| `Refiner` | primary | Puerta de entrada. Entiende, refina, clarifica la intención del user, coordina el análisis y crea el plan. Es la voz de North. |
| `North` | subagent | El cerebro. Recibe la intención pulida de Refiner, la serializa en plan y delega. |
| `Boehmio` | subagent | Creativo. Analiza ideas, abre la cabeza. Lo consulta Refiner. |
| `Realistic` | subagent | Realista. Baja a tierra, valida, puntúa 1-10. Lo consulta Refiner. |
| `Executor` | subagent | La mano de North. Ejecuta. |
| `Auditor` | subagent | Verifica que lo ejecutado esté perfecto. |

### Filosofía

```
Refiner = entender, clarificar la intención y crear el plan
North = el cerebro (serializa el plan y delega)
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

1. **Refiner** recibe la intención del usuario
2. Si la idea es grande/abierta → consulta el triángulo (**Boehmio** + **Realistic**)
3. Refiner presenta al usuario la opinión de ambos resumida; Realistic da el veredicto técnico (1-10); **Refiner da el veredicto final**
4. **El usuario decide** pasar a acción o descartar/ajustar
5. Solo si el usuario decide ejecutar → la intención pulida va a **North**
6. **North** (el cerebro) la serializa en plan y delega: **Executor** → **Auditor**
7. North devuelve el resultado a Refiner, Refiner lo sintetiza al usuario

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
| `econative_start_session` | **Obligatorio** al inicio. Carga contexto, plan y prefs; auto-crea `plan.md` si no existe. |
| `econative_context_read` | Lee todos los .md de `workspec/context/` (PROJECT, CONVENTIONS, ARCHITECTURE, STATUS, etc). |
| `econative_plan` | **Tool única** para gestionar el plan. Acciones: `design`, `start`, `close`, `status`, `archive`. |
| `econative_plan_read` | Consulta el plan activo (`workspec/plans/active/plan.md`). |
| `econative_plan_archive` | Helper: archiva plan completado a `workspec/plans/old/` con timestamp. |
| `econative_save_preferences` | Guarda nombre e idioma del usuario en `workspec/preferences-user/`. |
| `constante_*` | Plugin de constantes de laburo: `constante_crear`, `constante_leer`, `constante_listar`, `constante_modificar`, `constante_desactivar` — reglas del usuario que se inyectan en cada request. Las gestiona Refiner. Archivo: `workspec/constante/contantes.md`. |

> **Constantes de laburo:** las constantes ACTIVAS se inyectan en el system prompt de CADA request vía hook (inline, sin recarga). El dueño es Refiner: cuando el usuario expresa una preferencia de trabajo ("no toques los servidores", "no ejecutes X"), Refiner la registra con `constante_crear`; para ajustar usa `constante_modificar`; para dejar de aplicar usa `constante_desactivar` (no se borra).

## Tools nativas de OpenCode

| Tool | Para qué |
|---|---|
| `question()` | Preguntar al user con opciones o texto libre |
| `sequential_thinking` | Razonamiento estructurado multi-paso, solo tareas complejas |

## Contexto

- `workspec/context/PROJECT.md` — qué es el proyecto
- `workspec/context/ARCHITECTURE.md` — arquitectura
- `workspec/context/CONVENTIONS.md` — reglas
- `workspec/context/STATUS.md` — estado/issue

## Notas

- Los agentes se cargan desde `agents/`
- Las skills en `skills/native/`
- Los plugins en `plugins/`
- Las preferencias del usuario viven en `workspec/preferences-user/`
