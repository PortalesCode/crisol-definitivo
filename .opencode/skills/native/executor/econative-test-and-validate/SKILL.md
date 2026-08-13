---
name: econative-test-and-validate
description: Usá esta skill para validar cambios y ejecutar pruebas. Executor la lee para saber qué testear, cómo y qué reportar.
---

# Test and Validate

## ⚠️ Antes de empezar

**Cargá esta skill con `skill("econative-test-and-validate")`** antes de validar.

## Cuándo usarla

Executor implementó un cambio y necesita validar que funciona.

## Pipeline de validación

### 1. Compilación / typecheck
Siempre primero. No tiene sentido testear si no compila.

| Lenguaje | Comando |
|---|---|
| Python | `python -m py_compile src/` o `mypy src/` (si está configurado) |
| TypeScript/Node | `npx tsc --noEmit` |
| Go | `go build ./...` |
| Rust | `cargo check` |
| Genérico | Buscar `pyproject.toml`, `tsconfig.json`, `go.mod`, `Cargo.toml` y usar el comando del ecosistema |

### 2. Linter

| Lenguaje | Comando |
|---|---|
| Python (ruff) | `ruff check src/` |
| Python (flake8) | `flake8 src/` |
| TypeScript/Node | `npx eslint src/` |
| Genérico | Si no hay linter configurado, skipear |

### 3. Tests unitarios

| Framework | Comando |
|---|---|
| pytest | `python -m pytest tests/ -v` |
| pytest | `python -m pytest tests/ -v` |
| Node (vitest) | `npx vitest run` |
| Node (jest) | `npx jest` |
| Go | `go test ./...` |

Si no existen tests → reportar a North. No inventes tests sin que North los planifique.

### 4. Validación funcional
- Probar el caso de uso principal (correr la CLI, llamar la función, etc.)
- Probar edge cases identificados en el plan de North
- Probar que lo viejo sigue funcionando (regresiones)

### 5. Validación de convenciones
- ¿Sigue las convenciones del proyecto?
- ¿Nombres consistentes con el resto?
- ¿Estructura de archivos consistente?

## Reporte

```markdown
## Validación: [cambio]

### Compilación / typecheck
- ✅ Pasa / ❌ Falla / 🔲 No aplica

### Linter
- ✅ Pasa / ❌ Falla / 🔲 No configurado

### Tests
- Pasaron: X / Y
- Fallaron: [detalles si hubo]
- Sin tests: [si no existen]

### Funcional
- Caso principal: ✅ / ❌
- Edge cases: ✅ / ❌ (especificar)
- Regresiones: ninguna / [detalles]

### Veredicto
✅ Listo | ⚠️ Con observaciones | ❌ No pasa — reportar a North
```
