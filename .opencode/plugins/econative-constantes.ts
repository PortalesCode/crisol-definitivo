/**
 * econative-constantes.ts
 *
 * "Constantes de laburo": reglas del usuario que el agente nunca debe olvidar
 * (ej: "no tocar los servidores", "no ejecutar comandos destructivos").
 *
 * Viven en workspec/constante/contantes.md (un único archivo, múltiples items).
 * Las gestiona Refiner (dueño documentado del archivo).
 *
 * Tools:
 *   - constante_crear      → agrega una constante nueva (estado: activa)
 *   - constante_leer       → lee una constante por id o el archivo completo
 *   - constante_listar     → metadata (id, título, estado) sin detalle
 *   - constante_modificar  → cambia SOLO los campos pasados
 *   - constante_desactivar → marca inactiva (no borra)
 *
 * Hook: experimental.chat.system.transform — lee el archivo en CADA request e
 * inyecta SOLO las constantes activas en el system prompt. Efecto inmediato en
 * el próximo request SIN recargar OpenCode.
 *
 * Formato del archivo:
 *   # Constantes de trabajo
 *
 *   > Cómo quiere laburar el usuario. Las gestiona Refiner. Se inyectan en cada request.
 *
 *   ## <id>: <título de la regla>
 *   - estado: activa
 *   - detalle: <texto libre, puede continuar en líneas indentadas>
 *
 * Las tools NUNCA corrompen el archivo: si algo falla, no escriben nada
 * (escritura atómica vía archivo temporal + rename).
 */

import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { tool } from "@opencode-ai/plugin";
import type { Plugin } from "@opencode-ai/plugin";

const FILE_REL = join("workspec", "constante", "contantes.md");

const DEFAULT_HEADER = `# Constantes de trabajo

> Cómo quiere laburar el usuario. Las gestiona Refiner. Se inyectan en cada request.`;

const SECTION_RE = /^##\s+([A-Za-z0-9][A-Za-z0-9-]*)\s*:\s*(.*)$/;
const ESTADO_RE = /^-\s*estado\s*:\s*(.*)$/;
const DETALLE_RE = /^-\s*detalle\s*:\s*(.*)$/;
const PROP_RE = /^-\s+/; // línea de propiedad "- clave: valor"
const ID_AUTO_RE = /^const-(\d+)$/;

interface Seccion {
  id: string;
  titulo: string;
  headerLine: string;
  bodyLines: string[];
}

interface Constante {
  id: string;
  titulo: string;
  estado: string;
  detalle: string;
}

/* ---------------------------------- parseo --------------------------------- */

function parseConstantes(text: string): { header: string[]; secciones: Seccion[] } {
  const header: string[] = [];
  const secciones: Seccion[] = [];
  let current: Seccion | null = null;

  // Las líneas en blanco finales de una sección son separadores (o el \n final del
  // archivo), no contenido: si se conservan, se acumulan con cada re-escritura.
  const finalizar = () => {
    if (!current) return;
    let end = current.bodyLines.length;
    while (end > 0 && current.bodyLines[end - 1].trim() === "") end--;
    current.bodyLines = current.bodyLines.slice(0, end);
    secciones.push(current);
    current = null;
  };

  for (const line of text.split("\n")) {
    const m = line.match(SECTION_RE);
    if (m) {
      finalizar();
      current = { id: m[1], titulo: m[2].trim(), headerLine: line, bodyLines: [] };
    } else if (current) {
      current.bodyLines.push(line);
    } else {
      header.push(line);
    }
  }
  finalizar();

  return { header, secciones };
}

function obtenerEstado(bodyLines: string[]): string {
  for (const line of bodyLines) {
    const m = line.match(ESTADO_RE);
    if (m) return m[1].trim().toLowerCase() === "activa" ? "activa" : "inactiva";
  }
  // Si una sección hecha a mano no declara estado, se trata como activa:
  // las constantes son reglas de seguridad y no conviene que se ignoren por omisión.
  return "activa";
}

function obtenerDetalle(bodyLines: string[]): string {
  const partes: string[] = [];
  let enDetalle = false;
  for (const line of bodyLines) {
    const m = line.match(DETALLE_RE);
    if (m) {
      enDetalle = true;
      partes.length = 0;
      partes.push(m[1].trim());
      continue;
    }
    if (enDetalle) {
      if (PROP_RE.test(line)) break; // nueva propiedad → fin del detalle
      partes.push(line.trim()); // línea de continuación del detalle
    }
  }
  return partes.join("\n");
}

