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
1. Cloná el crisol en una ubicación fija (una sola vez):
   `git clone https://github.com/PortalesCode/crisol-definitivo.git ~/crisol-definitivo`

2. Parate en la raíz de TU proyecto y ejecutá:
   `~/crisol-definitivo/install.sh`

El instalador detecta automáticamente el directorio actual y desembarca el ecosistema ahí. Sin necesidad de parámetros adicionales.

Opcional: para instalar en un directorio distinto, usá `--target <dir>`.

3. Si querés evitar preguntas interactivas, ejecutá con `--no-tools` (instala solo el ecosistema sin herramientas opcionales como uv/graphify/engram).

## Pasos detallados del instalador

1. Copiá o cloná el paquete `crisol-definitive` dentro del repo donde querés trabajar.
2. Ejecutá el instalador:

   ```bash
   ./install.sh
   ```

3. El instalador despliega `.opencode/` (agentes, skills, plugins), `workspec/` (context, planes, preferencias del usuario), `AGENTS.md` y `opencode.json` dentro del repo destino.
4. **Reiniciá OpenCode** para que skills, plugins y MCPs tomen efecto.

### Opciones de `install.sh`

| Opción | Qué hace |
|---|---|
| `--target <dir>` | **Opción avanzada**: Instala en otro directorio (default: el actual) |
| `--dry-run` | Muestra qué haría sin copiar nada |
| `--yes` | Instala uv, graphify y engram sin preguntar (si no están instalados) |
| `--no-tools` | Saltea la instalación de herramientas (no pregunta nada) |

> **Pasos 5/5 y 6/6 (uv + graphify + engram):** al final, el instalador pregunta si instalás `uv` (requisito del MCP `headroom`), `graphify` (herramienta opcional de grafo de conocimiento del código) y `engram` (memoria persistente global). Es interactivo `[s/N]`; usá `--yes` para aceptar la instalación de uv, graphify y engram sin preguntar o `--no-tools` para saltear las herramientas opcionales. No es bloqueante: el resto del ecosistema funciona igual.

## MCPs incluidos

Los 4 MCPs viajan en `opencode.json` y se activan al reiniciar OpenCode:

| MCP | Tipo | Qué hace |
|---|---|---|
| `sequential-thinking` | local (npx) | Razonamiento estructurado multi-paso para tareas complejas |
| `codegraph` | local (npx) | Grafo de conocimiento del código: símbolos, edges, blast radius |
| `headroom` | local (uvx) | Optimización de contexto LLM: recupera conocimiento relevante (requiere `uv`) |
| `context7` | remoto | Documentación de librerías bajo demanda |

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
│   ├── agents/       # Refiner, North, Boehmio, Realistic, Executor, Auditor
│   ├── skills/       # Skills nativas por dueño (north/, executor/, auditor/, refiner/)
│   └── plugins/      # Tools del ecosistema (econative_*)
├── workspec/
│   ├── context/      # PROJECT, ARCHITECTURE, CONVENTIONS, STATUS
│   ├── plans/        # Plan activo y archivados
│   ├── preferences-user/ # Preferencias del usuario (nombre, idioma)
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
- **El MCP `engram` NO viaja hardcodeado en el `opencode.json` del paquete** (viaja limpio: solo `sequential-thinking`, `codegraph`, `headroom` y `context7`). El `install.sh` decide con `setup_engram_mcp()`:
  - Si ya tenés el MCP `engram` en tu config **GLOBAL** de OpenCode (`~/.config/opencode/opencode.json` o `.jsonc`) → no toca nada (el global alcanza a todos los proyectos locales).
  - Si NO lo tenés en global → lo agrega al `opencode.json` **local** del proyecto destino, con **backup `.bak`** antes de escribir y **verificación post-escritura** (JSON válido + contiene `engram`, con rollback desde el backup si falla). Así el MCP queda disponible sin arriesgar tu config global.
- El instalador la propone como **Paso 6/6** (opcional, no bloqueante): detecta si ya está instalada, la instala si falta (o pregunta) y mergea su protocolo al `AGENTS.md` global de OpenCode (`~/.config/opencode/AGENTS.md`) con un merge sano por marcadores (`ENGRAM-MEMORY-START`). Solo llama a `setup_engram_mcp` (MCP local) cuando el binario `engram` quedó disponible.
- Si ya la usás, el instalador **no toca tu `AGENTS.md` global**: el merge es idempotente y solo agrega el bloque del protocolo si no lo tenés ya. Si no la tenés, podés instalarla después con `brew install gentleman-programming/tap/engram` o `go install github.com/Gentleman-Programming/engram/cmd/engram@latest`.
- Variables de entorno: `INSTALL_GRAPHIFY` e `INSTALL_ENGRAM` se pueden overridear (`ask` | `yes` | `no`) — útil para testing no invasivo (ej: `INSTALL_ENGRAM=no ./install.sh`).
