import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { tool } from "@opencode-ai/plugin";
import type { Plugin } from "@opencode-ai/plugin";
import { parsePlan } from "./_plan-utils.js";

export async function archivePlan(contextDirectory: string, newIntention?: string) {
  const activeDir = join(contextDirectory, "workspec", "plans", "active");
  const oldDir = join(contextDirectory, "workspec", "plans", "old");
  const planPath = join(activeDir, "plan.md");

  if (!existsSync(planPath)) {
    return {
      ok: false,
      error: "No hay plan activo en workspec/plans/active/plan.md para archivar",
    };
  }

  const content = readFileSync(planPath, "utf-8");

  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  const archiveName = `plan-${timestamp}.md`;
  const archivePath = join(oldDir, archiveName);

  if (!existsSync(oldDir)) mkdirSync(oldDir, { recursive: true });

  renameSync(planPath, archivePath);

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
    const completedTasks = (content.match(/- \[x\]/g) || []).length;
    const totalTasks = (content.match(/- \[[ x]\]/g) || []).length;
    archivedStats = {
      intention: "(extracción falló)",
      completed_tasks: completedTasks,
      total_tasks: totalTasks,
      progress: totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}%` : "0%",
    };
  }

  const newPlan = [
    "# Plan Activo",
    "",
    "## Intención",
    newIntention || "_pendiente — definir en la próxima sesión_",
    "",
    "---",
    "",
    "## Fases",
    "",
    "### Fase 1: Por definir",
    "- [ ] _primera tarea_",
    "",
    "---",
    "",
    "## Dependencias",
    "",
    "-",
    "",
    "---",
    "",
    "## Notas",
    "",
    "-",
    "",
  ].join("\n");

  writeFileSync(planPath, newPlan, "utf-8");

  return {
    ok: true,
    archived: { file: archiveName, ...archivedStats },
    new_plan: {
      intention: newIntention || "_pendiente_",
      path: "workspec/plans/active/plan.md",
    },
    message: `Plan archivado como ${archiveName}. Nuevo plan creado.`,
  };
}

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
          return JSON.stringify(await archivePlan(context.directory, args.new_intention));
        },
      }),
    },
  };
}) satisfies Plugin;
