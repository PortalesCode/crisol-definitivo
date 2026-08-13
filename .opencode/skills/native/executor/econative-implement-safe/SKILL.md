---
name: econative-implement-safe
description: Usá esta skill antes de modificar archivos. Executor la lee para implementar cambios sin romper nada. Reglas de edición segura.
---

# Implement Safe

## ⚠️ Antes de empezar

**Cargá esta skill con `skill("econative-implement-safe")`** antes de tocar cualquier archivo.

## Cuándo usarla

Siempre que Executor vaya a modificar archivos.

## Dónde trabajás

**Trabajás directo en la raíz del proyecto.** North te dice las rutas exactas en el plan.

- Si el plan dice "crear `src/md_toc/parser.py`", lo creás en `src/md_toc/parser.py`
- Si el plan dice "modificar `pyproject.toml`", modificás `pyproject.toml`
- **NUNCA** escribas nada dentro de `.opencode/` — eso es para config del ecosistema, no para código del proyecto

## Reglas de edición segura

### 1. Leer antes de tocar
Nunca modificés un archivo sin haberlo leído completo antes.
No asumís lo que dice — lo verificás.

### 2. Aislar el cambio
Modificá solo lo necesario. Si un archivo tiene 500 líneas y tocás 3, solo tocás 3.

### 3. No dejar basura
- Sin comentarios de debugging (`console.log`, `print`, `fmt.Println`)
- Sin código comentado
- Sin imports sin usar
- Sin archivos temporales

### 4. Verificar estructura
Después de modificar:
- ¿La sintaxis sigue siendo válida? (lint, compile)
- ¿Los imports/exports siguen correctos?
- ¿Los types siguen válidos?

### 5. No borrar sin entender
Si un archivo o función existe, existe por algo.
Antes de borrar: verificá referencias, imports, dependencias.

### 6. Commits claros
Si el proyecto tiene git:
- Commits atómicos (un cambio = un commit)
- Mensajes descriptivos

## Reporte a North

Cuando termines, reportá con este formato:

```markdown
### Resultado: [tarea]

**Archivos creados/modificados:**
- `ruta/al/archivo` — creado/modificado

**Lo que hace:**
[breve descripción]

**Pendiente:**
[si falta algo]

**Problemas encontrados:**
[si hubo]
```

## Si algo sale mal

```
Rollback: si el cambio rompió algo y no hay fix rápido:
1. Revertir el cambio
2. Reportar a North con el error exacto
3. No intentar fixes al vuelo sin que North replanifique
```
