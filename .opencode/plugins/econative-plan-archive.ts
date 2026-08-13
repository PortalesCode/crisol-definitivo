import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { tool } from "@opencode-ai/plugin";
import type { Plugin } from "@opencode-ai/plugin";
import { parsePlan } from "./_plan-utils.js";

export default (async () => {
  return {
    tool: {
      econative_plan_archive: tool({
        description:
          "Archiva el plan activo a workspec/plans/old/ con timestamp y crea un nuevo plan.md vacío "
          + "listo para la próxima sesión. Usar cuando un plan se completa.",
        args: {
          new_intention: tool.schema.string().optional()
            .describe("Opcional: intención del nuevo plan. Si se omite, el nuevo plan queda vacío."),
        },
        async execute(args, context) {
          const activeDir = join(context.directory, "workspec", "plans", "active");
          const oldDir = join(context.directory, "workspec", "plans", "old");
          const planPath = join(activeDir, "plan.md");

          if (!existsSync(planPath)) {
            return JSON.stringify({
              ok: false,
              error: "No hay plan activo en workspec/plans/active/plan.md para archivar",
            });
          }

          const content = readFileSync(planPath, "utf-8");

          // Timestamp
          const now = new Date();
          const pad = (n: number) => n.toString().padStart(2, "0");
          const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
          const archiveName = `plan-${timestamp}.md`;
          const archivePath = join(oldDir, archiveName);

          if (!existsSync(oldDir)) mkdirSync(oldDir, { recursive: true });

          renameSync(planPath, archivePath);

          // Extraer métricas del plan archivado via plan-utils
          let archivedStats = { intention: "(no especificada)", completed_tasks: 0, total_tasks: 0, progress: "0%" };
          try {
            const planData = parsePlan(content);
            archivedStats = {
              intention: planData.intention || "(no especificada)",
              completed_tasks: planData.stats.completedTasks,
              total_tasks: planData.stats.totalTasks,
              progress: `${planData.stats.progressPercent}%`,
            };
          } catch {
            // Si falla el parseo, usar métricas básicas
            const completedTasks = (content.match(/- \[x\]/g) || []).length;
            const totalTasks = (content.match(/- \[[ x]\]/g) || []).length;
            archivedStats = {
              intention: "(extracción falló)",
              completed_tasks: completedTasks,
              total_tasks: totalTasks,
              progress: totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}%` : "0%",
            };
          }

          // Crear nuevo plan.md vacío
          let newPlan = "# Plan Activo\n\n## Intención\n";
          newPlan += args.new_intention || "_pendiente — definir en la próxima sesión_";
          newPlan += "\n\n---\n\n## Fases\n\n### Fase 1: Por definir\n- [ ] _primera tarea_\n\n---\n\n## Dependencias\n\n-\n\n---\n\n## Notas\n\n-\n";

          writeFileSync(planPath, newPlan, "utf-8");

          return JSON.stringify({
            ok: true,
            archived: {
              file: archiveName,
              ...archivedStats,
            },
            new_plan: {
              intention: args.new_intention || "_pendiente_",
              path: "workspec/plans/active/plan.md",
            },
            message: `Plan archivado como ${archiveName}. Nuevo plan creado.`,
          });
        },
      }),
    },
  };
}) satisfies Plugin;
