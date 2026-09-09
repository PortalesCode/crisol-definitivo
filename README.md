# Crisol Definitive

Ecosistema portable de agentes para OpenCode. Trae agentes (Refiner, North, Boehmio, Realistic, Executor, Auditor), skills nativas, plugins y MCPs listos para usar en cualquier repo. Se instala dentro del repo destino con un solo comando y los agentes se enfocan en lo que querés, no en el ruido de despliegue.

## Requisitos

| Requisito | Obligatorio | Para qué |
|---|---|---|
| **Node / npm / npx** | Sí | Runtime de OpenCode y MCPs portables (`sequential-thinking`, `codegraph`) |
| **uv** | No (recomendado) | MCP `headroom` y herramienta `graphify` (Paso 5/5 del instalador) |

### Instalación del ecosistema

El ecosistema se instala en el directorio donde ejecutes el script (tu raíz de proyecto).

**Pasos:**
1. Parate en la raíz de TU proyecto y cloná:
   `git clone https://github.com/PortalesCode/crisol-definitivo.git`

2. Ejecutá el instalador:
   `crisol-definitivo/install.sh`

El instalador detecta automáticamente el directorio actual y desembarca el ecosistema ahí. Sin necesidad de parámetros adicionales.

3. El instalador desembarca todo (`.opencode/`, `workspec/`, `AGENTS.md`, `opencode.json`) y **se borra a sí mismo** (auto-limpieza) — no hace falta `rm -rf` a mano.

4. Escribí `opencode` y listo.

Opciones:
- `--target <dir>`: para instalar en un directorio distinto (default: el actual).
- `--no-tools`: evita preguntas interactivas (instala solo el ecosistema sin herramientas opcionales como uv/graphify/engram).
- `--keep-package`: conserva el paquete después de instalar (útil si querés reutilizarlo o clonar en una ubicación fija).

## Pasos detallados del instalador

1. Parate en la raíz de TU proyecto y cloná el paquete:

   ```bash
   git clone https://github.com/PortalesCode/crisol-definitivo.git
   ```

2. Ejecutá el instalador desde la raíz del proyecto:

   ```bash
   crisol-definitivo/install.sh
   ```

   Si ya estás en la raíz del proyecto, no hace falta `cd` — el instalador detecta el directorio actual y desembarca el ecosistema ahí.

3. El instalador despliega `.opencode/` (agentes, skills, plugins), `workspec/` (context, planes, preferencias del usuario), `AGENTS.md` y `opencode.json` dentro del repo destino.
4. **Auto-limpieza:** al terminar, el instalador **borra su propio directorio** (`crisol-definitivo/`) si fue clonado dentro del destino. No hace falta `rm -rf` a mano.
5. **Reiniciá OpenCode** para que skills, plugins y MCPs tomen efecto.

> **Nota:** si clonás en una ubicación fija (tipo `~/crisol-definitivo`, fuera del destino), el paquete **no** se borra solo. Usá `--keep-package` para conservarlo — útil si clonás en ubicación fija o querés reutilizarlo.

### Proveedor de skills externas

El ecosistema **no mantiene un catálogo curado propio** de skills externas. El proveedor principal es **AgentSkillExchange**:

- Repositorio: <https://github.com/agentskillexchange/skills>
- Índice: <https://raw.githubusercontent.com/agentskillexchange/skills/main/skills.json>

El índice orienta la búsqueda, pero la instalación conserva como origen la fuente upstream original declarada para cada skill. Las referencias a `PortalesCode` en este README corresponden únicamente al repositorio del ecosistema Crisol Definitive; no son una fuente operativa de skills externas y `skill-library` tampoco lo es.

Al incorporar una skill de terceros, se preserva todo su contenido en `.opencode/skills/extern/<slug>/`, sin eliminar archivos auxiliares, referencias ni scripts. Además, se agrega `crisol-eco.yaml` y el bloque `## Crisol-Eco: integración` con la metadata y el routing de integración.

Las dependencias MCP o CLI de una skill no se instalan implícitamente: el usuario debe aprobarlas como tareas explícitas antes de que Executor las instale.

El routing/refining del ciclo es: **Refiner** analiza y formula; **North** planifica; **Executor** instala; **Auditor** verifica.

#### Tools reales del ciclo

Las cuatro tools son locales del ecosistema (no MCP). AgentSkillExchange es el proveedor
HTTP/JSON. `skill_catalog_search` descubre candidatos (read-only, dueño Refiner);
`skill_intake_inspect` inspecciona sin instalar (read-only, dueño Refiner; North puede verificar);
`skill_install_external` instala de forma controlada (solo Executor, dentro de una tarea explícita
de North y con `approved: true`); `skill_validate_external` valida en modo read-only (Executor
como pre-check y Auditor después).