function buildConstante(sec: Seccion): Constante {
  return {
    id: sec.id,
    titulo: sec.titulo,
    estado: obtenerEstado(sec.bodyLines),
    detalle: obtenerDetalle(sec.bodyLines),
  };
}

/* --------------------------------- escritura -------------------------------- */

function serializarDetalle(detalle: string): string[] {
  const partes = detalle.split("\n");
  const lines = [`- detalle: ${partes[0]}`];
  for (const p of partes.slice(1)) lines.push(`  ${p}`);
  return lines;
}

/**
 * Reconstruye el body de una sección preservando líneas desconocidas
 * (props custom o texto libre) y reemplazando SOLO los campos pasados.
 */
function reconstruirBody(bodyLines: string[], cambios: { estado?: string; detalle?: string }): string[] {
  const out: string[] = [];
  let estadoPuesto = false;
  let detallePuesto = false;
  let saltandoDetalle = false;

  for (const line of bodyLines) {
    if (DETALLE_RE.test(line)) {
      if (cambios.detalle !== undefined) {
        out.push(...serializarDetalle(cambios.detalle));
        detallePuesto = true;
        saltandoDetalle = true; // descartar continuaciones viejas del detalle
      } else {
        out.push(line);
        saltandoDetalle = false;
      }
      continue;
    }
    if (saltandoDetalle) {
      if (PROP_RE.test(line)) saltandoDetalle = false;
      else continue;
    }
    if (ESTADO_RE.test(line)) {
      if (cambios.estado !== undefined) {
        out.push(`- estado: ${cambios.estado}`);
        estadoPuesto = true;
      } else {
        out.push(line);
      }
      continue;
    }
    out.push(line);
  }

  if (cambios.estado !== undefined && !estadoPuesto) out.push(`- estado: ${cambios.estado}`);
  if (cambios.detalle !== undefined && !detallePuesto) out.push(...serializarDetalle(cambios.detalle));

  return out;
}

function serializarSeccion(sec: Seccion): string {
  return `${sec.headerLine}\n${sec.bodyLines.join("\n")}`;
}

function buildContenido(header: string[], secciones: Seccion[]): string {
  const headerStr = header.length > 0 ? header.join("\n").trimEnd() : DEFAULT_HEADER;
  const partes = [headerStr];
  for (const sec of secciones) partes.push(serializarSeccion(sec));
  return partes.join("\n\n") + "\n";
}

function leerArchivo(directory: string): { existe: boolean; filePath: string; header: string[]; secciones: Seccion[] } {
  const filePath = join(directory, FILE_REL);
  if (!existsSync(filePath)) return { existe: false, filePath, header: [], secciones: [] };
  const { header, secciones } = parseConstantes(readFileSync(filePath, "utf-8"));
  return { existe: true, filePath, header, secciones };
}

/** Escritura atómica: nunca deja el archivo a medias. Si algo falla, el archivo original queda intacto. */
function escribirArchivo(filePath: string, contenido: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(tmp, contenido, "utf-8");
  renameSync(tmp, filePath);
}

/* ----------------------------------- ids ----------------------------------- */

function validarId(id: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
}

