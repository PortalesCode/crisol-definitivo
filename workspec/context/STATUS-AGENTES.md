# STATUS-AGENTES

> **Referencia viva del ecosistema dev** — cómo está evolucionando el ecosistema (rondas, decisiones, issues CD-x).
> NO es el estado del trabajo del proyecto anfitrión (eso va en STATUS.md).

## Estado General

```
🔴 Sin definir     🟡 En construcción     🟢 Estable
```

**Estado actual:** 🟢 Estable — estructura limpia y coherente post-ronda 4 (auditoría aprobada con observaciones menores)

---

## Última Sesión

| Campo | Detalle |
|---|---|
| **Fecha** | 2026-08-13 |
| **Qué pasó** | Ronda 4 de limpieza estructural: borrado del agente Especialista-Bibliotecario y todo el sistema de domains (plugins incluidos), skill architecture-review movida a North, Refiner sin desembarco + hueco de investigación heredado (no bloqueante), key MCP seq-thinking → sequential-thinking (nombre real), CONTANTS.md intacto (decisión del usuario), README.md reestructurado (ruido de despliegue fuera de AGENTS.md), .gitignore creado. Auditoría post-cambios: aprobado sin 🔴. |
| **Decisiones** | Ver sección "Decisiones" abajo |

---

## Decisiones

1. **Cableado skill()**: ✅ RESTAURADO — todos los agentes instruyen cargar sus skills con `skill()`.
2. **context7 MCP**: ✅ CONFIGURADO y activo en definitive (viaja con el paquete, remoto).
3. **ARCHITECTURE.md**: ✅ Template completo de 51 líneas restaurado como referencia.
4. **Estructura del definitivo**: ✅ `.opencode/` + `workspec/` hermanas, `AGENTS.md` y `opencode.json` en raíz, `install.sh` para el despliegue (sin modo desembarco).
5. **README idioma**: ✅ RESUELTO — español (README.md creado con ruido de despliegue, AGENTS.md enfocado en el usuario).
6. **Rol Refiner/North**: ✅ DEFINIDO — Refiner entiende/refina la intención y formula la acción; North crea, descompone y administra el ciclo completo del plan (flujo: Refiner → triángulo → North → Executor → Auditor).
7. **Especialista-Bibliotecario**: ✅ ELIMINADO — la investigación la hereda Refiner (herramienta no bloqueante del entorno, tipo knowledge_search/knowledge_investigate; fallback websearch/webfetch).
8. **Sistema de domains**: ✅ ELIMINADO — plugins, carpeta y referencias limpiadas.
9. **sequential-thinking**: ✅ key MCP con nombre real (sin abreviar).
10. **Sistema de memorias del proyecto**: ✅ ELIMINADO — plugins `remember-it`/`remember-list`/`remember-show` y `stack-snapshot` borrados; `preferences-user` subió a `workspec/preferences-user/`; la carpeta de memorias fue eliminada (decisión del usuario). Documentación actualizada en AGENTS.md, README.md, .gitignore, install.sh y contextos.
11. **Matriz operativa de MCPs/tools**: ✅ PUBLICADO — uso de CodeGraph, Context7, Sequential Thinking, Headroom, Graphify y knowledge tools por agente (commit f3872129).
12. **Separación STATUS.md / STATUS-AGENTES.md**: ✅ HECHA — STATUS.md documenta el proyecto anfitrión; STATUS-AGENTES.md es referencia viva del ecosistema dev.
13. **Engram**: ✅ DECISIÓN — NO se forkeará por ahora. Se mantiene el criterio de instalación condicional (install.sh lo agrega a opencode.json local solo si no está en config global). No se reportan problemas de Engram.

---

## Próximos Pasos

- [ ] Pulir skill autoinstalable
- [ ] Script start/stop del server de OpenCode
- [ ] Decidir bootstrap curl|bash
- [ ] Probar en runtime la continuidad North→Refiner→North con task_id

---

## Issues Conocidos

| ID | Descripción | Estado | Prioridad |
|---|---|---|---|
| CD-4 | Skill autoinstalable sin pulir | Abierto | Media |
| CD-5 | Script start/stop del server sin crear | Abierto | Media |
| CD-6 | Decisión de bootstrap curl|bash pendiente | Abierto | Baja |