Flujo: Refiner produce ficha intake y acción, el usuario aprueba, North crea tareas separadas de
inspección final, dependencias aprobadas, instalación, declaración y validación, Executor
instala/valida y Auditor valida seguridad e integridad. MCP/CLI/packages quedan como
`pending_dependencies` hasta tareas explícitas aprobadas. Si install/upgrade devuelve
`restart_required: true`, la skill no está disponible en la sesión actual: el usuario humano debe
cerrar y volver a iniciar completamente el runtime/servidor OpenCode; nadie usa la skill nueva antes
del reinicio. Auditor marca como **warning** cualquier intento de usarla sin reinicio.

### Opciones de `install.sh`

| Opción | Qué hace |
|---|---|
| `--target <dir>` | **Opción avanzada**: Instala en otro directorio (default: el actual) |
| `--dry-run` | Muestra qué haría sin copiar nada |
| `--yes` | Instala uv, graphify y engram sin preguntar (si no están instalados) |
| `--no-tools` | Saltea la instalación de herramientas (no pregunta nada) |
| `--keep-package` | Conserva el paquete después de instalar (útil si clonás en ubicación fija o querés reutilizarlo) |

> **Pasos 5/5 y 6/6 (uv + graphify + engram):** al final, el instalador pregunta si instalás `uv` (requisito del MCP `headroom`), `graphify` (herramienta opcional de grafo de conocimiento del código) y `engram` (memoria persistente global). Es interactivo `[s/N]`; usá `--yes` para aceptar la instalación de uv, graphify y engram sin preguntar o `--no-tools` para saltear las herramientas opcionales. No es bloqueante: el resto del ecosistema funciona igual.

## MCPs incluidos

Los 6 MCPs viajan en `opencode.json` y se activan al reiniciar OpenCode:

| MCP | Tipo | Qué hace |
|---|---|---|
| `sequential-thinking` | local (npx) | Razonamiento estructurado multi-paso para tareas complejas |
| `codegraph` | local (npx) | Grafo de conocimiento del código: símbolos, edges, blast radius (`@colbymchenry/codegraph@1.5.0`) |
| `headroom` | local (uvx) | Optimización de contexto LLM: recupera conocimiento relevante (requiere `uv`; `headroom-ai[mcp]`) |
| `context7` | remoto | Documentación de librerías bajo demanda |
| `chrome-devtools` | local (npx) | Control de Chrome DevTools: navegación, snapshots, screenshots, red y consola (`chrome-devtools-mcp@latest`) |
| `playwright` | local (npx) | Automatización de navegador end-to-end: testear y validar UIs en el navegador real (`@playwright/mcp`) |

## Túnel de conocimiento

El ecosistema trae un **túnel de investigación sellado**: agentes ocultos que investigan y dejan conocimiento indexado, sin interferir con el ciclo visible (Refiner/North/Executor/Auditor).

- **3 tools visibles** (plugin `econative-conocimiento.ts`):
  - `econative_investigar` — lanza una investigación **no bloqueante**: dispara `opencode run --agent tunel-investigador "misión"` en background desde la raíz del repo y devuelve apenas arrancó. Acepta `topic` (1) o `topics: ["a", "b"]` — con varios topics lanza **UN solo** `opencode run` (el `tunel-investigador` los procesa en una sola sesión, evitando saturar CPU). El conocimiento queda disponible en ~5 min; es no bloqueante, no esperar activamente.
  - `econative_conocimiento_buscar` — busca en el índice (barato, solo metadata/resúmenes).
  - `econative_conocimiento_leer` — lee el contenido completo de un entry.
- **Regla de decisión:** Refiner pregunta **siempre** si la investigación es **permanente** (→ túnel `econative_investigar`) o solo una **respuesta rápida** (→ `websearch` directo). El túnel es para conocimiento que quedará indexado; una duda puntual no merece un spawn.
- **Biblioteca:** `workspec/knowledge-library/` — `index.json` + entries en formato estándar (`template.md`: descripción corta, resumen ejecutivo, secciones, fuentes).
- **Regla de sellado:** el túnel es sellado — nadie del ecosistema visible llama `task()` a los agentes ocultos (`tunel-investigador`, `tunel-validador`). La única puerta es la tool `econative_investigar`.

## Plugins incluidos

### Constantes de laburo (`econative-constantes.ts`)

Reglas de trabajo del usuario que el agente **nunca debe olvidar** (ej: "no tocar los servidores", "no ejecutar comandos destructivos"). Viven en un único archivo de datos: `workspec/constante/contantes.md`, con formato `## <id>: <título>` + `- estado: activa|inactiva` + `- detalle:`.

