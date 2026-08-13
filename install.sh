#!/usr/bin/env bash
# =============================================================================
# install.sh — Instalador del ecosistema portable "crisol-definitive"
#
# Este script hace el "desembarco": copia el ecosistema (agentes, skills,
# plugins, workspec, AGENTS.md, opencode.json) al repo donde se ejecuta.
# Reemplaza el antiguo modo desembarco que hacía econative_start_session
# (que ya NO desembarca nada).
# Paso 5/5: instala uv (requisito del MCP headroom) y graphify (CLI global opcional,
# no bloqueante) si el usuario los acepta. uv va primero porque headroom lo necesita.
# Paso 6/6: instala engram (memoria persistente global, opcional, no bloqueante),
# mergea su protocolo al AGENTS.md global de OpenCode y agrega el MCP engram al
# opencode.json local solo si no está en la config global.
#
# Uso:
#   ./install.sh                 # instala en el directorio actual
#   ./install.sh --target <dir>  # instala en <dir>
#   ./install.sh --dry-run       # muestra qué haría sin copiar
#
# Es idempotente: ejecutarlo dos veces no rompe nada.
# =============================================================================
set -euo pipefail

# --- Directorios -------------------------------------------------------------
# SCRIPT_DIR: donde vive este install.sh (el paquete). Funciona desde cualquier lugar.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# TARGET: destino por defecto = directorio actual. Se puede overridear con --target.
TARGET="$(pwd -P)"
DRY_RUN=false

# --- Estado de instalación de herramientas (default: preguntar) --------------
# Instala uv (requisito del MCP headroom) y graphify (CLI opcional).
# ask = pregunta si falta alguna globalmente | yes = instala sin preguntar | no = saltea
INSTALL_GRAPHIFY="${INSTALL_GRAPHIFY:-ask}"

# Instala engram (memoria persistente global, opcional) y mergea su protocolo
# en ~/.config/opencode/AGENTS.md. ask = pregunta si falta | yes = instala | no = saltea
INSTALL_ENGRAM="${INSTALL_ENGRAM:-ask}"

# --- Salida con colores (solo si stdout es una terminal) ---------------------
if [ -t 1 ]; then
  C_BOLD=$'\033[1m'
  C_GREEN=$'\033[32m'
  C_YELLOW=$'\033[33m'
  C_RED=$'\033[31m'
  C_RESET=$'\033[0m'
else
  C_BOLD=""; C_GREEN=""; C_YELLOW=""; C_RED=""; C_RESET=""
fi

info()  { printf '%s\n' "${C_GREEN}==>${C_RESET} $*"; }
ok()    { printf '%s\n' "  ${C_GREEN}✓${C_RESET} $*"; }
warn()  { printf '%s\n' "  ${C_YELLOW}aviso:${C_RESET} $*"; }
error() { printf '%s\n' "  ${C_RED}error:${C_RESET} $*" >&2; }
dry()   { printf '%s\n' "  [dry-run] $*"; }

usage() {
  cat <<'EOF'
Uso: ./install.sh [--target <directorio>] [--dry-run]

Instala el ecosistema portable "crisol-definitive" en el repo destino:
  - .opencode/  (agentes, skills, plugins)   → copia completa (merge)
  - workspec/   (context, plans, preferences-user, ...) → solo archivos faltantes
  - AGENTS.md                                → solo si no existe en el destino
  - opencode.json                            → merge (sección mcp)

Opciones:
  --target <dir>   Directorio destino (default: directorio actual)
  --dry-run        Solo muestra qué haría, sin copiar nada
  --yes            Instala uv, graphify y engram sin preguntar (si no están instalados)
  --no-tools       Saltea la instalación de herramientas (no pregunta nada)
  -h, --help       Muestra esta ayuda
EOF
}

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --target)
        if [ $# -lt 2 ]; then
          error "Falta el directorio para --target"
          usage
          exit 1
        fi
        TARGET="$2"
        shift 2
        ;;
      --target=*)
        TARGET="${1#*=}"
        shift
        ;;
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      --yes)
        INSTALL_GRAPHIFY="yes"
        INSTALL_ENGRAM="yes"
        shift
        ;;
      --no-tools)
        INSTALL_GRAPHIFY="no"
        INSTALL_ENGRAM="no"
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        error "Argumento desconocido: $1"
        usage
        exit 1
        ;;
    esac
  done
}

