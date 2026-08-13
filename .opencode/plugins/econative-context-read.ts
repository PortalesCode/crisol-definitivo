import { readFileSync, existsSync, readdirSync } from "fs";
import { join, extname, basename } from "path";
import { tool } from "@opencode-ai/plugin";
import type { Plugin } from "@opencode-ai/plugin";

export default (async () => {
  return {
    tool: {
      econative_context_read: tool({
        description:
          "Lee los 4 archivos de contexto del proyecto (PROJECT.md, CONVENTIONS.md, ARCHITECTURE.md, STATUS.md) "
          + "desde workspec/context/ en la raíz del proyecto. Devuelve cada archivo con su nombre y contenido completo. "
          + "Útil para que Refiner consulte el estado actual del proyecto sin depender de start_session.",
        args: {},
        async execute(_args, context) {
          const ctxDir = join(context.directory, "workspec", "context");

          if (!existsSync(ctxDir)) {
            return JSON.stringify({
              ok: false,
              error: "No se encontró la carpeta workspec/context/ en la raíz del proyecto",
            });
          }

          const files = readdirSync(ctxDir).filter((f) => extname(f) === ".md");
          if (files.length === 0) {
            return JSON.stringify({ ok: true, context: {}, message: "No hay archivos de contexto todavía" });
          }

          const contextFiles: Record<string, { file: string; content: string }> = {};

          for (const file of files) {
            const name = basename(file, ".md");
            const content = readFileSync(join(ctxDir, file), "utf-8");
            contextFiles[name] = { file, content };
          }

          const summary = files.map((f) => {
            const name = basename(f, ".md");
            const lines = readFileSync(join(ctxDir, f), "utf-8").split("\n");
            const preview = lines.slice(0, 5).join(" ").slice(0, 100);
            return `  - ${name}: ${preview}...`;
          }).join("\n");

          return JSON.stringify({
            ok: true,
            count: files.length,
            files: Object.keys(contextFiles),
            summary: `Archivos encontrados:\n${summary}`,
            context: contextFiles,
          }, null, 2);
        },
      }),
    },
  };
}) satisfies Plugin;