import { readFileSync, existsSync } from "fs";
import { dirname, join, resolve } from "path";
import { spawn } from "child_process";
import { tool } from "@opencode-ai/plugin";
import type { Plugin } from "@opencode-ai/plugin";

/**
 * Túnel de investigación — plugin de conocimiento.
 *
 * 3 tools:
 *  - econative_investigar: puerta de entrada NO bloqueante. Valida, dedupe contra
 *    el index y lanza `opencode run --agent tunel-investigador` en background
 *    desde la raíz del repo. Devuelve un ticket con pid.
 *  - econative_conocimiento_buscar: búsqueda barata en el index (solo metadata).
 *  - econative_conocimiento_leer: lee el contenido completo de un entry.
 *
 * Contrato de retorno (aprendido con sangre): las custom tools devuelven STRING.
 * Nunca un objeto plano — los retornos objeto crashean con c.split.
 * Por eso toda respuesta va envuelta en { output: JSON.stringify(payload) }.
 */

const LIB_DIR = join("workspec", "knowledge-library");
const INDEX_FILE = join(LIB_DIR, "index.json");

interface IndexEntry {
  file?: string;
  title?: string;
  descripcion_corta?: string;
  domain?: string;
  status?: string;
  updated_at?: string;
  topic_key?: string;
  [k: string]: unknown;
}

interface KnowledgeIndex {
  entries: Record<string, IndexEntry>;
  domains: Record<string, unknown>;
}

type IndexResult = { index: KnowledgeIndex } | { error: string };

// ---- helpers ----

/**
 * Slugify estándar: NFD (quita acentos) + lowercase + [^a-z0-9]+ → "-".
 * Truncado: si supera maxLen (80), corta en el último "-" dentro de los
 * primeros 80 chars cuando esa posición es > 40; si no, corta en 40.
 */
function slugify(input: string, maxLen = 80): string {
  const s = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (s.length <= maxLen) return s;
  const slice = s.slice(0, maxLen);
  const lastDash = slice.lastIndexOf("-");
  if (lastDash > 40) return slice.slice(0, lastDash);
  return slice.slice(0, 40);
}

function readIndex(root: string): IndexResult {
  const indexPath = join(root, INDEX_FILE);
  if (!existsSync(indexPath)) {
    return { error: `biblioteca no inicializada — falta ${INDEX_FILE}` };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(indexPath, "utf-8"));
  } catch {
    return { error: "biblioteca corrupta — index.json no es JSON válido" };
  }
  if (
    !raw || typeof raw !== "object" || Array.isArray(raw)
    || !("entries" in raw) || typeof (raw as KnowledgeIndex).entries !== "object"
    || (raw as KnowledgeIndex).entries === null
  ) {
    return { error: "biblioteca corrupta — index.json no tiene la forma { entries: {...} }" };
  }
  return { index: raw as KnowledgeIndex };
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Resuelve la raíz del repo del ecosistema subiendo desde `start` hacia la raíz
 * del sistema. La raíz es el directorio que contiene opencode.json Y
 * .opencode/agents/tunel-investigador.md — UN NIVEL MÁS ARRIBA que .opencode/.
 * El `opencode run --agent tunel-investigador` debe lanzarse parado ahí, no en
 * el cwd del server de OpenCode ni dentro de .opencode/. Devuelve null si no
 * encuentra ninguna raíz válida.
 */
