import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { tool } from "@opencode-ai/plugin";
import type { Plugin } from "@opencode-ai/plugin";

// Niveles válidos de nivel_tecnico (single source para validar + sync).
const NIVELES_VALIDOS = ["principiante", "medio", "avanzado"];

// Encabezado para crear workspec/constante/contantes.md si no existe.
// Respeta el formato del ecosistema: cada constante es ## <id>: <título>
// con - estado: y - detalle:. Una línea "- "/"## " SIN indentar es
// propiedad/sección nueva — nunca escribir "clave: valor" sueltas.
const CONTANTES_HEADER = `# Constantes de trabajo

> Cómo quiere laburar el usuario. Las gestiona Refiner. Se inyectan en cada request.
> Formato: cada constante es una sección \`## <id>: <título>\` con \`- estado:\` (activa|inactiva) y \`- detalle:\`.
> Las constantes ACTIVAS se inyectan automáticamente en el system prompt de cada request (efecto inmediato, sin recargar OpenCode).
> Al editar a mano: las continuaciones del detalle van indentadas con 2 espacios. Una línea que empiece con \`- \` o \`## \` SIN indentar se interpreta como propiedad nueva o sección nueva.
`;

/**
 * Sincroniza UNA constante en contantes.md (crea archivo/dir si faltan).
 * - Si la sección `## <id>:` existe: reemplaza la línea `etiqueta: ...`
 *   dentro de esa sección (entre su header y el próximo `## `).
 * - Si no existe: agrega la sección al final con el formato estándar.
 * Devuelve { synced: true, created: boolean } o { synced: false, error }.
 */
