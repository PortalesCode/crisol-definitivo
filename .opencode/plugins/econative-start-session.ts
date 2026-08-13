import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "fs";
import { join, extname, basename, dirname } from "path";
import { parsePlan, formatPlanSummary } from "./_plan-utils.js";
import { tool } from "@opencode-ai/plugin";
import type { Plugin } from "@opencode-ai/plugin";

export default (async () => {
  return {
    tool: {
      econative_start_session: tool({
        description:
          "INICIO OBLIGATORIO DE SESIÓN. Refiner DEBE llamar esta tool al comenzar cada conversación. "
          + "Lee contexto, plan activo y preferencias del ecosistema, y devuelve esos datos junto con el estado de onboarding. "
          + "Si no hay preferencias de usuario, devuelve onboarding_required: true. "
          + "Crea workspec/plans/active/plan.md si no existe. "
          + "Para leer otro estado del proyecto, usá la tool correspondiente. "
          + "La instalación del ecosistema se hace con install.sh, no con esta tool.",
        args: {},
        async execute(_args, context) {
          const root = context.directory;
          const ctxDir = join(root, "workspec/context");

          const prefsFile = join(root, "workspec", "preferences-user", "config.json");

          const result: Record<string, unknown> = {
            session_started: new Date().toISOString(),
            onboarding_required: false,
            preferences: null,
            context: {} as Record<string, string>,
            plan_created: false,
            plan: null as Record<string, unknown> | null
          };

          // ---- Check preferences ----
          if (!existsSync(prefsFile)) {
            result.onboarding_required = true;
          } else {
            try {
              result.preferences = JSON.parse(readFileSync(prefsFile, "utf-8"));
            } catch {
              result.onboarding_required = true;
            }
          }

          // ---- Auto-create plan.md if it doesn't exist ----
          const planPath = join(root, "workspec", "plans", "active", "plan.md");
          if (!existsSync(planPath)) {
            const planDir = dirname(planPath);
            if (!existsSync(planDir)) mkdirSync(planDir, { recursive: true });

            const template = [
              "# Plan Activo",
              "",
              "## Intención",
              "_pendiente — definir en la próxima sesión_",
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

            writeFileSync(planPath, template, "utf-8");
            result.plan_created = true;
          }

          // ---- Read plan content if exists ----
          if (existsSync(planPath)) {
            try {
              const planContent = readFileSync(planPath, "utf-8");
              const planData = parsePlan(planContent);
              result.plan = {
                intention: planData.intention,
                phases_count: planData.phases.length,
                total_tasks: planData.stats.totalTasks,
                completed_tasks: planData.stats.completedTasks,
                in_progress_tasks: planData.stats.inProgressTasks,
                progress: `${planData.stats.progressPercent}%`,
                summary: formatPlanSummary(planData),
              };
            } catch { /* si falla parseo, plan queda null */ }
          }

          // ---- Load context/*.md ----
          if (existsSync(ctxDir)) {
            try {
              const ctxFiles: Record<string, string> = {};
              const files = readdirSync(ctxDir).filter((f) => extname(f) === ".md");
              for (const file of files) {
                const content = readFileSync(join(ctxDir, file), "utf-8");
                ctxFiles[basename(file, ".md")] = content.slice(0, 3000);
              }
              result.context = ctxFiles;
            } catch { /* ignore */ }
          }

          return JSON.stringify(result, null, 2);
        },
      }),
    },
  };
}) satisfies Plugin;