function generarId(secciones: Seccion[]): string {
  let max = 0;
  for (const sec of secciones) {
    const m = sec.id.match(ID_AUTO_RE);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `const-${String(max + 1).padStart(3, "0")}`;
}

/* ------------------------------- helpers tools ------------------------------ */

const responder = (data: Record<string, unknown>) => JSON.stringify({ ok: true, ...data }, null, 2);
const fallar = (error: string) => JSON.stringify({ ok: false, error }, null, 2);

/* -------------------------------- inyección -------------------------------- */

function buildTextoInyeccion(activas: Constante[]): string {
  const lines: string[] = ["## ⚓ Constantes de laburo (reglas del usuario — NO las ignores)", ""];
  activas.forEach((c, i) => {
    const partes = c.detalle.split("\n");
    lines.push(`- ${partes[0]}`);
    for (const p of partes.slice(1)) lines.push(`  ${p}`);
    if (i < activas.length - 1) lines.push("");
  });
  return lines.join("\n");
}

/* ---------------------------------- plugin --------------------------------- */

export default (async ({ directory }) => {
  const filePath = () => join(directory, FILE_REL);

  return {
    tool: {
      constante_crear: tool({
        description:
          "Crea una constante de laburo (regla del usuario que el agente nunca debe olvidar, "
          + "ej: 'no tocar los servidores') en workspec/constante/contantes.md. Las gestiona Refiner. "
          + "Queda con estado 'activa' y se inyecta en el system prompt de cada request de forma inmediata "
          + "SIN recargar OpenCode (el hook lee el archivo en cada request).",
        args: {
          titulo: tool.schema.string().describe("Título descriptivo de la regla"),
          detalle: tool.schema.string().describe("Texto libre de la regla (puede ser multi-línea)"),
          id: tool.schema
            .string()
            .optional()
            .describe("Id slug opcional (ej: no-tocar-servidores). Si no se pasa, se genera const-XXX automáticamente."),
        },
        async execute(args, context) {
          try {
            const { secciones, filePath: fp, header } = leerArchivo(context.directory);
            const id = args.id ? args.id.trim() : generarId(secciones);

            if (!validarId(id)) {
              return fallar(`Id inválido: "${id}". Usá slug con minúsculas, números y guiones (ej: no-tocar-servidores).`);
            }
            if (secciones.some((s) => s.id === id)) {
              return fallar(`Ya existe una constante con id "${id}". No se pisa: elegí otro id o usá constante_modificar.`);
            }

            const titulo = args.titulo.trim();
            const sec: Seccion = {
              id,
              titulo,
              headerLine: `## ${id}: ${titulo}`,
              bodyLines: [`- estado: activa`, ...serializarDetalle(args.detalle)],
            };
            secciones.push(sec);
            escribirArchivo(fp, buildContenido(header, secciones));

            return responder({ id, constante: buildConstante(sec), mensaje: `Constante "${id}" creada y activa.` });
          } catch (e) {
            return fallar(`No se pudo crear la constante: ${(e as Error).message}`);
          }
        },
      }),

      constante_leer: tool({
        description:
          "Lee constantes de laburo desde workspec/constante/contantes.md (las gestiona Refiner). "
          + "Si se pasa id, devuelve esa constante completa (título, estado, detalle). "
          + "Si no, devuelve el archivo completo con todas las constantes y su estado.",
        args: {
          id: tool.schema.string().optional().describe("Id de la constante a leer. Si se omite, devuelve todas."),
        },
        async execute(args, context) {
          try {
            const { existe, secciones } = leerArchivo(context.directory);

            if (args.id) {
              const sec = secciones.find((s) => s.id === args.id);
              if (!sec) return fallar(`No existe la constante "${args.id}".`);
              return responder({ constante: buildConstante(sec) });
            }

            if (!existe) {
              return responder({ count: 0, constantes: [], mensaje: "Todavía no hay constantes (workspec/constante/contantes.md no existe)." });
            }
            const constantes = secciones.map(buildConstante);
            return responder({ count: constantes.length, constantes });
          } catch (e) {
            return fallar(`No se pudo leer las constantes: ${(e as Error).message}`);
          }
        },
      }),

      constante_listar: tool({
        description:
          "Lista metadata (id, título, estado) de las constantes de laburo de workspec/constante/contantes.md — sin detalle. "
          + "Filtrable por estado: activa, inactiva o todas (default: todas). Útil para ver qué hay rápido.",
        args: {
          estado: tool.schema.string().optional().describe("Filtro: activa | inactiva | todas (default: todas)"),
        },
        async execute(args, context) {
          try {
            const estado = (args.estado ?? "todas").trim().toLowerCase();
            if (!["activa", "inactiva", "todas"].includes(estado)) {
              return fallar(`Estado inválido: "${args.estado}". Usá activa, inactiva o todas.`);
            }

            const { existe, secciones } = leerArchivo(context.directory);
            if (!existe) return responder({ count: 0, estado, constantes: [], mensaje: "No hay constantes todavía." });

            const listado = secciones
              .map(buildConstante)
              .filter((c) => estado === "todas" || c.estado === estado)
              .map((c) => ({ id: c.id, titulo: c.titulo, estado: c.estado }));

            return responder({ count: listado.length, estado, constantes: listado });
          } catch (e) {
            return fallar(`No se pudo listar las constantes: ${(e as Error).message}`);
          }
        },
      }),

      constante_modificar: tool({
        description:
          "Modifica una constante de laburo en workspec/constante/contantes.md (las gestiona Refiner). "
          + "Cambia SOLO los campos pasados (titulo, detalle, estado). Si el id no existe, devuelve error claro. "
          + "Efecto inmediato en el próximo request SIN recargar OpenCode (el hook lee el archivo en cada request).",
        args: {
          id: tool.schema.string().describe("Id de la constante a modificar"),
          titulo: tool.schema.string().optional().describe("Nuevo título"),
          detalle: tool.schema.string().optional().describe("Nuevo detalle (texto libre, puede ser multi-línea)"),
          estado: tool.schema.string().optional().describe("Nuevo estado: activa | inactiva"),
        },
        async execute(args, context) {
          try {
            const sinCampos = args.titulo === undefined && args.detalle === undefined && args.estado === undefined;
            if (sinCampos) return fallar("No se pasó ningún campo para modificar (titulo, detalle o estado).");
            if (args.estado !== undefined && !["activa", "inactiva"].includes(args.estado.trim().toLowerCase())) {
              return fallar(`Estado inválido: "${args.estado}". Usá activa o inactiva.`);
            }

            const { existe, secciones, filePath: fp, header } = leerArchivo(context.directory);
            const idx = secciones.findIndex((s) => s.id === args.id);
            if (!existe || idx === -1) return fallar(`No existe la constante "${args.id}".`);

            const sec = secciones[idx];
            if (args.titulo !== undefined) {
              sec.titulo = args.titulo.trim();
              sec.headerLine = `## ${sec.id}: ${sec.titulo}`;
            }
            const cambios: { estado?: string; detalle?: string } = {};
            if (args.estado !== undefined) cambios.estado = args.estado.trim().toLowerCase();
            if (args.detalle !== undefined) cambios.detalle = args.detalle;
            if (cambios.estado !== undefined || cambios.detalle !== undefined) {
              sec.bodyLines = reconstruirBody(sec.bodyLines, cambios);
            }

            escribirArchivo(fp, buildContenido(header, secciones));
            return responder({ id: sec.id, constante: buildConstante(sec) });
          } catch (e) {
            return fallar(`No se pudo modificar la constante: ${(e as Error).message}`);
          }
        },
      }),

      constante_desactivar: tool({
        description:
          "Marca una constante de laburo como 'inactiva' en workspec/constante/contantes.md (las gestiona Refiner). "
          + "NO la borra: queda en el archivo pero deja de inyectarse. Si ya está inactiva, es idempotente (devuelve ok sin cambios). "
          + "Efecto inmediato en el próximo request SIN recargar OpenCode.",
        args: {
          id: tool.schema.string().describe("Id de la constante a desactivar"),
        },
        async execute(args, context) {
          try {
            const { existe, secciones, filePath: fp, header } = leerArchivo(context.directory);
            const idx = secciones.findIndex((s) => s.id === args.id);
            if (!existe || idx === -1) return fallar(`No existe la constante "${args.id}".`);

            const sec = secciones[idx];
            const actual = buildConstante(sec);
            if (actual.estado === "inactiva") {
              return responder({
                id: args.id,
                yaInactiva: true,
                constante: actual,
                mensaje: `La constante "${args.id}" ya estaba inactiva (no se tocó nada).`,
              });
            }

            sec.bodyLines = reconstruirBody(sec.bodyLines, { estado: "inactiva" });
            escribirArchivo(fp, buildContenido(header, secciones));

            return responder({
              id: args.id,
              constante: buildConstante(sec),
              mensaje: `Constante "${args.id}" desactivada. Sigue en el archivo pero ya no se inyecta.`,
            });
          } catch (e) {
            return fallar(`No se pudo desactivar la constante: ${(e as Error).message}`);
          }
        },
      }),
    },

    "experimental.chat.system.transform": async (_input, output) => {
      try {
        if (!existsSync(filePath())) return;
        const { secciones } = parseConstantes(readFileSync(filePath(), "utf-8"));
        const activas = secciones.map(buildConstante).filter((c) => c.estado === "activa");
        if (activas.length === 0) return;

        const texto = buildTextoInyeccion(activas);
        // Mutación in-place (patrón del paquete): concatenar al último entry, NO reasignar.
        if (output.system.length > 0) {
          output.system[output.system.length - 1] += "\n\n" + texto;
        } else {
          output.system.push(texto);
        }
      } catch {
        // Nunca crashear el request: archivo ilegible o parseo raro → no inyectar nada.
      }
    },
  };
}) satisfies Plugin;
