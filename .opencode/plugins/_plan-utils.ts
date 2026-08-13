/**
 * _plan-utils.ts — Helper centralizado para parsing y manipulación de plan.md
 * 
 * Todos los plugins que trabajan con workspec/plans/active/plan.md deben usar
 * estas funciones en vez de parsear manualmente. Si el formato de plan.md cambia,
 * solo se actualiza este archivo.
 * 
 * Las tareas incluyen timestamps opcionales:
 *   - [ ] 🔵 nombre — desc  (creada: YYYY-MM-DD HH:mm)
 *   - [x] nombre — desc  (creada: YYYY-MM-DD HH:mm, cerrada: YYYY-MM-DD HH:mm)
 */

export interface PlanTask {
  text: string;
  completed: boolean;
  inProgress: boolean;
  cancelled: boolean;
}

export interface PlanPhase {
  name: string;
  tasks: PlanTask[];
}

export interface PlanData {
  intention: string;
  phases: PlanPhase[];
  dependencies: string;
  notes: string;
  stats: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    progressPercent: number;
  };
}

/** Genera timestamp con formato "YYYY-MM-DD HH:mm" */
function now(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── PARSING ─────────────────────────────────────────────────────────────────

/**
 * Parsea el contenido de plan.md y devuelve una estructura limpia.
 * Tolerante a: espacios extra, 🔵, ❌, timestamps, variaciones de checkbox.
 */
export function parsePlan(content: string): PlanData {
  const lines = content.split("\n");
  const data: PlanData = {
    intention: "",
    phases: [],
    dependencies: "",
    notes: "",
    stats: { totalTasks: 0, completedTasks: 0, inProgressTasks: 0, progressPercent: 0 },
  };

  let currentSection = "";
  let currentPhase: PlanPhase | null = null;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (trimmed.startsWith("## Intención")) { currentSection = "intention"; continue; }
    if (trimmed.startsWith("## Fases") || trimmed.startsWith("### Fases")) { currentSection = "phases"; continue; }
    if (trimmed.startsWith("## Dependencias") || trimmed.startsWith("### Dependencias")) { currentSection = "dependencies"; continue; }
    if (trimmed.startsWith("## Notas") || trimmed.startsWith("### Notas")) { currentSection = "notes"; continue; }
    if (trimmed.startsWith("## ")) { currentSection = ""; continue; }

    if (currentSection === "intention" && trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("---")) {
      data.intention = trimmed.replace(/^_+|_+$/g, "");
      continue;
    }

    if (currentSection === "phases") {
      const phaseMatch = trimmed.match(/^###\s+(.+)/);
      if (phaseMatch) {
        if (currentPhase) data.phases.push(currentPhase);
        currentPhase = { name: phaseMatch[1].trim(), tasks: [] };
        continue;
      }

      const taskMatch = trimmed.match(/^-\s+\[([ xX❌])\]\s*(🔵)?\s*(.+)/);
      if (taskMatch && currentPhase) {
        const isCompleted = taskMatch[1] === "x" || taskMatch[1] === "X";
        const isCancelled = taskMatch[1] === "❌" || trimmed.includes("❌");
        const inProgress = !!taskMatch[2] || trimmed.includes("🔵");
        const text = (taskMatch[3] || "").trim();
        currentPhase.tasks.push({ text, completed: isCompleted || isCancelled, inProgress, cancelled: isCancelled });
      }
      continue;
    }

    if (currentSection === "dependencies" && trimmed && !trimmed.startsWith("#")) {
      data.dependencies += (data.dependencies ? "\n" : "") + trimmed;
      continue;
    }

    if (currentSection === "notes" && trimmed && !trimmed.startsWith("#")) {
      data.notes += (data.notes ? "\n" : "") + trimmed;
    }
  }

  if (currentPhase) data.phases.push(currentPhase);

  for (const phase of data.phases) {
    for (const task of phase.tasks) {
      data.stats.totalTasks++;
      if (task.completed) data.stats.completedTasks++;
      if (task.inProgress) data.stats.inProgressTasks++;
    }
  }
  data.stats.progressPercent = data.stats.totalTasks > 0
    ? Math.round((data.stats.completedTasks / data.stats.totalTasks) * 100)
    : 0;

  return data;
}

// ─── MODIFICACIÓN DE LÍNEAS ─────────────────────────────────────────────────

/**
 * Busca una tarea por nombre en las líneas de plan.md y actualiza su estado.
 * Retorna las líneas modificadas, si encontró la tarea, y el índice de la línea modificada.
 * Búsqueda flexible: por nombre exacto, por substring, case-insensitive.
 */
export function updateTaskStatus(
  lines: string[],
  searchText: string,
  newStatus: "completed" | "pending" | "cancelled"
): { lines: string[]; found: boolean; modifiedIndex?: number } {
  const result = [...lines];
  let found = false;
  let modifiedIndex: number | undefined;

  for (let i = 0; i < result.length; i++) {
    const line = result[i];
    const clean = line.replace(/ 🔵/g, "").replace(/ ❌/g, "").trim();
    const match = clean.match(/^-\s+\[([ xX])\]\s*(.+)/);
    if (!match) continue;

    const taskText = match[2].trim().toLowerCase();
    const search = searchText.toLowerCase();

    if (taskText.includes(search) || search.includes(taskText)) {
      found = true;
      modifiedIndex = i;

      if (newStatus === "completed") {
        result[i] = line
          .replace(/^(-\s+)\[[ xX]\]/, "$1[x]")
          .replace(/ 🔵/g, "")
          .replace(/ ❌/g, "");
      } else if (newStatus === "pending") {
        result[i] = line
          .replace(/^(-\s+)\[[ xX]\]/, "$1[ ]")
          .replace(/ 🔵/g, "")
          .replace(/ ❌/g, "");
      } else if (newStatus === "cancelled") {
        result[i] = line
          .replace(/^(-\s+)\[[ xX]\]/, "$1[x]")
          .replace(/ 🔵/g, "")
          .replace(/\s*$/, "") + " ❌";
      }
      break;
    }
  }

  return { lines: result, found, modifiedIndex };
}

/**
 * Agrega una tarea a la última fase del plan, con timestamp de creación.
 * Retorna las líneas modificadas y si pudo agregarla.
 */
export function addTaskToLatestPhase(
  lines: string[],
  taskName: string,
  description?: string
): { lines: string[]; added: boolean } {
  const result = [...lines];
  let lastPhaseIdx = -1;

  for (let i = 0; i < result.length; i++) {
    if (result[i].trim().startsWith("### ")) {
      lastPhaseIdx = i;
    }
  }

  if (lastPhaseIdx < 0) return { lines: result, added: false };

  let insertIdx = result.length;
  for (let i = lastPhaseIdx + 1; i < result.length; i++) {
    if (result[i].trim().startsWith("## ") || (result[i].trim().startsWith("### ") && i !== lastPhaseIdx)) {
      insertIdx = i;
      break;
    }
  }

  const timestamp = now();
  const descText = description ? ` — ${description}` : "";
  result.splice(insertIdx, 0, `- [ ] 🔵 ${taskName}${descText}  (creada: ${timestamp})`);

  return { lines: result, added: true };
}

// ─── TIMESTAMPS ──────────────────────────────────────────────────────────────

/**
 * Agrega timestamp de creación a una línea de tarea si no lo tiene.
 * Retorna la línea modificada.
 */
export function addCreationTimestamp(line: string, ts?: string): string {
  if (line.includes("(creada:")) return line; // ya tiene timestamp
  const stamp = ts || now();
  return line.replace(/\s*$/, "") + `  (creada: ${stamp})`;
}

/**
 * Agrega timestamp de cierre a una línea de tarea si no lo tiene.
 * Maneja tres casos:
 *   1. Ya tiene (creada: ...) → reemplaza el ) final por , cerrada: ...)
 *   2. No tiene ningún timestamp → agrega (creada: ..., cerrada: ...)
 *   3. Ya tiene (cerrada: ...) → no modifica
 * Retorna la línea modificada.
 */
export function addCloseTimestamp(line: string, ts?: string): string {
  if (line.includes("(cerrada:")) return line; // ya tiene timestamp de cierre
  const stamp = ts || now();

  // Caso 1: tiene (creada: ...) → insertar antes del ) final
  const creadaMatch = line.match(/(.*\(creada:\s*[^)]+)\)\s*$/);
  if (creadaMatch) {
    return creadaMatch[1] + `, cerrada: ${stamp})`;
  }

  // Caso 2: no tiene ningún timestamp → agregar ambos
  return line.replace(/\s*$/, "") + `  (creada: ${stamp}, cerrada: ${stamp})`;
}

