/**
 * Encola una investigación mediante el workflow n8n configurado por el entorno.
 *
 * El webhook n8n y la biblioteca (index.json/Markdown) son dependencias del
 * entorno; no se incluyen ni se copian secretos en este repositorio. El
 * runtime autodetecta este archivo como la custom tool `knowledge_investigate`.
 */
import { tool } from "@opencode-ai/plugin"
import { readFile } from "fs/promises"
import os from "os"
import path from "path"

const N8N_WEBHOOK_URL = process.env.N8N_KNOWLEDGE_WEBHOOK_URL || "http://localhost:5678/webhook/investigar-conocimiento"
const LIBRARY_HOME = process.env.KNOWLEDGE_LIBRARY_HOME || path.join(os.homedir(), "biblioteca-conocimientos")

const slugify = (value: string): string => {
  let slug = String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  slug = slug.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  if (slug.length <= 80) return slug
  const cut = slug.slice(0, 81)
  const last = Math.max(cut.lastIndexOf("-"), 40)
  return last > 40 ? cut.slice(0, last) : slug.slice(0, 40)
}

export default tool({
  description: "Ask the configured n8n workflow to research a topic asynchronously and save it to the configured knowledge library.",
  args: {
    topic: tool.schema.string().describe("The topic to research, as specifically as possible."),
    domain: tool.schema.string().optional().describe("Domain folder; defaults to general."),
  },
  async execute(args) {
    const domain = slugify(args.domain || "general") || "general"
    const payload = { topic: args.topic, domain }
    const slug = `${domain}/${slugify(args.topic)}`
    const isSimilar = (existingSlug: string): boolean => {
      if (!existingSlug.startsWith(`${domain}/`)) return false
      const newWords = slug.split("/")[1]?.split("-") ?? []
      const existingWords = existingSlug.split("/")[1]?.split("-") ?? []
      let common = 0
      for (let i = 0; i < Math.min(newWords.length, existingWords.length); i++) {
        if (newWords[i] !== existingWords[i]) break
        common++
      }
      return common >= 4
    }

    try {
      const index = JSON.parse(await readFile(path.join(LIBRARY_HOME, "index.json"), "utf8"))
      const existingEntries = index.entries ?? {}
      if (existingEntries[slug]) return `El tema ya existe en la biblioteca como ${slug} — no lo vuelvo a investigar. Para leerlo: knowledge_search con target: "${slug}".`
      const similarKey = Object.keys(existingEntries).find(isSimilar)
      if (similarKey) return `El tema ya está cubierto en la biblioteca como ${similarKey} (casi-duplicado de "${slug}") — no lo vuelvo a investigar. Para leerlo: knowledge_search con target: "${similarKey}".`
    } catch {
      // Si el índice aún no existe, el workflow n8n vuelve a verificar el dedupe.
    }

    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      })
      if (!response.ok) {
        return `No se pudo encolar la investigación: n8n respondió con HTTP ${response.status}. Verificá que n8n y el workflow de investigación estén activos.`
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return `No se pudo encolar la investigación en n8n (${N8N_WEBHOOK_URL}). Verificá que n8n y el workflow de investigación estén activos. Error: ${message}`
    }
    return `Investigación encolada en n8n. Topic: "${args.topic}" — dominio: ${domain}\nLa entrada aparecerá como ${path.join(LIBRARY_HOME, `${slug}.md`)} cuando el workflow termine. Recién consultada con knowledge_search.`
  },
})
