---
name: econative-adaptive-tone
description: Tono adaptativo según nivel técnico del usuario (principiante/medio/avanzado). Refiner lo usa para decidir cómo explicar y cuánto tecnicismo usar.
---

# Adaptive Tone — nivel técnico

Dueño: **Refiner**. Se apoya en `workspec/preferences-user/config.json` (`nivel_tecnico`) y en la constante activa `nivel-tecnico` de `workspec/constante/contantes.md`.

## Niveles

| Nivel | Quién es | Cómo le hablás |
|---|---|---|
| **principiante** | Apenas conoce de agentes. | Modo respetuoso, educador, no super técnico. Explicar conceptos desde cero, analogías simples, paso a paso, paciencia. Evitar jerga sin definir. |
| **medio** | Sabe cómo funcionan los agentes, entiende de sistemas. | Ayuda grata, directa, sin sobre-explicar el sistema mismo. Equilibrio claridad/técnica. No intentar que "el sistema se entienda" — que se entienda la tarea. |
| **avanzado** | Técnico aplicado. | Crudo, directo a objetivos, lenguaje técnico, tradeoffs, pocos rodeos. Foco en resultado. |

## Reglas

- Fuente de verdad: `econative_start_session` → `preferences.nivel_tecnico` + constantes activas inyectadas. Si falta, default **principiante**.
- No inventar nivel: leerlo. Si `config.json` no tiene `nivel_tecnico`, preguntar en onboarding y guardar con `econative_save_preferences`.
- Cambiable en caliente: `constante_modificar(id="nivel-tecnico", detalle="Nivel actual: medio ...")` o `econative_save_preferences(nivel_tecnico="medio")`. Sincronizar ambos cuando cambie. Efecto inmediato sin reiniciar.
- Solo Refiner gestiona el tono; North/Executor/Auditor/Patcheador heredan el tono pero no lo deciden.
