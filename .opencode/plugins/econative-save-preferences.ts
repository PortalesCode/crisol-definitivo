import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { tool } from "@opencode-ai/plugin";
import type { Plugin } from "@opencode-ai/plugin";

export default (async () => {
  return {
    tool: {
      econative_save_preferences: tool({
        description:
          "Guarda las preferencias del usuario (nombre, idioma y nivel técnico) en workspec/preferences-user/config.json. Nivel: principiante | medio | avanzado.",
        args: {
          name: tool.schema.string().describe("Nombre del usuario"),
          language: tool.schema.string().describe("Idioma preferido: es | en | bilingue"),
          nivel_tecnico: tool.schema.string().optional().describe("Nivel técnico: principiante | medio | avanzado (default: principiante)"),
        },
        async execute(args, context) {
          const prefsDir = join(context.directory, "workspec", "preferences-user");
          if (!existsSync(prefsDir)) mkdirSync(prefsDir, { recursive: true });

          // Validar nivel
          let nivel = (args.nivel_tecnico as string | undefined)?.trim().toLowerCase();
          const validos = ["principiante", "medio", "avanzado"];
          if (!nivel) nivel = "principiante";
          if (!validos.includes(nivel)) {
            return JSON.stringify({ ok: false, error: `nivel_tecnico inválido: "${args.nivel_tecnico}". Usá principiante | medio | avanzado.` });
          }

          const prefs = { name: args.name, language: args.language, nivel_tecnico: nivel };

          // Mantener compat: si ya existe config con otros campos, mergear
          const file = join(prefsDir, "config.json");
          if (existsSync(file)) {
            try {
              const prev = JSON.parse(readFileSync(file, "utf-8"));
              Object.assign(prefs, prev, prefs);
            } catch {}
          }

          writeFileSync(file, JSON.stringify(prefs, null, 2), "utf-8");

          return JSON.stringify({ ok: true, preferences: prefs });
        },
      }),
    },
  };
}) satisfies Plugin;
