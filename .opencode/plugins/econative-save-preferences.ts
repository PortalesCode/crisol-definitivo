import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { tool } from "@opencode-ai/plugin";
import type { Plugin } from "@opencode-ai/plugin";

export default (async () => {
  return {
    tool: {
      econative_save_preferences: tool({
        description:
          "Guarda las preferencias del usuario (nombre e idioma) en workspec/preferences-user/config.json.",
        args: {
          name: tool.schema.string().describe("Nombre del usuario"),
          language: tool.schema.string().describe("Idioma preferido: es | en | bilingue"),
        },
        async execute(args, context) {
          const prefsDir = join(context.directory, "workspec", "preferences-user");
          if (!existsSync(prefsDir)) mkdirSync(prefsDir, { recursive: true });

          writeFileSync(
            join(prefsDir, "config.json"),
            JSON.stringify({ name: args.name, language: args.language }, null, 2),
            "utf-8"
          );

          return JSON.stringify({ ok: true, preferences: { name: args.name, language: args.language } });
        },
      }),
    },
  };
}) satisfies Plugin;
