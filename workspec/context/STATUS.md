# STATUS

> Documenta el estado del PROYECTO ANFITRIÓN (el repo donde se instaló el ecosistema). No es el estado del ecosistema.

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
6. **Rol Refiner/North**: ✅ DEFINIDO — Refiner crea el plan, North lo serializa y delega (flujo de 6 agentes: Refiner → triángulo → North → Executor → Auditor).
7. **Especialista-Bibliotecario**: ✅ ELIMINADO — la investigación la hereda Refiner (herramienta no bloqueante del entorno, tipo knowledge_search/knowledge_investigate; fallback websearch/webfetch).
8. **Sistema de domains**: ✅ ELIMINADO — plugins, carpeta y referencias limpiadas.
9. **sequential-thinking**: ✅ key MCP con nombre real (sin abreviar).
10. **Sistema de memorias del proyecto**: ✅ ELIMINADO — plugins `remember-it`/`remember-list`/`remember-show` y `stack-snapshot` borrados; `preferences-user` subió a `workspec/preferences-user/`; la carpeta de memorias fue eliminada (decisión del usuario). Documentación actualizada en AGENTS.md, README.md, .gitignore, install.sh y contextos.

---

## Próximos Pasos

- [x] Instalar con `install.sh` en un repo de prueba (pendiente verificación real)
- [x] Verificar reinicio de OpenCode tras la instalación (pendiente)
- [ ] Integrar Engram local (fork desde gentle-ai, solo engram)
- [ ] Pulir skill autoinstalable + script de reinicio del server
- [x] Documentar en README la dependencia de entorno de knowledge_search/knowledge_investigate (H5 de auditoría)
- [ ] Aclarar quién ejecuta `econative_plan design` en runtime (H6 de auditoría)
- [ ] Typos/ambigüedades menores en Refiner.md (H3, H4 de auditoría)

---

## Issues Conocidos

| ID | Descripción | Estado | Prioridad |
|---|---|---|---|
| CD-1 | Verificar instalación con install.sh en repo de prueba | Abierto | Alta |
| CD-2 | Verificar reinicio de OpenCode post-instalación | Abierto | Alta |
| CD-3 | Engram local (fork) sin integrar | Abierto | Media |
| CD-4 | Skill autoinstalable sin pulir | Abierto | Media |
| CD-5 | README: dependencia knowledge_search/knowledge_investigate documentada, con tools portables y variables configurables | Completado | Baja |
| CD-6 | Aclarar ejecutor de econative_plan design en runtime | Abierto | Baja |