// ─── ANÁLISIS DE FASES ──────────────────────────────────────────────────────

/**
 * Detecta si una fase está completamente terminada.
 */
export function getCompletedPhase(lines: string[]): { phaseName: string; allDone: boolean } | null {
  const content = lines.join("\n");
  const data = parsePlan(content);

  for (const phase of data.phases) {
    if (phase.tasks.length === 0) continue;
    const allDone = phase.tasks.every((t) => t.completed || t.cancelled);
    if (allDone) return { phaseName: phase.name, allDone: true };
  }

  return null;
}

// ─── FORMATTING ──────────────────────────────────────────────────────────────

/**
 * Genera un resumen legible del plan.
 */
export function formatPlanSummary(data: PlanData): string {
  let summary = `📋 ${data.intention || "Plan activo"}\n\n`;

  for (const phase of data.phases) {
    const done = phase.tasks.filter((t) => t.completed || t.cancelled).length;
    const inProg = phase.tasks.filter((t) => t.inProgress).length;
    summary += `▸ ${phase.name} (${done}/${phase.tasks.length}`;
    if (inProg > 0) summary += `, ${inProg} en curso`;
    summary += ")\n";

    for (const task of phase.tasks) {
      const icon = task.cancelled ? "❌" : task.completed ? "✅" : task.inProgress ? "🔄" : "⬜";
      summary += `  ${icon} ${task.text}\n`;
    }
    summary += "\n";
  }

  if (data.dependencies && !["-", "—"].includes(data.dependencies.trim()) && !data.dependencies.trim().startsWith("_")) {
    summary += `🔗 Dependencias: ${data.dependencies}\n\n`;
  }
  if (data.notes && !["-", "—"].includes(data.notes.trim()) && !data.notes.trim().startsWith("_")) {
    summary += `📝 Notas: ${data.notes}\n`;
  }

  summary += `\nProgreso: ${data.stats.completedTasks}/${data.stats.totalTasks} (${data.stats.progressPercent}%)`;
  if (data.stats.inProgressTasks > 0) {
    summary += ` — ${data.stats.inProgressTasks} en ejecución`;
  }

  return summary;
}

export { now };
