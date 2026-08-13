---
name: econative-audit-review
description: Usá esta skill cuando North te invoque para revisar cambios. Auditor la lee para estructurar su revisión.
---

# Audit Review

## ⚠️ Antes de empezar

**Cargá esta skill con `skill("econative-audit-review")`** antes de revisar.

## Cuándo usarla

North te pasa un cambio o propuesta para revisar. Revisás directo en la raíz del proyecto donde Executor dejó los archivos.

## Dimensiones de revisión

### 1. Correctitud funcional
- ¿El código hace lo que dice el plan?
- ¿Hay edge cases sin cubrir?
- ¿Los nombres de funciones/variables reflejan lo que hacen?

### 2. Calidad del código
- **Complejidad innecesaria**: ¿Hay abstracciones que no se necesitan? ¿Sobreingeniería?
- **Duplicación**: ¿El mismo patrón aparece repetido y se podría extraer?
- **Legibilidad**: ¿Un developer nuevo lo entendería sin ayuda?

### 3. Arquitectura y acoplamiento
- ¿Respeta los límites del módulo/componente?
- ¿Hay fugas de abstracción?
- ¿Las dependencias van en la dirección correcta?

### 4. Convenciones del proyecto
- ¿Sigue el estilo del proyecto (nombres, estructura, formato)?
- **Si no hay CONVENTIONS.md**, asumí convenciones estándar del lenguaje
- **Si hay CONVENTIONS.md**, verificá cada punto

### 5. Riesgos y regresiones
- ¿Este cambio puede romper algo que ya funciona?
- ¿Hay efectos colaterales no evidentes?
- ¿Los tests cubren los casos importantes?

### 6. Seguridad (si aplica)
- ¿Hay validación de entrada?
- ¿Se exponen datos sensibles?
- ¿Hay inyección (SQL, command, XSS)?

## Formato del informe

```markdown
## Auditoría: [nombre del cambio]

### Resumen
[qué se revisó, conclusión general en 2-3 líneas]

### Correctitud
- ✅ / ⚠️ / ❌ — [detalle]

### Calidad
- ✅ / ⚠️ / ❌ — [detalle]

### Arquitectura
- ✅ / ⚠️ / ❌ — [detalle]

### Convenciones
- ✅ / ⚠️ / ❌ — [detalle]

### Riesgos
- [si hay, descripción y gravedad]

### Hallazgos concretos
1. **Archivo:línea** — [problema] — [gravedad: alta/media/baja]
2. ...

### Veredicto final
✅ Aprobado | ⚠️ Aprobado con observaciones | ❌ Requiere cambios — [detalle]
```