resolve_target() {
  # Normaliza TARGET a ruta absoluta (no requiere que exista todavía)
  case "$TARGET" in
    /*) ;;
    *) TARGET="$(pwd -P)/$TARGET" ;;
  esac
  # Resuelve ".." y symlinks del padre si ya existe (para comparaciones correctas)
  local parent
  parent="$(dirname "$TARGET")"
  if [ -d "$parent" ]; then
    TARGET="$(cd "$parent" && pwd -P)/$(basename "$TARGET")"
  fi
}

verify_package() {
  if [ ! -d "$SCRIPT_DIR/.opencode" ]; then
    error "El paquete no tiene .opencode/ (¿$SCRIPT_DIR es el directorio del crisol?)"
    exit 1
  fi
  if [ ! -d "$SCRIPT_DIR/workspec" ]; then
    error "El paquete no tiene workspec/ (¿$SCRIPT_DIR es el directorio del crisol?)"
    exit 1
  fi
}

check_requirements() {
  local missing=0
  if ! command -v node >/dev/null 2>&1; then
    error "node no está instalado. Instalalo desde https://nodejs.org y volvé a ejecutar."
    missing=1
  fi
  if ! command -v npm >/dev/null 2>&1; then
    warn "npm no encontrado. No es bloqueante, pero algunos plugins pueden requerirlo."
  fi
  if ! command -v npx >/dev/null 2>&1; then
    warn "npx no encontrado. No es bloqueante, pero algunos plugins pueden requerirlo."
  fi
  return "$missing"
}

# --- Copias ------------------------------------------------------------------
copy_tree() {
  # Copia completa (merge): sobrescribe archivos con el mismo nombre,
  # NO borra archivos que existen solo en el destino.
  local src="$1" dst="$2"
  mkdir -p "$dst"
  cp -R "$src/." "$dst/"
}

copy_missing() {
  # Copia solo los archivos que faltan en el destino; nunca pisa existentes.
  local src="$1" dst="$2"
  mkdir -p "$dst"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --ignore-existing "$src/" "$dst/"
  else
    cp -R -n "$src/." "$dst/"
  fi
}

# --- Merge de opencode.json --------------------------------------------------
# deep_merge_json <json-del-paquete> <json-del-proyecto>
#   - Mergea el JSON del paquete DENTRO del del proyecto (nunca al revés).
#   - Sección "mcp": agrega los MCPs del paquete que no existan en el proyecto;
#     NO borra ni pisa los MCPs del proyecto.
#   - Otras claves top-level: solo se agregan si no existen en el proyecto.
#   - Prefiere node; fallback a python3; si no hay ninguno, deja el archivo
#     del proyecto intacto y avisa (merge manual).
#   - Escribe el resultado en el archivo del proyecto.
deep_merge_json() {
  local pkg_file="$1" target_file="$2"

  if command -v node >/dev/null 2>&1; then
    node - "$pkg_file" "$target_file" <<'NODE_EOF'
'use strict';
const fs = require('fs');
const [pkgPath, targetPath] = process.argv.slice(2);

let pkg, target;
try {
  pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
} catch (e) {
  console.error(`[error] opencode.json del paquete no es JSON válido: ${e.message}`);
  process.exit(2);
}
try {
  target = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
} catch (e) {
  console.error(`[error] opencode.json del proyecto no es JSON válido: ${e.message}`);
  process.exit(2);
}

const out = { ...target };
out.mcp = { ...(target.mcp || {}) };
let added = 0;

for (const key of Object.keys(pkg)) {
  if (key === 'mcp') {
    for (const mcpKey of Object.keys(pkg.mcp || {})) {
      if (!(mcpKey in out.mcp)) {
        out.mcp[mcpKey] = pkg.mcp[mcpKey];
        added++;
      }
    }
  } else if (!(key in out)) {
    out[key] = pkg[key];
  }
}

fs.writeFileSync(targetPath, JSON.stringify(out, null, 2) + '\n');
console.log(`  [merge] opencode.json: ${added} MCP(s) del paquete agregados`);
NODE_EOF
    return $?

  elif command -v python3 >/dev/null 2>&1; then
    python3 - "$pkg_file" "$target_file" <<'PY_EOF'
import json
import sys

pkg_path, target_path = sys.argv[1], sys.argv[2]

with open(pkg_path, encoding='utf-8') as f:
    pkg = json.load(f)
with open(target_path, encoding='utf-8') as f:
    target = json.load(f)

out = dict(target)
out.setdefault('mcp', {})
added = 0

for key, value in pkg.items():
    if key == 'mcp':
        for mcp_key, mcp_val in (pkg.get('mcp') or {}).items():
            if mcp_key not in out['mcp']:
                out['mcp'][mcp_key] = mcp_val
                added += 1
    elif key not in out:
        out[key] = value

with open(target_path, 'w', encoding='utf-8') as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
    f.write('\n')
print(f'  [merge] opencode.json: {added} MCP(s) del paquete agregados')
PY_EOF
    return $?

  else
    warn "No hay node ni python3 disponibles; opencode.json NO se mergeó automáticamente."
    warn "Merge manual: agregá los MCPs de $pkg_file a $target_file."
    return 1
  fi
}

# --- Herramientas externas opcionales (uv + graphify) ------------------------
# uv es requisito del ecosistema: el MCP headroom (declarado en opencode.json)
# se ejecuta vía `uvx`, así que necesita uv en el PATH del runtime de OpenCode.
# graphify es un CLI global (paquete PyPI "graphifyy") que se instala UNA vez
# con uv (binario estático; no requiere python en el sistema, no toca el repo).
# Se instalan una sola vez; si ya existen globalmente, no hacen nada.
# Si no existen, se pregunta antes de tocar el sistema.

install_uv() {
  if command -v uv >/dev/null 2>&1; then
    ok "uv ya instalado"
    return 0
  fi
  if ! command -v curl >/dev/null 2>&1; then
    warn "curl no encontrado; no puedo instalar uv automáticamente."
    warn "Instalalo manualmente:  curl -LsSf https://astral.sh/uv/install.sh | sh"
    return 1
  fi
  info "Instalando uv (gestor de herramientas Python)..."
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="$HOME/.local/bin:$PATH"   # uv no está en PATH de esta sesión todavía
  if command -v uv >/dev/null 2>&1; then
    ok "uv instalado"
  else
    return 1
  fi
}

install_graphify() {
  if command -v graphify >/dev/null 2>&1; then
    ok "graphify ya instalado globalmente"
    return 0
  fi
  install_uv || return 1
  info "Instalando graphify (uv tool install graphifyy)..."
  uv tool install graphifyy
  export PATH="$HOME/.local/bin:$PATH"
  if command -v graphify >/dev/null 2>&1; then
    ok "graphify instalado: $(command -v graphify)"
  else
    warn "graphify instalado pero no está en el PATH de esta sesión."
    warn "Abrí una terminal nueva o ejecutá:  uv tool update-shell"
  fi
}

# --- Engram (memoria persistente global, opcional) ---------------------------
# Engram es un binario Go standalone (repo Gentleman-Programming/engram) que da
# memoria persistente al agente (SQLite + FTS5) vía MCP. Se instala GLOBALMENTE
# (no en el repo), igual que uv/graphify. Es útil para CUALQUIER agente MCP, no
# solo para este ecosistema. Se instala solo engram (sin gentle-ai).

install_engram() {
  if command -v engram >/dev/null 2>&1; then
    ok "engram ya instalado: $(engram --version 2>/dev/null || echo 'presente')"
    return 0
  fi
  # Preferir go install (binario de tu máquina, sin antivirus false positives);
  # fallback a brew en macOS/Linux.
  if command -v go >/dev/null 2>&1; then
    info "Instalando engram (go install)..."
    go install github.com/Gentleman-Programming/engram/cmd/engram@latest
    local gobin; gobin="$(go env GOPATH)/bin"
    if [ -x "$gobin/engram" ]; then
      export PATH="$gobin:$PATH"
      ok "engram instalado: $gobin/engram"
      return 0
    fi
    warn "go install no dejó engram en el PATH; probando brew..."
  fi
  if command -v brew >/dev/null 2>&1; then
    info "Instalando engram (brew tap gentleman-programming/tap)..."
    brew tap gentleman-programming/tap 2>/dev/null || true
    brew install gentleman-programming/tap/engram
    if command -v engram >/dev/null 2>&1; then
      ok "engram instalado: $(command -v engram)"
      return 0
    fi
  fi
  warn "No se pudo instalar engram automáticamente. Manual:"
  warn "  brew install gentleman-programming/tap/engram   (o)   go install github.com/Gentleman-Programming/engram/cmd/engram@latest"
  return 1
}

merge_engram_agents() {
  # Merge sano del protocolo engram en el AGENTS.md global de OpenCode.
  # Nunca pisa el AGENTS.md del usuario: si ya tiene el bloque (marcador),
  # no hace nada (idempotente); si no, hace append del bloque al final.
  local pkg_agents="$SCRIPT_DIR/Agents-engram-memory/AGENTS.md"
  local global_dir="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
  local global_agents="$global_dir/AGENTS.md"

  if [ ! -f "$pkg_agents" ]; then
    warn "Agents-engram-memory/AGENTS.md no está en el paquete; no se mergea el protocolo"
    return 0
  fi
  if [ ! -d "$global_dir" ]; then
    info "Creando $global_dir (config global de OpenCode)..."
    mkdir -p "$global_dir"
  fi
  # Idempotente por marcador O por contenido: si el global ya trae el protocolo
  # (aunque sea de otra fuente, sin el marcador), no duplicar.
  if [ -f "$global_agents" ] && { grep -q "ENGRAM-MEMORY-START" "$global_agents" 2>/dev/null || grep -q "engram_mem_save" "$global_agents" 2>/dev/null; }; then
    if grep -q "ENGRAM-MEMORY-START" "$global_agents" 2>/dev/null; then
      ok "AGENTS.md global ya tiene el protocolo engram (no se toca)"
    else
      ok "AGENTS.md global ya tiene el protocolo engram (detectado por contenido)"
    fi
    return 0
  fi
  if [ ! -f "$global_agents" ]; then
    if ! cp "$pkg_agents" "$global_agents" 2>/dev/null; then
      warn "No se pudo crear $global_agents (¿permisos?); el protocolo engram no se mergeó"
      return 1
    fi
    ok "AGENTS.md global creado con protocolo engram: $global_agents"
  else
    # Merge sano: append al final, conservando todo lo que el usuario ya tenía
    if ! { printf '\n\n' >> "$global_agents" && cat "$pkg_agents" >> "$global_agents"; } 2>/dev/null; then
      warn "No se pudo escribir en $global_agents (¿permisos?); el protocolo engram no se mergeó"
      return 1
    fi
    ok "Protocolo engram agregado al final de $global_agents (tu contenido se conservó)"
  fi
}

merge_engram_mcp_local() {
  # Merge del bloque MCP engram bajo "mcp" en un opencode.json local
  # (lo crea desde cero si no existe). Prefiere node; fallback a python3;
  # si no hay ninguno, avisa (merge manual). Si el archivo existente no es
  # JSON válido, sale con error SIN escribir nada.
  local target_file="$1"

  if command -v node >/dev/null 2>&1; then
    node - "$target_file" <<'NODE_EOF'
'use strict';
const fs = require('fs');
const [targetPath] = process.argv.slice(2);

const ENGRAM_MCP = {
  type: 'local',
  enabled: true,
  command: ['engram', 'mcp', '--tools=agent'],
};

let target = {};
try {
  if (fs.existsSync(targetPath)) {
    target = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  }
} catch (e) {
  console.error(`[error] opencode.json local no es JSON válido: ${e.message}`);
  process.exit(2);
}

const out = { ...target };
out.mcp = { ...(out.mcp || {}) };
if (!out.mcp.engram) {
  out.mcp.engram = ENGRAM_MCP;
}

fs.writeFileSync(targetPath, JSON.stringify(out, null, 2) + '\n');
console.log('  [merge] MCP engram agregado al opencode.json local');
NODE_EOF
    return $?

  elif command -v python3 >/dev/null 2>&1; then
    python3 - "$target_file" <<'PY_EOF'
import json
import os
import sys

target_path = sys.argv[1]

ENGRAM_MCP = {
    'type': 'local',
    'enabled': True,
    'command': ['engram', 'mcp', '--tools=agent'],
}

target = {}
if os.path.exists(target_path):
    with open(target_path, encoding='utf-8') as f:
        target = json.load(f)

out = dict(target)
out.setdefault('mcp', {})
if 'engram' not in out['mcp']:
    out['mcp']['engram'] = ENGRAM_MCP

with open(target_path, 'w', encoding='utf-8') as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
    f.write('\n')
print('  [merge] MCP engram agregado al opencode.json local')
PY_EOF
    return $?

  else
    warn "No hay node ni python3; agregá el MCP engram manualmente"
    return 1
  fi
}

setup_engram_mcp() {
  # Garantiza que el MCP engram quede disponible en el opencode.json LOCAL
  # del proyecto destino, pero SOLO si no está en la config GLOBAL de OpenCode
  # (global alcanza local, verificado por el usuario). Nunca toca el global.
  local target_dir="$1"
  local global_dir="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
  local local_json="$target_dir/opencode.json"
  local had_local=false

  # Paso 1 — Si el MCP engram ya está en la config GLOBAL, no tocar nada.
  # Se chequea con [ -f ] por archivo (no ls con glob, que falla con pipefail).
  if [ -f "$global_dir/opencode.json" ] && grep -q '"engram"' "$global_dir/opencode.json" 2>/dev/null; then
    ok "engram MCP ya está en la config global de OpenCode; no se duplica en el local"
    return 0
  fi
  if [ -f "$global_dir/opencode.jsonc" ] && grep -q '"engram"' "$global_dir/opencode.jsonc" 2>/dev/null; then
    ok "engram MCP ya está en la config global de OpenCode; no se duplica en el local"
    return 0
  fi

  # Paso 2 — Si el local ya tiene engram, no duplicar (idempotente)
  if [ -f "$local_json" ] && grep -q '"engram"' "$local_json" 2>/dev/null; then
    ok "engram MCP ya está en el opencode.json local"
    return 0
  fi

  # Paso 3 — Dry-run: no escribir nada
  if $DRY_RUN; then
    dry "Agregaría MCP engram al opencode.json local (no está en tu config global)"
    return 0
  fi

  # Paso 4 — Backup del opencode.json local antes de tocarlo
  if [ -f "$local_json" ]; then
    if cp "$local_json" "$local_json.bak"; then
      had_local=true
    else
      warn "No se pudo crear el backup de $local_json; no se modifica el opencode.json local"
      return 1
    fi
  fi

  # Paso 5 — Escribir (merge del bloque engram bajo "mcp")
  if ! merge_engram_mcp_local "$local_json"; then
    warn "No se agregó el MCP engram al opencode.json local."
    if $had_local && [ -f "$local_json.bak" ]; then
      if mv "$local_json.bak" "$local_json"; then
        warn "Se restauró el opencode.json original desde el backup."
      else
        warn "No se pudo restaurar $local_json desde $local_json.bak"
      fi
    elif ! $had_local && [ -f "$local_json" ]; then
      rm -f "$local_json"
      warn "Se eliminó el opencode.json creado (no se pudo completar el merge)."
    fi
    return 1
  fi

  # Paso 6 — Verificación post-escritura: JSON válido y contiene "engram"
  local verified=false
  if command -v node >/dev/null 2>&1; then
    node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.exit(j&&j.mcp&&j.mcp.engram?0:1)' "$local_json" 2>/dev/null && verified=true
  elif command -v python3 >/dev/null 2>&1; then
    python3 -c 'import json,sys;j=json.load(open(sys.argv[1],encoding="utf-8"));sys.exit(0 if j and j.get("mcp") and j["mcp"].get("engram") else 1)' "$local_json" 2>/dev/null && verified=true
  elif grep -q '"engram"' "$local_json" 2>/dev/null; then
    verified=true
  fi

  if $verified; then
    ok "engram MCP agregado al opencode.json local"
    return 0
  fi

  error "La verificación del opencode.json local falló tras agregar el MCP engram."
  if $had_local && [ -f "$local_json.bak" ]; then
    if mv "$local_json.bak" "$local_json"; then
      warn "Se restauró el opencode.json original desde el backup."
    else
      warn "No se pudo restaurar $local_json desde $local_json.bak"
    fi
  elif ! $had_local; then
    rm -f "$local_json"
    warn "Se eliminó el opencode.json creado (la verificación falló)."
  fi
  return 1
}

# --- Flujo principal ---------------------------------------------------------
main() {
  parse_args "$@"
  resolve_target

  echo
  info "Instalador del ecosistema portable 'crisol-definitive'"
  info "  Paquete: $SCRIPT_DIR"
  info "  Destino: $TARGET"
  if $DRY_RUN; then
    info "  Modo   : dry-run (no se copia nada)"
  fi

  # No instalar dentro del propio paquete: no tiene sentido y rompería las copias
  if [ "$TARGET" = "$SCRIPT_DIR" ]; then
    echo
    warn "El destino es el propio paquete. No hay nada que instalar ahí."
    warn "Ejecutá install.sh desde el repo donde querés desembarcar el ecosistema,"
    warn "o usá --target <repo>."
    exit 0
  fi

  verify_package
  check_requirements || exit 1

  echo
  info "Paso 1/4 — .opencode/ (agentes, skills, plugins)"
  if $DRY_RUN; then
    dry "Copiaría .opencode/ completo a $TARGET/.opencode/"
  else
    mkdir -p "$TARGET"
    copy_tree "$SCRIPT_DIR/.opencode" "$TARGET/.opencode"
    ok ".opencode/ copiado"
  fi

  echo
  info "Paso 2/4 — workspec/ (solo archivos faltantes)"
  if $DRY_RUN; then
    dry "Copiaría workspec/ (sin pisar archivos existentes) a $TARGET/workspec/"
  else
    mkdir -p "$TARGET"
    copy_missing "$SCRIPT_DIR/workspec" "$TARGET/workspec"
    ok "workspec/ copiado (archivos existentes conservados)"
  fi

  echo
  info "Paso 3/4 — AGENTS.md"
  if [ -f "$SCRIPT_DIR/AGENTS.md" ]; then
    if [ -e "$TARGET/AGENTS.md" ]; then
      ok "AGENTS.md ya existe en el destino; se conserva el del proyecto"
    elif $DRY_RUN; then
      dry "Copiaría AGENTS.md a $TARGET/AGENTS.md"
    else
      cp "$SCRIPT_DIR/AGENTS.md" "$TARGET/AGENTS.md"
      ok "AGENTS.md copiado"
    fi
  else
    warn "AGENTS.md no está en el paquete todavía; se omite"
  fi

  echo
  info "Paso 4/4 — opencode.json"
  if [ -f "$SCRIPT_DIR/opencode.json" ]; then
    if [ -f "$TARGET/opencode.json" ]; then
      if $DRY_RUN; then
        dry "Mergearía opencode.json (sección mcp: agrega MCPs del paquete que falten)"
      elif deep_merge_json "$SCRIPT_DIR/opencode.json" "$TARGET/opencode.json"; then
        ok "opencode.json mergeado (MCPs del proyecto conservados)"
      else
        warn "No se pudo mergear opencode.json automáticamente; se conserva el del proyecto (merge manual necesario)"
      fi
    elif $DRY_RUN; then
      dry "Copiaría opencode.json a $TARGET/opencode.json"
    else
      cp "$SCRIPT_DIR/opencode.json" "$TARGET/opencode.json"
      ok "opencode.json copiado"
    fi
  else
    warn "opencode.json no está en el paquete todavía; se omite"
  fi

  echo
  info "Paso 5/5 — uv y graphify (herramientas opcionales, NO bloqueante)"
  if [ "$INSTALL_GRAPHIFY" = "no" ]; then
    info "Salteado (INSTALL_GRAPHIFY=no)."
    warn "headroom (MCP declarado en opencode.json) no arrancará hasta que uv esté disponible."
  elif [ "$INSTALL_GRAPHIFY" = "yes" ]; then
    if $DRY_RUN; then
      dry "Instalaría uv (requisito de headroom) y graphify si no existen globalmente"
    else
      install_uv || warn "uv no quedó instalado; headroom (MCP declarado) no arrancará. Instalalo:  curl -LsSf https://astral.sh/uv/install.sh | sh"
      install_graphify || warn "graphify no quedó instalado. Después:  uv tool install graphifyy"
    fi
  else
    if command -v uv >/dev/null 2>&1 && command -v graphify >/dev/null 2>&1; then
      ok "uv y graphify ya instalados globalmente (no hace falta instalar)"
    elif $DRY_RUN; then
      dry "Preguntaría si querés instalar uv (requisito de headroom) y graphify"
    else
      printf '%s\n' "  ¿Instalás uv y graphify? (uv es requisito para el MCP headroom; graphify agrega el grafo de conocimiento del código) [s/N]"
      read -r ans || true
      case "${ans:-N}" in
        s|S|y|Y|si|SI|yes|YES)
          install_uv || warn "uv no quedó instalado; headroom (MCP declarado) no arrancará. Instalalo:  curl -LsSf https://astral.sh/uv/install.sh | sh"
          install_graphify || warn "graphify no quedó instalado. Después:  uv tool install graphifyy"
          ;;
        *)
          warn "No se instalaron herramientas. headroom (MCP declarado en opencode.json) no arrancará hasta que uv esté disponible."
          warn "Para hacerlo más tarde:  curl -LsSf https://astral.sh/uv/install.sh | sh   (y luego:  uv tool install graphifyy)"
          ;;
      esac
    fi
  fi

  echo
  info "Paso 6/6 — engram (memoria persistente global, opcional, NO bloqueante)"
  if [ "$INSTALL_ENGRAM" = "no" ]; then
    info "Salteado (INSTALL_ENGRAM=no)."
  elif [ "$INSTALL_ENGRAM" = "yes" ]; then
    if $DRY_RUN; then
      dry "Instalaría engram si no está en PATH, mergearía su protocolo en ~/.config/opencode/AGENTS.md y agregaría el MCP al opencode.json local si no está en tu config global"
    else
      install_engram || warn "engram no quedó instalado; el ecosistema funciona igual (sin memoria persistente)."
      merge_engram_agents || warn "no se pudo mergear el protocolo engram en el AGENTS.md global; el resto continúa"
      # El MCP local solo tiene sentido si el binario quedó disponible (guard)
      if command -v engram >/dev/null 2>&1; then
        setup_engram_mcp "$TARGET" || warn "el MCP engram no se agregó al opencode.json local; el resto de la instalación continúa"
      fi
    fi
  else
    if $DRY_RUN; then
      dry "Preguntaría si querés instalar engram (memoria persistente global) y, si queda disponible, agregaría su MCP al opencode.json local"
    elif command -v engram >/dev/null 2>&1; then
      ok "engram ya está instalado ($(engram --version 2>/dev/null || echo 'presente'))"
      merge_engram_agents || warn "no se pudo mergear el protocolo engram en el AGENTS.md global; el resto continúa"
      setup_engram_mcp "$TARGET" || warn "el MCP engram no se agregó al opencode.json local; el resto de la instalación continúa"
    else
      printf '%s\n' "  ¿Instalás engram? (memoria persistente global para agentes MCP; herramienta útil en general) [s/N]"
      read -r ans || true
      case "${ans:-N}" in
        s|S|y|Y|si|SI|yes|YES)
          install_engram || warn "engram no quedó instalado; el ecosistema funciona igual (sin memoria persistente)."
          # Solo se agrega el MCP si el binario quedó disponible (guard)
          if command -v engram >/dev/null 2>&1; then
            setup_engram_mcp "$TARGET" || warn "el MCP engram no se agregó al opencode.json local; el resto de la instalación continúa"
          fi
          ;;
        *)
          warn "No se instaló engram. El ecosistema funciona igual; sin memoria persistente entre sesiones."
          warn "Para hacerlo más tarde:  brew install gentleman-programming/tap/engram   (o)   go install github.com/Gentleman-Programming/engram/cmd/engram@latest"
          ;;
      esac
      # El merge del AGENTS.md se hace igual aunque no se instale engram:
      # el protocolo es inofensivo sin el binario y queda listo si lo instala después.
      # El MCP local NO se agrega si el usuario rechazó instalar engram.
      merge_engram_agents || warn "no se pudo mergear el protocolo engram en el AGENTS.md global; el resto continúa"
    fi
  fi

  echo
  if $DRY_RUN; then
    info "Dry-run finalizado: nada fue modificado en $TARGET"
    info "Paso 5/5 (uv + graphify): en modo real preguntaría, o instalaría/saltearía según --yes/--no-tools"
    info "Paso 6/6 (engram): en modo real preguntaría, o instalaría/mergearía según --yes/--no-tools"
  else
    info "Instalación completada en: $TARGET"
    info "Se copió: .opencode/, workspec/ (solo faltantes), AGENTS.md (si faltaba), opencode.json (merge mcp). Herramientas: uv, graphify y engram (si se aceptaron)"
  fi
  echo
  info "Recordá reiniciar OpenCode para que las skills y plugins tomen efecto."
  info "Las skills toman efecto al reiniciar OpenCode; podés usar el script de reinicio cuando exista."
  echo
}

main "$@"