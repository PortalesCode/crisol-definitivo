import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from "fs";
import { join } from "path";
import { tool } from "@opencode-ai/plugin";
import type { Plugin } from "@opencode-ai/plugin";

function now(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default (async () => {
  return {
    tool: {
      econative_patch_rapido: tool({
        description:
          "Registra un patch rápido en workspec/context/PATCH-RAPIDO.md. "
          + "Patcheador lo llama al cerrar cada tarea chica: fecha, archivo(s), cambio, por qué (significado de Refiner) y por qué fue trivial mandarlo a Patcheador. "
          + "Crea el archivo si no existe y hace append.",
        args: {
          cambio: tool.schema.string().describe("Descripción corta del cambio (qué se hizo)"),
          porque: tool.schema.string().describe("Significado: por qué Refiner pidió este patch (para qué sirve)"),
          porque_simple: tool.schema.string().describe("Por qué fue simple y no ameritó North/Executor/Auditor"),
          archivos: tool.schema.string().optional().describe("Archivo(s) tocados, separados por coma si son varios"),
          resultado: tool.schema.string().optional().describe("Resultado: ok, error, o detalle de verificación"),
          feedback: tool.schema.string().optional().describe("Feedback elegante de avance/problemas: qué salió bien, trabas, cómo se resolvió, o 'sin novedades' si fue limpio"),
        },
        async execute(args, context) {
          const cambio = (args.cambio as string)?.trim();
          const porque = (args.porque as string)?.trim();
          const porque_simple = (args.porque_simple as string)?.trim();
          const archivos = (args.archivos as string | undefined)?.trim() || "—";
          const resultado = (args.resultado as string | undefined)?.trim() || "ok";
          const feedback = (args.feedback as string | undefined)?.trim() || "—";

          if (!cambio) return JSON.stringify({ ok: false, error: "Se requiere 'cambio' (string no vacío)" });
          if (!porque) return JSON.stringify({ ok: false, error: "Se requiere 'porque' — Refiner debe darle significado al patch" });
          if (!porque_simple) return JSON.stringify({ ok: false, error: "Se requiere 'porque_simple' — explicar por qué fue trivial" });

          const ctxDir = join(context.directory, "workspec", "context");
          const file = join(ctxDir, "PATCH-RAPIDO.md");

          if (!existsSync(ctxDir)) mkdirSync(ctxDir, { recursive: true });

          if (!existsSync(file)) {
            const header = [
              "# PATCH-RAPIDO",
              "",
              "> Log de patches rápidos de Patcheador.",
              "",
              "---",
              "",
              "## Entradas",
              "",
            ].join("\n");
            writeFileSync(file, header, "utf-8");
          }

          const fecha = now();
          const entry = [
            `### ${fecha} — ${cambio}`,
            "",
            `- **Archivo(s):** ${archivos}`,
            `- **Cambio:** ${cambio}`,
            `- **Por qué:** ${porque}`,
            `- **Por qué fue a Patcheador:** ${porque_simple}`,
            `- **Resultado:** ${resultado}`,
            `- **Feedback:** ${feedback}`,
            "",
          ].join("\n");

          // Verificar que no haya marca de ejemplo sin borrar
          let existing = "";
          try { existing = readFileSync(file, "utf-8"); } catch {}

          appendFileSync(file, entry, "utf-8");

          return JSON.stringify({
            ok: true,
            file: "workspec/context/PATCH-RAPIDO.md",
            fecha,
            cambio,
            archivos,
          });
        },
      }),
    },
  };
}) satisfies Plugin;
