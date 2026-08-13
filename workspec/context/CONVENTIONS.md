# CONVENTIONS

> Este archivo documenta las **convenciones del repo anfitrión** donde se instaló el Crisol Definitive.
> NO son las convenciones del ecosistema — esas viven en `AGENTS.md`.
> El propósito del repo es el código del proyecto; `.opencode/` y `workspec/` son herramientas para entenderlo y trabajarlo.

---

## Convenciones del proyecto (repo anfitrión)

### Git Workflow

- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/)
  - `feat:` nueva funcionalidad
  - `fix:` corrección de bug
  - `refactor:` cambio sin cambio de comportamiento
  - `chore:` tareas de mantenimiento
  - `docs:` documentación
  - `style:` formato, estilos
- **Rama principal:** `main`
- **Ramas de trabajo:** `feat/<nombre>`, `fix/<nombre>`

### Naming

| Elemento | Convención | Ejemplo |
|---|---|---|
| Archivos | `kebab-case` | `mi-archivo.ts` |
| Directorios | `kebab-case` | `mi-directorio/` |
| Funciones | `camelCase` | `miFuncion()` |
| Clases/Tipos | `PascalCase` | `MiClase` |
| Constantes | `UPPER_SNAKE_CASE` | `MI_CONSTANTE` |
| Variables | `camelCase` | `miVariable` |

### Estilo de Código

_Pendiente de definir según lenguaje/framework del proyecto anfitrión._

---

## Convenciones del ecosistema (solo referencia)

Las convenciones de los agentes (flujo de trabajo, roles, auditoría) viven en `AGENTS.md` y en los agentes de `.opencode/agents/`. No se duplican acá.