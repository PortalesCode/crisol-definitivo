/**
 * Consulta la biblioteca de conocimientos configurada por el entorno.
 *
 * El index.json y los archivos Markdown son dependencias externas del entorno
 * y no se incluyen en este repositorio. El runtime autodetecta este archivo
 * por su nombre como la custom tool `knowledge_search`.
 */
import { tool } from "@opencode-ai/plugin"
import { readFile } from "fs/promises"
import os from "os"
import path from "path"

const LIBRARY_HOME = process.env.KNOWLEDGE_LIBRARY_HOME || path.join(os.homedir(), "biblioteca-conocimientos")
const MAX_SEARCH_RESULTS = 20
const MAX_INVENTORY = 50

function normalizeTerms(input: string): string[] {
  return input.toLowerCase().split(/[\s,;]+/).filter((term) => term.length > 1)
}

function entryMatches(entry: { title?: string; summary?: string; domain?: string; topic_key?: string; keywords?: string[]; descripcion_corta?: string }, terms: string[]): boolean {
  if (terms.length === 0) return true
  const haystack = [entry.title, entry.summary, entry.domain, entry.topic_key, entry.descripcion_corta, (entry.keywords ?? []).join(" ")]
    .join(" ")
    .toLowerCase()
  return terms.every((term) => haystack.includes(term))
}

function splitSections(markdown: string): Map<string, string> {
  const sections = new Map<string, string>()
  let current = ""
  let buffer: string[] = []
  for (const line of markdown.split("\n")) {
    if (/^##\s+/.test(line)) {
      if (current) sections.set(current, buffer.join("\n").trim())
      current = line.replace(/^##\s+/, "").trim()
      buffer = [line]
    } else {
      buffer.push(line)
    }
  }
  if (current) sections.set(current, buffer.join("\n").trim())
  return sections
}

export default tool({
  description: "Search the configured knowledge library. Without target it returns a compact inventory or up to 20 matching results; with target it reads the complete entry or selected sections.",
  args: {
    query: tool.schema.string().optional().describe("Search terms; omit to list the compact inventory."),
    domain: tool.schema.string().optional().describe("Filter by domain folder."),
    target: tool.schema.string().optional().describe("Topic key to read in full."),
    sections: tool.schema.string().optional().describe("Comma-separated section names to read only; requires target."),
  },
  async execute(args) {
    const indexPath = path.join(LIBRARY_HOME, "index.json")
    let index: { entries?: Record<string, any> }
    try {
      index = JSON.parse(await readFile(indexPath, "utf8"))
    } catch (err) {
      return `No se pudo leer el índice de la biblioteca en ${indexPath}. ¿Existe la carpeta ${LIBRARY_HOME}? Error: ${(err as Error).message}`
    }

    const entries = index.entries ?? {}
    const all = Object.entries(entries).map(([key, entry]) => ({ ...(entry as object), topic_key: key })) as any[]

    if (args.target) {
      const entry = entries[args.target]
      if (!entry) {
        const similar = all.filter((item) => item.topic_key.toLowerCase().includes(args.target!.toLowerCase())).map((item) => item.topic_key)
        return `No existe la entrada "${args.target}". Entradas similares: ${similar.join(", ") || "ninguna"}.`
      }
      let content: string
      try {
        content = await readFile(path.join(LIBRARY_HOME, entry.file), "utf8")
      } catch (err) {
        return `La entrada existe en el índice pero no se pudo leer ${entry.file}: ${(err as Error).message}`
      }
      if (args.sections) {
        const wanted = args.sections.split(",").map((section) => section.trim().toLowerCase()).filter(Boolean)
        const picked = [...splitSections(content).entries()].filter(([name]) => wanted.includes(name.toLowerCase()))
        return picked.length ? picked.map(([, body]) => body).join("\n\n") : `No encontré esas secciones. Secciones disponibles: ${[...splitSections(content).keys()].join(", ") || "(ninguna)"}`
      }
      return content
    }

    const terms = normalizeTerms(args.query ?? "")
    const domainFilter = args.domain?.toLowerCase()
    const hits = all.filter((entry) => !domainFilter || (entry.domain ?? "").toLowerCase() === domainFilter).filter((entry) => entryMatches(entry, terms)).sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
    if (hits.length === 0) return `No hay entradas en la biblioteca que matcheen "${args.query ?? ""}"${domainFilter ? ` dentro del dominio "${domainFilter}"` : ""}.`

    if (terms.length === 0) {
      const shown = hits.slice(0, MAX_INVENTORY)
      const lines = shown.map((entry, i) => `${i + 1}. **${entry.topic_key}** — ${entry.title} [${entry.status}]`)
      const note = hits.length > shown.length ? `\n\nHay ${hits.length} entradas; mostrando las ${shown.length} más recientes. Filtrá con query o domain, o usá target: "<topic_key>" para leer una completa.` : `\n\nTotal: ${hits.length} entradas${domainFilter ? ` en dominio "${domainFilter}"` : ""}. Para leer una completa, pasá target: "<topic_key>".`
      return lines.join("\n") + note
    }

    const shown = hits.slice(0, MAX_SEARCH_RESULTS)
    const lines = shown.map((entry, i) => {
      const shortDescription = entry.descripcion_corta && String(entry.descripcion_corta).trim() ? String(entry.descripcion_corta).trim() : null
      return `${i + 1}. **${entry.topic_key}** — ${entry.title} [${entry.status}] (actualizado ${entry.updated_at})\n   ${shortDescription ? `Descripción: ${shortDescription}` : `Resumen: ${entry.summary ?? "(sin resumen)"}`}\n   Archivo: ${entry.file}`
    })
    const note = hits.length > shown.length ? `\n\nHay ${hits.length} resultados; mostrando los ${shown.length} más recientes. Para leer uno completo, pasá target: "<topic_key>".` : "\n\nPara leer una entrada completa, llamá de nuevo con target: \"<topic_key>\" (o sections para leer solo secciones puntuales)."
    return lines.join("\n") + note
  },
})
