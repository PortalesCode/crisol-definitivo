import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { tool } from "@opencode-ai/plugin";
import type { Plugin } from "@opencode-ai/plugin";
import { parsePlan, formatPlanSummary } from "./_plan-utils.js";

export default (async () => {
  return {
    tool: {
      econative_plan_read: tool({
        description:
          "Lee el plan activo desde workspec/plans/active/plan.md y devuelve su contenido estructurado: "
          + "intención, fases con tareas y su estado, dependencias y notas. "
          + "Útil para que Refiner retome el plan entre sesiones o que el usuario consulte el estado.",
        args: {},
        async execute(_args, context) {
          const planPath = join(context.directory, "workspec", "plans", "active", "plan.md");

          if (!existsSync(planPath)) {
            return JSON.stringify({
              ok: true,
              exists: false,
              summary: "No hay un plan activo. Refiner necesita preguntar la intención al usuario.",
            });
          }

          const content = readFileSync(planPath, "utf-8");

          try {
            const planData = parsePlan(content);
            const summary = formatPlanSummary(planData);

            return JSON.stringify({
              ok: true,
              exists: true,
              intention: planData.intention,
              phases: planData.phases,
              dependencies: planData.dependencies,
              notes: planData.notes,
              stats: planData.stats,
              summary,
            }, null, 2);
          } catch (err) {
            return JSON.stringify({
              ok: false,
              exists: true,
              error: `Error al parsear plan.md: ${err instanceof Error ? err.message : String(err)}`,
            });
          }
        },
      }),
    },
  };
}) satisfies Plugin;