function syncConstante(
  dir: string,
  id: string,
  titulo: string,
  etiqueta: string,
  valor: string,
  extraDetalle: string[],
): { synced: boolean; created?: boolean; error?: string } {
  try {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const file = join(dir, "contantes.md");
    let content = existsSync(file) ? readFileSync(file, "utf-8") : CONTANTES_HEADER + "\n";
    if (!content.endsWith("\n")) content += "\n";

    const headerRe = new RegExp(`^##\\s+${id}\\s*:`, "m");
    if (headerRe.test(content)) {
      // Reemplazar "etiqueta: <viejo>" solo dentro de la sección.
      const lines = content.split("\n");
      const start = lines.findIndex((l) => new RegExp(`^##\\s+${id}\\s*:`).test(l));
      let end = lines.findIndex((l, i) => i > start && /^##\s+/.test(l));
      if (end === -1) end = lines.length;
      const etiquetaRe = new RegExp(`^([\\s-]*detalle:\\s*)?${etiqueta}:\\s*.*$`);
      let replaced = false;
      for (let i = start; i < end; i++) {
        if (etiquetaRe.test(lines[i]) && /detalle:/.test(lines[i])) {
          lines[i] = lines[i].replace(new RegExp(`${etiqueta}:\\s*.*$`), `${etiqueta}: ${valor}`);
          replaced = true;
          break;
        }
      }
      // Fallback: la etiqueta puede estar en una continuación indentada.
      if (!replaced) {
        const contRe = new RegExp(`^\\s+${etiqueta}:\\s*.*$`);
        for (let i = start; i < end; i++) {
          if (contRe.test(lines[i])) {
            lines[i] = lines[i].replace(new RegExp(`${etiqueta}:\\s*.*$`), `${etiqueta}: ${valor}`);
            replaced = true;
            break;
          }
        }
      }
      if (!replaced) {
        return { synced: false, error: `sección ## ${id}: existe pero no tiene línea "${etiqueta}:" — sincronizar a mano` };
      }
      content = lines.join("\n");
      writeFileSync(file, content, "utf-8");
      return { synced: true, created: false };
    }

    // Sección inexistente: agregarla al final con formato estándar.
    const detalleExtra = extraDetalle.length > 0 ? "\n" + extraDetalle.map((l) => `  ${l}`).join("\n") : "";
    content += `\n## ${id}: ${titulo}\n- estado: activa\n- detalle: ${etiqueta}: ${valor}${detalleExtra}\n`;
    writeFileSync(file, content, "utf-8");
    return { synced: true, created: true };
  } catch (e) {
    return { synced: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export default (async () => {
  return {
    tool: {
      econative_save_preferences: tool({
        description:
          "Guarda las preferencias del usuario (nombre, idioma y nivel técnico) en workspec/preferences-user/config.json. Nivel: principiante | medio | avanzado. Además sincroniza workspec/constante/contantes.md (constantes nivel-tecnico y modelo-vision) como single-writer.",
        args: {
          name: tool.schema.string().describe("Nombre del usuario"),
          language: tool.schema.string().describe("Idioma preferido: es | en | bilingue"),
          nivel_tecnico: tool.schema.string().optional().describe("Nivel técnico: principiante | medio | avanzado (default: principiante)"),
          modelo_vision: tool.schema.string().optional().describe("Modelo multimodal de visión para Ojo/PDF (ej: deepseek-v4-flash-vision-exp). Si no tiene, 'no-configurado'."),
        },
        async execute(args, context) {
          const prefsDir = join(context.directory, "workspec", "preferences-user");
          if (!existsSync(prefsDir)) mkdirSync(prefsDir, { recursive: true });

          // Validar nivel
          let nivel = (args.nivel_tecnico as string | undefined)?.trim().toLowerCase();
          if (!nivel) nivel = "principiante";
          if (!NIVELES_VALIDOS.includes(nivel)) {
            return JSON.stringify({ ok: false, error: `nivel_tecnico inválido: "${args.nivel_tecnico}". Usá principiante | medio | avanzado.` });
          }

          const prefs: Record<string, string> = { name: args.name, language: args.language, nivel_tecnico: nivel };

          // modelo_vision es opcional: solo se guarda si viene en args.
          const modeloArg = (args.modelo_vision as string | undefined)?.trim();
          if (modeloArg) prefs["modelo_vision"] = modeloArg;

          // Mantener compat: si ya existe config con otros campos, mergear.
          // OJO: Object.assign(prefs, prev, prefs) NO sirve — el 3er arg es el
          // mismo objeto ya mutado por prev (no-op) y los args nuevos se pierden.
          // Se_snapshotan los valores frescos para que los args nuevos ganen.
          const fresh = { ...prefs };
          const file = join(prefsDir, "config.json");
          if (existsSync(file)) {
            try {
              const prev = JSON.parse(readFileSync(file, "utf-8"));
              Object.assign(prefs, prev, fresh);
            } catch {}
          }

          writeFileSync(file, JSON.stringify(prefs, null, 2), "utf-8");

          // Single-writer: sincronizar contantes.md (ADITIVO, no rompe config.json).
          // Formato real del archivo: secciones ## <id>: — nunca "clave: valor" sueltas.
          const constanteDir = join(context.directory, "workspec", "constante");
          const syncNivel = syncConstante(
            constanteDir,
            "nivel-tecnico",
            "Nivel técnico del usuario — principiante | medio | avanzado",
            "Nivel actual",
            nivel,
            [],
          );
          let syncVision: { synced: boolean; created?: boolean; error?: string } | null = null;
          const modeloFinal = prefs["modelo_vision"];
          if (modeloFinal) {
            syncVision = syncConstante(
              constanteDir,
              "modelo-vision",
              "Modelo de visión para Ojo y PDF",
              "Modelo actual",
              modeloFinal,
              ["Si está en no-configurado: Ojo/PDF operan con el modelo default y reportan limitaciones con honestidad."],
            );
          }

          return JSON.stringify({
            ok: true,
            preferences: prefs,
            sync_contantes: { "nivel-tecnico": syncNivel, "modelo-vision": syncVision },
          });
        },
      }),
    },
  };
}) satisfies Plugin;
