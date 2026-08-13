---
name: econative-skill-installer
description: Instala skills bajo demanda desde un repositorio remoto. Refiner la usa cuando detecta que una skill externa es necesaria para la tarea actual. No descarga todo el catálogo, solo la skill específica.
---

# Skill Installer

## Cuándo usarla

- Antes de planificar, si el proyecto necesita una skill que no está en native/
- Cuando el stack del proyecto requiere experiencia específica (testing, frontend, etc.)
- Cuando un Executor reporta que le falta una skill para completar una tarea

## Pipeline

### 1. Refiner detecta necesidad
- Analiza el contexto del proyecto (stack, tarea, requerimiento)
- Determina qué skill externa se necesita
- Verifica si ya está instalada en `.opencode/skills/extern/<skill>/`

### 2. Si no está instalada → formular la instalación
1. **Refiner detecta la necesidad y formula la instalación** en la acción técnica que entrega a North (no ejecuta nada: Refiner tiene `edit: deny` y `bash: deny`)
2. La acción técnica incluye: la URL base (sección "Fuente remota"), la verificación contra `<URL>/index.json`, y los archivos a descargar (`<URL>/<skill>/SKILL.md` + adicionales si existen)
3. **North incluye la instalación como tarea del plan** y delega a **Executor** (único agente con `edit`/`bash`)
4. **Executor descarga** `<URL>/<skill>/SKILL.md` (y archivos adicionales si existen) y **escribe** los archivos en `.opencode/skills/extern/<skill>/`
5. **Executor actualiza AGENTS.md** (sección Skills externas) con la skill instalada
6. **Refiner informa al usuario** sobre el reinicio requerido (paso 5)

### 3. Si ya está instalada
- Verificar si hace falta actualizarla (comparar versión local vs remota si existe)
- Si no, usar la que ya está instalada
- Si se actualiza, también actualizar la descripción en AGENTS.md si cambió

### 4. Actualizar AGENTS.md (lo ejecuta Executor)
- **Executor** abre `AGENTS.md` (raíz del proyecto)
- Busca la sección `### Skills externas` dentro del `## ⚙️ Manifiesto del proyecto`
- Agrega la skill instalada: `- **<skill-name>**: <descripción>`
- Reemplaza `- _(completar)_` o `- _(sin skills externas instaladas)_` si existen, o agrega después del último ítem

### 5. OpenCode descubre la skill
- Al reiniciar runtime, OpenCode detecta la nueva skill en `skills/extern/`
- Aparece en `<available_skills>` con su nombre y descripción
- Los agentes pueden cargarla con `skill("<nombre>")`

## Reglas

1. NO instalar skills que ya están en `skills/extern/`
2. NO descargar el catálogo completo
3. Si la descarga falla, Refiner informa al usuario y continúa sin la skill
4. Si la skill remota no existe en el index, Refiner informa y no crea archivos vacíos
5. La URL base está hardcodeada en este archivo (sección "Fuente remota") para que el instalador sea autocontenido
6. **Las skills instaladas NO están disponibles hasta reiniciar OpenCode.** Después de instalar, Refiner informa al usuario: "Skill instalada. Necesitás reiniciar OpenCode para que esté disponible."
7. **Siempre actualizar AGENTS.md** después de instalar o actualizar una skill. Si AGENTS.md no refleja las skills instaladas, los agentes no saben que existen.
8. **Refiner nunca escribe archivos: detecta, formula y delega. La escritura la ejecuta Executor vía North.** Refiner tiene `edit: deny` y `bash: deny`; toda instalación (descarga, escritura, actualización de AGENTS.md) la ejecuta Executor como tarea del plan de North.

## Fuente remota

La URL base del repositorio remoto está hardcodeada acá para que el instalador sea autocontenido:

```
https://raw.githubusercontent.com/PortalesCode/skill-library/main/
```

## Formato del repositorio remoto

```
├── index.json
│   {
│     "skills": [
│       {
│         "name": "playwright-expert",
│         "description": "E2E testing with Playwright",
│         "files": ["SKILL.md"]
│       }
│     ]
│   }
├── playwright-expert/
│   └── SKILL.md
└── frontend-design/
    └── SKILL.md
```
