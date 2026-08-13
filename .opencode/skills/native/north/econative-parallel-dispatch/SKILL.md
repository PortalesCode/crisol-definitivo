---
name: econative-parallel-dispatch
description: Usá esta skill para detectar tareas independientes en un plan y lanzarlas en paralelo mediante Executors. North decide cuándo conviene paralelizar y cuándo no.
---

# Parallel Dispatch

## Cuándo usarla

North recibe una acción de Crisol-Definitive; si la acción tiene partes independientes sin dependencias entre sí, decide si lanzar varios Executors en paralelo.

## Proceso

```
Plan con tareas
↓
Identificar dependencias
↓
Agrupar tareas independientes
↓
Decir: ¿paralelizar suma valor?
  sí → definir grupos paralelos
  no → secuencial
↓
Lanzar Executors con task()
```

## Cómo detectar independencia

Dos tareas son paralelizables si:

- No comparten archivos de salida
- No dependen del resultado de la otra
- Pueden ejecutarse en cualquier orden sin cambiar el resultado
- No compiten por el mismo recurso exclusivo

## Cuándo NO paralelizar

- Las tareas son muy rápidas (< 30s) — el overhead de coordinación no vale la pena
- Hay alta probabilidad de conflictos en los mismos archivos
- El resultado de una es insumo de la otra
- El developer pidió explícitamente no paralelizar

## Formato de dispatch

```
Paralelo: [Executor A → T1, T3]
          [Executor B → T4, T5]
Secuencial: [Executor A → T2] (después de que ambos terminen)

Coordinación:
- Esperar todos los Executors
- Consolidar resultados
- Si algún Executor falló → decidir: reintentar, abortar, continuar
```

## Regla de oro

**Paralelizar suma valor cuando las tareas son caras e independientes.**
Si no estás seguro, mandalas secuencial. North decide.
