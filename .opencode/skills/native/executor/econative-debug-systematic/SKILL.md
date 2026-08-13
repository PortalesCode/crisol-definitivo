---
name: econative-debug-systematic
description: Usá esta skill cuando necesites debuggear un problema de forma estructurada. Executor la lee antes de empezar a debuggear para no saltar a conclusiones.
---

# Debug Systematic

## Cuándo usarla

Executor recibe un bug o fallo para investigar.

## Pipeline de debugging

```
1. REPRODUCIR
   ¿El bug es reproducible?
   → Obtener el error exacto, stack trace, input que lo dispara
   → Si no es reproducible, documentar cuándo ocurrió

2. AISLAR
   ¿Dónde está el problema?
   → Reducir al mínimo: qué archivo, qué línea, qué condición
   → Probar: ¿sigue pasando si sacamos X?

3. HIPÓTESIS
   ¿Qué podría estar causándolo?
   → Listar causas posibles (no te cases con una)
   → Ordenar por probabilidad

4. PROBAR
   Probar cada hipótesis de a una
   → Cambiar una variable a la vez
   → Verificar resultado

5. FIX
   Una vez identificada la causa raíz → implement-safe
   → No parchear: entender por qué pasaba

6. VERIFICAR
   → ¿El fix resuelve el caso original?
   → ¿Introdujo regresiones? (correr tests si existen)
   → ¿Hay otros lugares con el mismo patrón?
```

## Antipatrones

- ❌ Cambiar cosas al azar hasta que funcione
- ❌ Asumir la causa sin reproducir
- ❌ Parchar sin entender la causa raíz
- ❌ Arreglar el síntoma, no la enfermedad

## Reporte

```markdown
## Debug: [bug]

### Causa raíz
[qué lo causaba]

### Fix
[qué se cambió]

### Verificación
- ¿Reproduce el caso original? ✅
- ¿Regresiones? Ninguna detectada
- ¿Patrón similar en otros lados? [sí/no — detalles]
```