function resolveRepoRoot(start: string): string | null {
  // Sube desde `start` hasta la raíz del sistema buscando un directorio que
  // sea la raíz del repo del ecosistema: tiene opencode.json y .opencode/agents/
  // con tunel-investigador.md. El `opencode run --agent tunel-investigador`
  // debe lanzarse parado en la raíz del repo (UN NIVEL MÁS ARRIBA que .opencode/),
  // no en el cwd del server ni dentro de .opencode/.
  let dir = resolve(start || process.cwd());
  for (;;) {
    const hasOpenCodeJson = existsSync(join(dir, "opencode.json"));
    const hasTunelAgent = existsSync(join(dir, ".opencode", "agents", "tunel-investigador.md"));
    if (hasOpenCodeJson && hasTunelAgent) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export default (async () => {
  return {
    tool: {
      econative_investigar: tool({
        description:
          "Puerta de entrada al túnel de investigación. NO BLOQUEANTE: valida topics, "
          + "hace dedupe contra el index y lanza UN SOLO `opencode run --agent tunel-investigador` "
          + "en background desde la raíz del repo. "
          + "Acepta `topic` (uno solo) o `topics` (varios en un mismo envión — evita saturar CPU "
          + "con múltiples runtimes). "
          + "Devuelve un ticket con status 'investigando', topics[], keys[], el archivo esperado "
          + "y el pid. El conocimiento queda disponible en la biblioteca en ~5 minutos — NO esperar activamente. "
          + "Si algún topic ya existe en el index, se reporta en already_exists y no se re-investiga. "
          + 'Ejemplo: econative_investigar({ topics: ["historia de warcraft", "historia de gta vice city"], domain: "videojuegos" }). '
          + "Los topics deben ser CONCISOS (frase breve, sin paréntesis ni comas complejas). Topics extensos pueden generar JSON inválido en la llamada.",
        args: {
          topic: tool.schema.string().optional().describe("Tema a investigar (opcional si usás topics)"),
          topics: tool.schema.array(tool.schema.string()).optional().describe("Lista de temas a investigar en un solo envión (multi-topic). Alternativa a topic. Con varios topics se lanza UN solo opencode run que investiga todos."),
          domain: tool.schema.string().optional().describe("Dominio de la biblioteca (default: general)"),
          modo: tool.schema.string().optional().describe("Modo del subagente: investigar | expandir (default: investigar)"),
        },
        async execute(args, context) {
          try {
            const startDir = (context.directory as string) || process.cwd();
            const root = resolveRepoRoot(startDir);
            if (!root) {
              return {
                output: JSON.stringify({
                  ok: false,
                  error: `No se encontró la raíz del repo del ecosistema (opencode.json + .opencode/agents/tunel-investigador.md) desde ${startDir}`,
                }),
              };
            }

            const topicRaw = (args.topic as string | undefined)?.trim() || "";
            const topicsRaw = Array.isArray(args.topics) ? args.topics : [];
            const topics = [
              ...(topicRaw ? [topicRaw] : []),
              ...topicsRaw.map((t: unknown) => String(t).trim()).filter((t: string) => t.length > 0),
            ].filter((v, i, a) => a.indexOf(v) === i); // dedupe por texto exacto
            if (topics.length === 0) {
              return { output: JSON.stringify({ ok: false, error: "topic o topics es obligatorio" }) };
            }

            const pipeTopic = topics.find((t: string) => t.includes("|"));
            if (pipeTopic) {
              return {
                output: JSON.stringify({
                  ok: false,
                  error: `topic no puede contener '|' (es el separador interno del túnel): "${pipeTopic}"`,
                }),
              };
            }

            const domainRaw = ((args.domain as string | undefined)?.trim() || "general");
            const modo = (args.modo as string | undefined) === "expandir" ? "expandir" : "investigar";
            const domain = slugify(domainRaw) || "general";

            const indexRes = readIndex(root);
            if ("error" in indexRes) {
              return { output: JSON.stringify({ ok: false, error: indexRes.error }) };
            }
            const index = indexRes.index;

            const entries = topics.map((t: string) => {
              const slug = slugify(t) || "tema";
              const key = `${domain}/${slug}`;
              const file = `${key}.md`;
              const existing = index.entries[key] as Record<string, unknown> | undefined;
              return { topic: t, slug, key, file, existing: existing ?? null };
            });

            const seenKeys = new Set<string>();
            const dedupedEntries: typeof entries = [];
            for (const e of entries) {
              if (seenKeys.has(e.key)) continue;
              seenKeys.add(e.key);
              dedupedEntries.push(e);
            }

            const toInvestigate = dedupedEntries.filter((e) => !e.existing);
            const alreadyExists = dedupedEntries.filter((e) => e.existing);

            if (toInvestigate.length === 0) {
              return {
                output: JSON.stringify({
                  ok: false,
                  already_exists: true,
                  keys: dedupedEntries.map((e) => e.key),
                  topics: dedupedEntries.map((e) => e.topic),
                  message: "todos los temas ya existen — usá modo expandir",
                }),
              };
            }

            const prompt = `modo=${modo} topics=${toInvestigate.map((e) => e.topic).join("|")} domain=${domain} biblioteca=${LIB_DIR}`;

            let child;
            try {
              child = spawn("opencode", ["run", "--agent", "tunel-investigador", prompt], {
                cwd: root,
                env: { ...process.env, OPENCODE_SUBAGENT: "1" },
                detached: true,
                stdio: "ignore",
              });
            } catch (err) {
              return {
                output: JSON.stringify({
                  ok: false,
                  error: `no se pudo lanzar opencode run: ${errMsg(err)}`,
                }),
              };
            }

            child.on("error", () => {});
            child.unref();

            return {
              output: JSON.stringify({
                ok: true,
                status: "investigando",
                topics: toInvestigate.map((e) => e.topic),
                keys: toInvestigate.map((e) => e.key),
                files: toInvestigate.map((e) => e.file),
                already_exists: alreadyExists.map((e) => e.key),
                topic: toInvestigate[0]?.topic ?? null,
                key: toInvestigate[0]?.key ?? null,
                domain,
                modo,
                pid: child.pid ?? null,
                message: "Investigación lanzada (no bloqueante). El conocimiento queda disponible en la biblioteca en unos minutos (~5 min).",
              }),
            };
          } catch (err) {
            return { output: JSON.stringify({ ok: false, error: errMsg(err) }) };
          }
        },
      }),

      econative_conocimiento_buscar: tool({
        description:
          "Búsqueda BARATA en el index de la biblioteca de conocimiento. Devuelve SOLO "
          + "metadata (topic_key, title, descripcion_corta, domain, status, updated_at) — "
          + "sin contenido completo, para ahorrar tokens. Filtra por texto (case-insensitive "
          + "contra title + descripcion_corta + topic_key) y/o por dominio exacto.",
        args: {
          query: tool.schema.string().optional().describe("Filtro por texto en título/descripción/keywords"),
          domain: tool.schema.string().optional().describe("Filtro por dominio exacto"),
          limit: tool.schema.number().optional().describe("Máximo de resultados (default: 20)"),
        },
        async execute(args, context) {
          try {
            const startDir = (context.directory as string) || process.cwd();
            const root = resolveRepoRoot(startDir);
            if (!root) {
              return {
                output: JSON.stringify({
                  ok: false,
                  error: `No se encontró la raíz del repo del ecosistema (opencode.json + .opencode/agents/tunel-investigador.md) desde ${startDir}`,
                }),
              };
            }

            const query = ((args.query as string | undefined)?.trim() || "").toLowerCase();
            const domainFilter = (args.domain as string | undefined)?.trim() || "";

            const limitRaw = typeof args.limit === "number" ? args.limit : 20;
            const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : 20;

            const indexRes = readIndex(root);
            if ("error" in indexRes) {
              return { output: JSON.stringify({ ok: false, error: indexRes.error }) };
            }

            const entries = indexRes.index.entries;
            const keys = Object.keys(entries);
            if (keys.length === 0) {
              return { output: JSON.stringify({ ok: true, total: 0, results: [] }) };
            }

            const results: Array<Record<string, string>> = [];
            for (const key of keys) {
              const e = entries[key];
              const topicKey = (e.topic_key as string | undefined) || key;
              const title = (e.title as string | undefined) || "";
              const desc = (e.descripcion_corta as string | undefined) || "";
              const domain = (e.domain as string | undefined) || key.split("/")[0];

              if (domainFilter && domain !== domainFilter) continue;
              if (query) {
                const haystack = `${title} ${desc} ${topicKey}`.toLowerCase();
                if (!haystack.includes(query)) continue;
              }

              results.push({
                topic_key: topicKey,
                title,
                descripcion_corta: desc,
                domain,
                status: (e.status as string | undefined) || "active",
                updated_at: (e.updated_at as string | undefined) || "",
              });
              if (results.length >= limit) break;
            }

            return { output: JSON.stringify({ ok: true, total: results.length, results }) };
          } catch (err) {
            return { output: JSON.stringify({ ok: false, error: errMsg(err) }) };
          }
        },
      }),

      econative_conocimiento_leer: tool({
        description:
          "Lee el contenido COMPLETO (markdown) de un entry de la biblioteca de conocimiento. "
          + "Acepta la key exacta 'domain/slug' o solo el slug (lo matchea por suffix contra "
          + "el index). Devuelve ok: true con key, title, file y el markdown completo.",
        args: {
          key: tool.schema.string().describe("topic_key formato 'domain/slug' (o solo el slug)"),
        },
        async execute(args, context) {
          try {
            const startDir = (context.directory as string) || process.cwd();
            const root = resolveRepoRoot(startDir);
            if (!root) {
              return {
                output: JSON.stringify({
                  ok: false,
                  error: `No se encontró la raíz del repo del ecosistema (opencode.json + .opencode/agents/tunel-investigador.md) desde ${startDir}`,
                }),
              };
            }

            const keyInput = (args.key as string | undefined)?.trim();
            if (!keyInput) {
              return { output: JSON.stringify({ ok: false, error: "key es obligatorio" }) };
            }

            const indexRes = readIndex(root);
            if ("error" in indexRes) {
              return { output: JSON.stringify({ ok: false, error: indexRes.error }) };
            }

            const entries = indexRes.index.entries;
            let resolvedKey: string | null = null;
            let entry: IndexEntry | undefined;

            if (entries[keyInput]) {
              resolvedKey = keyInput;
              entry = entries[keyInput];
            } else {
              const slugPart = keyInput.split("/").pop() || keyInput;
              for (const k of Object.keys(entries)) {
                if (k.endsWith(`/${slugPart}`)) {
                  resolvedKey = k;
                  entry = entries[k];
                  break;
                }
              }
            }

            if (!entry || !resolvedKey) {
              return { output: JSON.stringify({ ok: false, error: "no existe" }) };
            }

            const file = (entry.file as string | undefined) || `${resolvedKey}.md`;
            if (typeof file !== "string" || file.includes("..") || file.startsWith("/")) {
              return { output: JSON.stringify({ ok: false, error: "file inválido" }) };
            }
            const fullPath = join(root, LIB_DIR, file);

            let markdown: string;
            try {
              markdown = readFileSync(fullPath, "utf-8");
            } catch {
              return { output: JSON.stringify({ ok: false, error: "no existe" }) };
            }

            return {
              output: JSON.stringify({
                ok: true,
                key: resolvedKey,
                title: (entry.title as string | undefined) || resolvedKey,
                file,
                markdown,
              }),
            };
          } catch (err) {
            return { output: JSON.stringify({ ok: false, error: errMsg(err) }) };
          }
        },
      }),
    },
  };
}) satisfies Plugin;