---
name: econative-architecture-review
description: Usá esta skill para evaluar arquitectura, componentes, límites, acoplamiento, flujo de datos, impacto de cambios y escalabilidad. North la usa para aportar criterio experto de arquitectura o diseño antes de planificar cambios grandes.
---

# Architecture Review

## Cuándo usarla

North la usa antes de planificar cambios grandes: revisa si la arquitectura actual soporta lo que pide el usuario, o aporta criterio experto para decidir entre enfoques. No planifica ni ejecuta — su rol es aportar criterio experto de arquitectura o diseño.

## Dimensiones a evaluar

### 1. Límites
- ¿Los componentes tienen responsabilidades claras?
- ¿Hay fugas de abstracción entre capas?
- ¿Dónde empieza y termina cada módulo?

### 2. Responsabilidades
- ¿Cada módulo hace una sola cosa?
- ¿Hay componentes que hacen demasiado?
- ¿Hay responsabilidades huérfanas (nadie las tiene)?

### 3. Acoplamiento
- ¿Los módulos dependen de implementaciones o de interfaces?
- ¿Un cambio en X obliga a cambiar Y?
- ¿Hay dependencias circulares?

### 4. Flujo de datos
- ¿Los datos viajan en una dirección clara?
- ¿Hay mutaciones inesperadas?
- ¿El estado está donde debe estar?

### 5. Impacto
- ¿Qué módulos toca este cambio?
- ¿Qué podría romperse indirectamente?
- ¿Hay efectos colaterales en cadena?

### 6. Escalabilidad (si aplica)
- ¿La solución escala horizontal o verticalmente?
- ¿Dónde están los cuellos de botella?
- ¿Cómo se comporta bajo carga?

## Output

```markdown
## Revisión de Arquitectura

### Diagnóstico
[estado actual, problemas detectados]

### Riesgos
1. [riesgo] — [gravedad] — [mitigación]

### Recomendaciones
1. [qué cambiar y por qué]

### Veredicto
✅ La arquitectura soporta el cambio | ⚠️ Cambio viable con ajustes | ❌ Requiere re-arquitectura
```
