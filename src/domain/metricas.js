/**
 * Agregados de presentación — F-02 (burndown) y F-03 (resumen por arquitecto).
 *
 * Toman sub-tasks ya normalizadas y clasificadas (clasificacion.js) y las
 * reducen a las formas que consume el dashboard. No leen Jira ni config: son
 * funciones puras sobre la salida de `clasificarLote`.
 *
 *   R-01 (Q-01)  la unidad de medida es el conteo de sub-tasks
 *   R-09 (Q-03)  el eje temporal son días hábiles del sprint
 */

import { formatFecha } from "../dates.js";

/**
 * Curva de pendiente (remaining) del sprint, día hábil por día hábil.
 *
 * pendiente(día) = comprometidas − cumplidas cuya resolución cayó en o antes
 * de ese día. Una sub-task resuelta fuera del rango del sprint (fuera de
 * sprint) nunca resta, por definición no está "cumplida en este sprint".
 */
export function burndownSprint(clasificadas, sprint) {
  if (!sprint) return { labels: [], remaining: [] };

  const comprometidas = clasificadas.filter((c) => c.sprintsComprometidos.includes(sprint.id));
  const total = comprometidas.length;

  const cumplidas = comprometidas.filter(
    (c) => c.sprintCumplido === sprint.id && c.fechaResolucion
  );

  const labels = sprint.diasHabiles.map(formatFecha);
  const remaining = sprint.diasHabiles.map((dia) => {
    const cumplidasHasta = cumplidas.filter((c) => c.fechaResolucion <= dia).length;
    return total - cumplidasHasta;
  });

  return { labels, remaining, total };
}

/**
 * Comprometidas vs cumplidas por arquitecto en un conjunto de sprints — F-03.
 *
 * Con varios sprints (p. ej. filtro "ALL"), una sub-task con label en dos de
 * ellos suma dos compromisos, consistente con R-03. Solo aparecen arquitectos
 * del equipo (`config/team.yaml`) con al menos una comprometida.
 */
export function resumenPorArquitecto(clasificadas, sprintIds, { team }) {
  const porKey = new Map();

  for (const id of sprintIds) {
    for (const c of clasificadas) {
      if (!c.enEquipo) continue;
      if (!c.sprintsComprometidos.includes(id)) continue;

      const fila = porKey.get(c.assigneeKey) ?? { comprometidas: 0, cumplidas: 0 };
      fila.comprometidas += 1;
      if (c.sprintCumplido === id) fila.cumplidas += 1;
      porKey.set(c.assigneeKey, fila);
    }
  }

  return [...porKey.entries()]
    .map(([key, fila]) => ({
      key,
      nombre: team.porKey.get(key)?.nombre ?? key,
      comprometidas: fila.comprometidas,
      cumplidas: fila.cumplidas,
      cumplimiento: fila.comprometidas > 0 ? fila.cumplidas / fila.comprometidas : null,
    }))
    .sort((a, b) => b.comprometidas - a.comprometidas);
}

/** Cuántas sub-tasks no planificadas cayeron en cada uno de estos sprints. */
export function noPlanificadasEnSprints(clasificadas, sprintIds) {
  const ids = new Set(sprintIds);
  return clasificadas.filter((c) => !c.planificada && ids.has(c.sprintCumplido)).length;
}

/** Agrupa por historia (parent) — clave, resumen, total y cumplidas. */
export function parentRows(clasificadas) {
  return agruparPor(clasificadas, (c) => c.historiaKey, (c) => c.historiaResumen, "parentKey", "parentSummary");
}

/** Agrupa por épica — clave, resumen, total y cumplidas. */
export function epicRows(clasificadas) {
  return agruparPor(clasificadas, (c) => c.epicaKey, (c) => c.epicaResumen, "epicKey", "epicSummary");
}

function agruparPor(clasificadas, obtenerClave, obtenerResumen, campoClave, campoResumen) {
  const porClave = new Map();

  for (const c of clasificadas) {
    const clave = obtenerClave(c);
    if (!clave) continue;

    const fila = porClave.get(clave) ?? { total: 0, done: 0, resumen: obtenerResumen(c) };
    fila.total += 1;
    if (c.completada) fila.done += 1;
    porClave.set(clave, fila);
  }

  return [...porClave.entries()].map(([clave, fila]) => ({
    [campoClave]: clave,
    [campoResumen]: fila.resumen || clave,
    total: fila.total,
    done: fila.done,
  }));
}
