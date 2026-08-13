/**
 * econative-plan.ts — Tool unificada de gestión del plan activo
 *
 * Reemplaza econative-task-init, econative-task-closeout, econative-plan-read
 * y econative-plan-archive en una sola función con 5 acciones:
 *
 *   design   → Genera un plan.md completo desde cero
 *   start    → Marca una tarea existente como en curso (🔵)
 *   close    → Marca una tarea como completada o cancelada
 *   status   → Lee y devuelve el estado actual del plan
 *   archive  → Archiva el plan actual y crea uno vacío
 *
 * Depende de _plan-utils.js para parsing, modificación y formateo.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "fs";
import { join, dirname } from "path";
import { tool } from "@opencode-ai/plugin";
import type { Plugin } from "@opencode-ai/plugin";
import {
  parsePlan,
  updateTaskStatus,
  addCreationTimestamp,
  addCloseTimestamp,
  getCompletedPhase,
  formatPlanSummary,
  now,
} from "./_plan-utils.js";

export default (async () => {
  return {
    tool: {
      econative_plan: tool({
        description:
          "Tool unificada para gestionar el plan activo (workspec/plans/active/plan.md). "
          + "Reemplaza task-init, task-closeout, plan-read y plan-archive en una sola función. "
          + "Acciones: design (generar plan), start (iniciar tarea), close (cerrar tarea), "
          + "status (consultar estado), archive (archivar plan).",

        args: {
          action: tool.schema.string()
            .describe("Acción: 'design' | 'start' | 'close' | 'status' | 'archive'"),

          intention: tool.schema.string().optional()
            .describe("Intención del plan (requerido para design, opcional para archive)"),

          phases: tool.schema.array(
            tool.schema.object({
              name: tool.schema.string().describe("Nombre de la fase"),
              tasks: tool.schema.array(
                tool.schema.object({
                  name: tool.schema.string().describe("Nombre de la tarea"),
                  description: tool.schema.string().optional().describe("Descripción opcional de la tarea"),
                })
              ).describe("Lista de tareas de la fase"),
            })
          ).optional()
            .describe("[design] Fases con tareas. Cada fase tiene 'name' (string) y 'tasks' (array). Cada tarea tiene 'name' (string) y opcional 'description' (string)."),

          task_name: tool.schema.string().optional()
            .describe("Nombre de la tarea (requerido para start / close)"),

          status: tool.schema.string().optional()
            .describe("[close] Estado final: 'completed' (default) | 'cancelled'"),

          new_intention: tool.schema.string().optional()
            .describe("[archive] Intención del nuevo plan (opcional, default: _pendiente_)"),
        },

        async execute(args, context) {
          const action = args.action as string;
          const planPath = join(context.directory, "workspec", "plans", "active", "plan.md");
          const planDir = dirname(planPath);
          const oldDir = join(context.directory, "workspec", "plans", "old");

          // ─── ENSURE BASE DIRECTORIES EXIST ──────────────────────────
          function ensurePlanDir(): void {
            if (!existsSync(planDir)) mkdirSync(planDir, { recursive: true });
          }

          // ─────────────────────────────────────────────────────────────
          // DESIGN
          // ─────────────────────────────────────────────────────────────
          if (action === "design") {
            const intention = args.intention as string | undefined;
            const phases = args.phases as Array<{name: string; tasks: Array<{name: string; description?: string}>}> | undefined;

            if (!intention || !intention.trim()) {
              return JSON.stringify({
                ok: false,
                action: "design",
                error: "Se requiere 'intention' (string no vacío) para la acción design",
              });
            }
            if (!phases || phases.length === 0) {
              return JSON.stringify({
                ok: false,
                action: "design",
                error: "Se requiere 'phases' (array no vacío) para la acción design",
              });
            }

            // Validar nombres de tarea únicos entre todas las fases
            const allTaskNames: string[] = [];
            for (const phase of phases) {
              for (const task of phase.tasks) {
                const lower = task.name.toLowerCase().trim();
                if (allTaskNames.includes(lower)) {
                  return JSON.stringify({
                    ok: false,
                    action: "design",
                    error: `Nombre de tarea duplicado: '${task.name}'. Los nombres deben ser únicos entre todas las fases.`,
                  });
                }
                allTaskNames.push(lower);
              }
            }

            // Generar contenido del plan
            let md = "# Plan Activo\n\n## Intención\n";
            md += `${intention.trim()}\n\n---\n\n## Fases\n\n`;

            for (let i = 0; i < phases.length; i++) {
              const phase = phases[i];
              md += `### ${phase.name}\n`;
              for (const task of phase.tasks) {
                const desc = task.description ? ` — ${task.description}` : "";
                md += `- [ ] ${task.name}${desc}\n`;
              }
              md += "\n";
            }

            md += "---\n\n## Dependencias\n\n-\n\n---\n\n## Notas\n\n-\n";

            // Escribir plan.md
            ensurePlanDir();
            writeFileSync(planPath, md, "utf-8");

            // Parsear y devolver resumen
            const planData = parsePlan(md);
            const summary = formatPlanSummary(planData);

            return JSON.stringify({
              ok: true,
              action: "design",
              intention: intention.trim(),
              phases_count: phases.length,
              total_tasks: planData.stats.totalTasks,
              stats: planData.stats,
              summary,
            });
          }

          // ─────────────────────────────────────────────────────────────
          // START
          // ─────────────────────────────────────────────────────────────
          if (action === "start") {
            const taskName = args.task_name as string | undefined;
            if (!taskName || !taskName.trim()) {
              return JSON.stringify({
                ok: false,
                action: "start",
                error: "Se requiere 'task_name' (string no vacío) para la acción start",
              });
            }

            if (!existsSync(planPath)) {
              return JSON.stringify({
                ok: false,
                action: "start",
                error: "No se encontró workspec/plans/active/plan.md",
              });
            }

            const content = readFileSync(planPath, "utf-8");
            let lines = content.split("\n");

            const result = updateTaskStatus(lines, taskName, "pending");
            if (!result.found || result.modifiedIndex === undefined) {
              return JSON.stringify({
                ok: false,
                action: "start",
                error: `Tarea '${taskName}' no encontrada en el plan. No se crean tareas fantasma.`,
              });
            }

            lines = result.lines;
            const idx = result.modifiedIndex;

            // Agregar 🔵 si no lo tiene
            let line = lines[idx];
            if (!line.includes("🔵")) {
              line = line.replace("- [ ] ", "- [ ] 🔵 ");
            }
            line = addCreationTimestamp(line, now());
            lines[idx] = line;

            writeFileSync(planPath, lines.join("\n"), "utf-8");

            return JSON.stringify({
              ok: true,
              action: "start",
              task_name: taskName.trim(),
              plan_updated: true,
              timestamp_created: true,
            });
          }

          // ─────────────────────────────────────────────────────────────
          // CLOSE
          // ─────────────────────────────────────────────────────────────
          if (action === "close") {
            const taskName = args.task_name as string | undefined;
            if (!taskName || !taskName.trim()) {
              return JSON.stringify({
                ok: false,
                action: "close",
                error: "Se requiere 'task_name' (string no vacío) para la acción close",
              });
            }

            const rawStatus = (args.status as string) ?? "completed";
            const validStatus = ["completed", "cancelled"].includes(rawStatus)
              ? (rawStatus as "completed" | "cancelled")
              : "completed";

            if (!existsSync(planPath)) {
              return JSON.stringify({
                ok: false,
                action: "close",
                error: "No se encontró workspec/plans/active/plan.md",
              });
            }

            const content = readFileSync(planPath, "utf-8");
            let lines = content.split("\n");

            const updateResult = updateTaskStatus(lines, taskName, validStatus);
            if (!updateResult.found || updateResult.modifiedIndex === undefined) {
              return JSON.stringify({
                ok: false,
                action: "close",
                error: `Tarea '${taskName}' no encontrada en el plan.`,
              });
            }

            lines = updateResult.lines;
            const idx = updateResult.modifiedIndex;
            lines[idx] = addCloseTimestamp(lines[idx], now());

            writeFileSync(planPath, lines.join("\n"), "utf-8");

            const result: Record<string, unknown> = {
              ok: true,
              action: "close",
              task_name: taskName.trim(),
              status: validStatus,
              plan_updated: true,
              timestamp_closed: true,
            };

            // Detectar si se completó una fase
            try {
              const completed = getCompletedPhase(lines);
              if (completed) {
                result.phase_completed = true;
                result.phase_name = completed.phaseName;
              }
            } catch {
              /* si falla la detección de fase, se omite */
            }

            return JSON.stringify(result);
          }

          // ─────────────────────────────────────────────────────────────
          // STATUS
          // ─────────────────────────────────────────────────────────────
          if (action === "status") {
            if (!existsSync(planPath)) {
              return JSON.stringify({
                ok: true,
                action: "status",
                exists: false,
                summary: "No hay un plan activo. Definí una intención con la acción 'design'.",
              });
            }

            const content = readFileSync(planPath, "utf-8");

            try {
              const planData = parsePlan(content);
              const summary = formatPlanSummary(planData);

              return JSON.stringify({
                ok: true,
                action: "status",
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
                action: "status",
                exists: true,
                error: `Error al parsear plan.md: ${err instanceof Error ? err.message : String(err)}`,
              });
            }
          }

          // ─────────────────────────────────────────────────────────────
          // ARCHIVE
          // ─────────────────────────────────────────────────────────────
          if (action === "archive") {
            if (!existsSync(planPath)) {
              return JSON.stringify({
                ok: false,
                action: "archive",
                error: "No hay plan activo en workspec/plans/active/plan.md para archivar",
              });
            }

            const content = readFileSync(planPath, "utf-8");

            // Generar timestamp para el nombre del archivo
            const d = new Date();
            const pad = (n: number) => n.toString().padStart(2, "0");
            const ts = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
            const archiveName = `plan-${ts}.md`;
            const archivePath = join(oldDir, archiveName);

            if (!existsSync(oldDir)) mkdirSync(oldDir, { recursive: true });
            renameSync(planPath, archivePath);

            // Extraer métricas del plan archivado
            let archivedStats = {
              intention: "(no especificada)",
              completed_tasks: 0,
              total_tasks: 0,
              progress: "0%",
            };

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
              const totalTasks = (content.match(/- \[[ xX❌]\]/g) || []).length;
              archivedStats = {
                intention: "(extracción falló)",
                completed_tasks: completedTasks,
                total_tasks: totalTasks,
                progress: totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}%` : "0%",
              };
            }

            // Crear nuevo plan.md vacío con el mismo template que start_session
            const newIntention = (args.new_intention as string | undefined)?.trim();
            const template = [
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

            writeFileSync(planPath, template, "utf-8");

            return JSON.stringify({
              ok: true,
              action: "archive",
              archived: {
                file: archiveName,
                ...archivedStats,
              },
              new_plan: {
                intention: newIntention || "_pendiente_",
                path: "workspec/plans/active/plan.md",
              },
              message: `Plan archivado como ${archiveName}. Nuevo plan creado.`,
            });
          }

          // ─────────────────────────────────────────────────────────────
          // DEFAULT: acción desconocida
          // ─────────────────────────────────────────────────────────────
          return JSON.stringify({
            ok: false,
            error: `Acción inválida: '${action}'. Acciones válidas: design, start, close, status, archive`,
          });
        },
      }),
    },
  };
}) satisfies Plugin;