- **5 tools:** `constante_crear`, `constante_leer`, `constante_listar`, `constante_modificar`, `constante_desactivar`. Las gestiona **Refiner**.
- **Hook inline, sin recarga:** el hook `experimental.chat.system.transform` lee el archivo en CADA request e inyecta solo las constantes **activas** en el system prompt. Después de la recarga inicial del plugin (instalación), crear/modificar/desactivar una constante tiene efecto inmediato en el próximo request — no hace falta reiniciar OpenCode.
- **Dueño:** Refiner registra las preferencias de trabajo del usuario con `constante_crear`, las ajusta con `constante_modificar` y deja de aplicarlas con `constante_desactivar` (no se borran, quedan inactivas en el archivo).

Ejemplo mínimo de uso:

```ts
// Refiner, cuando el usuario expresa una preferencia de trabajo:
constante_crear({ titulo: "No tocar servidores", detalle: "No ejecutar comandos destructivos ni tocar los servidores de producción." })
// → queda const-001 activa y se inyecta en el system prompt de cada request, sin recargar.
```

## Estructura

> **Ecosistema vs proyecto:** `.opencode/` y `workspec/` son herramientas del ecosistema para entender y trabajar el proyecto — no son el propósito del repo. El propósito es el código del proyecto anfitrión. Las convenciones del proyecto (git, naming, estilo) las define el equipo anfitrión en `workspec/context/CONVENTIONS.md`.

```
crisol-definitive/
├── .opencode/
│   ├── agents/       # Refiner, North, Boehmio, Realistic, Executor, Auditor + agentes ocultos del túnel (tunel-*)
│   ├── skills/       # Skills nativas por dueño (north/, executor/, auditor/, refiner/)
│   ├── tools/        # Tools locales del ecosistema
│   ├── plugins/      # Tools del ecosistema (econative_*)
├── Agents-engram-memory/ # Protocolo engram (se mergea al AGENTS.md global)
├── workspec/
│   ├── knowledge-library/ # Biblioteca del túnel de conocimiento (index.json + entries)
│   ├── context/      # PROJECT, ARCHITECTURE, CONVENTIONS, STATUS
│   ├── plans/        # Plan activo y archivados
│   ├── preferences-user/ # Preferencias del usuario (nombre, idioma)
│   └── constante/    # Constantes de laburo del usuario (contantes.md)
├── AGENTS.md         # Cómo trabajan los agentes (lo lee OpenCode al inicio)
├── opencode.json     # Config: MCPs, subagent_depth
└── install.sh        # Instalador portable por proyecto
```

## Notas

- La instalación es idempotente: ejecutarla dos veces no rompe nada.
- `AGENTS.md` y `workspec/` existentes en el destino se conservan (no se pisan).
- `opencode.json` se mergea: agrega los MCPs del paquete sin tocar los del proyecto.
- Después de instalar, **reiniciá OpenCode** para que todo tome efecto.

### Engram (memoria persistente global)

- **Engram** es una herramienta de **memoria persistente global** (binario Go standalone, repo `Gentleman-Programming/engram`) útil para **cualquier agente MCP**, no solo este ecosistema. Guarda decisiones, bugs y descubrimientos (SQLite + FTS5) entre sesiones. Se instala globalmente (no en el repo), igual que `uv`/`graphify` — solo `engram`, sin `gentle-ai`.
- **El MCP `engram` NO viaja hardcodeado en el `opencode.json` del paquete** (viaja limpio: solo `sequential-thinking`, `codegraph`, `headroom`, `context7`, `chrome-devtools` y `playwright`). El `install.sh` decide con `setup_engram_mcp()`:
  - Si ya tenés el MCP `engram` en tu config **GLOBAL** de OpenCode (`~/.config/opencode/opencode.json` o `.jsonc`) → no toca nada (el global alcanza a todos los proyectos locales).
  - Si NO lo tenés en global → lo agrega al `opencode.json` **local** del proyecto destino, con **backup `.bak`** antes de escribir y **verificación post-escritura** (JSON válido + contiene `engram`, con rollback desde el backup si falla). Así el MCP queda disponible sin arriesgar tu config global.
- El instalador la propone como **Paso 6/6** (opcional, no bloqueante): detecta si ya está instalada, la instala si falta (o pregunta) y mergea su protocolo al `AGENTS.md` global de OpenCode (`~/.config/opencode/AGENTS.md`) con un merge sano por marcadores (`ENGRAM-MEMORY-START`). Solo llama a `setup_engram_mcp` (MCP local) cuando el binario `engram` quedó disponible.
- Si ya la usás, el instalador **no toca tu `AGENTS.md` global**: el merge es idempotente y solo agrega el bloque del protocolo si no lo tenés ya. Si no la tenés, podés instalarla después con `brew install gentleman-programming/tap/engram` o `go install github.com/Gentleman-Programming/engram/cmd/engram@latest`.
- Variables de entorno: `INSTALL_GRAPHIFY` e `INSTALL_ENGRAM` se pueden overridear (`ask` | `yes` | `no`) — útil para testing no invasivo (ej: `INSTALL_ENGRAM=no crisol-definitivo/install.sh`).
