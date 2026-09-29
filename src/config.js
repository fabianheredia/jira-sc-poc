/**
 * Carga y validación de la configuración del dashboard — F-00.
 *
 * Dos archivos, una responsabilidad cada uno (Q-08):
 *   - config/sprints.yaml -> el CUÁNDO (R-08)
 *   - config/team.yaml    -> el QUIÉN  (R-14)
 *
 * Un YAML mal formado o incompleto falla al arrancar con un mensaje explícito:
 * es un error del operador, no del dato de Jira. En cambio, un label de sprint
 * que no esté registrado NO impide el arranque (R-19 / Q-39) — eso lo resuelve
 * `sprintPorId` devolviendo null y la capa de presentación mostrando el aviso.
 */

import fs from "node:fs";
import path from "node:path";
import { load as cargarYaml } from "js-yaml";

import { parseFecha, formatFecha, diasHabiles } from "./dates.js";

const RAIZ = process.cwd();
export const RUTA_SPRINTS_POR_DEFECTO = path.join(RAIZ, "config", "sprints.yaml");
export const RUTA_TEAM_POR_DEFECTO = path.join(RAIZ, "config", "team.yaml");

const FORMATO_ID_SPRINT = /^s\d+$/;

function leerYaml(ruta) {
  let crudo;
  try {
    crudo = fs.readFileSync(ruta, "utf8");
  } catch (e) {
    throw new Error(`No se pudo leer ${ruta}: ${e.message}`);
  }

  const datos = cargarYaml(crudo);
  if (datos == null || typeof datos !== "object") {
    throw new Error(`${ruta} no contiene un mapa YAML válido`);
  }
  return datos;
}

/**
 * Carga los sprints y los devuelve ordenados por fecha de inicio.
 *
 * Cada sprint queda como:
 *   { id, nombre, inicio: Date, fin: Date, diasHabiles: Date[], totalDiasHabiles }
 */
export function cargarSprints(ruta = RUTA_SPRINTS_POR_DEFECTO) {
  const datos = leerYaml(ruta);

  if (!Array.isArray(datos.sprints)) {
    throw new Error(`${ruta} debe tener una lista bajo la clave "sprints"`);
  }

  const vistos = new Set();

  const sprints = datos.sprints.map((crudo, i) => {
    const donde = `${ruta} -> sprints[${i}]`;

    const id = String(crudo?.id ?? "").trim().toLowerCase();
    if (!id) throw new Error(`${donde}: falta "id"`);
    if (!FORMATO_ID_SPRINT.test(id)) {
      throw new Error(`${donde}: el id "${id}" no tiene la forma s<n> (s1, s2, s10…)`);
    }
    if (vistos.has(id)) throw new Error(`${donde}: el id "${id}" está duplicado`);
    vistos.add(id);

    const nombre = String(crudo?.nombre ?? "").trim() || id.toUpperCase();

    const inicio = parseFecha(crudo?.inicio);
    if (!inicio) throw new Error(`${donde}: "inicio" no es una fecha YYYY-MM-DD válida`);

    const fin = parseFecha(crudo?.fin);
    if (!fin) throw new Error(`${donde}: "fin" no es una fecha YYYY-MM-DD válida`);

    if (fin < inicio) {
      throw new Error(`${donde}: "fin" (${formatFecha(fin)}) es anterior a "inicio" (${formatFecha(inicio)})`);
    }

    const habiles = diasHabiles(inicio, fin);
    if (habiles.length === 0) {
      throw new Error(`${donde}: el rango ${formatFecha(inicio)}…${formatFecha(fin)} no contiene ningún día hábil`);
    }

    return { id, nombre, inicio, fin, diasHabiles: habiles, totalDiasHabiles: habiles.length };
  });

  sprints.sort((a, b) => a.inicio - b.inicio);
  return sprints;
}

/**
 * Carga el equipo. Devuelve { lista, porKey } donde porKey es un Map
 * key -> { key, nombre }.
 */
export function cargarTeam(ruta = RUTA_TEAM_POR_DEFECTO) {
  const datos = leerYaml(ruta);

  if (!Array.isArray(datos.arquitectos)) {
    throw new Error(`${ruta} debe tener una lista bajo la clave "arquitectos"`);
  }

  const porKey = new Map();

  const lista = datos.arquitectos.map((crudo, i) => {
    const donde = `${ruta} -> arquitectos[${i}]`;

    const key = String(crudo?.key ?? "").trim();
    if (!key) throw new Error(`${donde}: falta "key" (es assignee.key de Jira)`);
    if (porKey.has(key)) throw new Error(`${donde}: la key "${key}" está duplicada`);

    const nombre = String(crudo?.nombre ?? "").trim();
    if (!nombre) throw new Error(`${donde}: falta "nombre" (es lo único que se muestra en la interfaz)`);

    const arquitecto = { key, nombre };
    porKey.set(key, arquitecto);
    return arquitecto;
  });

  return { lista, porKey };
}

/** Carga ambos archivos y expone los ayudantes de consulta. */
export function cargarConfiguracion({
  rutaSprints = RUTA_SPRINTS_POR_DEFECTO,
  rutaTeam = RUTA_TEAM_POR_DEFECTO,
} = {}) {
  const sprints = cargarSprints(rutaSprints);
  const team = cargarTeam(rutaTeam);
  return { sprints, team };
}

/** El sprint con ese id, o null si no está registrado (R-19). */
export function sprintPorId(sprints, id) {
  const buscado = String(id ?? "").trim().toLowerCase();
  return sprints.find((s) => s.id === buscado) ?? null;
}

/** true si la fecha cae dentro del rango [inicio, fin] del sprint. */
export function sprintContiene(sprint, fecha) {
  if (!sprint || !fecha) return false;
  return fecha >= sprint.inicio && fecha <= sprint.fin;
}

/**
 * El sprint en cuyo rango de fechas cae `fecha`, o null si no cae en ninguno.
 * Es la base de la acreditación del cumplimiento (R-05 / Q-43).
 */
export function sprintPorFecha(sprints, fecha) {
  if (!fecha) return null;
  return sprints.find((s) => sprintContiene(s, fecha)) ?? null;
}

/** El sprint inmediatamente posterior en el orden configurado, o null. */
export function sprintSiguiente(sprints, id) {
  const i = sprints.findIndex((s) => s.id === String(id ?? "").toLowerCase());
  if (i < 0 || i + 1 >= sprints.length) return null;
  return sprints[i + 1];
}

/** true si esa key figura en config/team.yaml. */
export function esDelEquipo(team, assigneeKey) {
  if (!assigneeKey) return false;
  return team.porKey.has(assigneeKey);
}

/** El nombre visible de una key; null si no está en el equipo (R-13). */
export function nombreVisible(team, assigneeKey) {
  return team.porKey.get(assigneeKey)?.nombre ?? null;
}
