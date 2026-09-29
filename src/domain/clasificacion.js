/**
 * Clasificación de sub-tasks — F-01.
 *
 * Es el núcleo del dominio: todas las métricas parten de aquí. Ninguna regla de
 * este archivo es un supuesto; cada una cita la regla del Gherkin y la pregunta
 * respondida por el sponsor de la que proviene.
 *
 *   R-02 (Q-02)  el sprint se identifica por un label S<n> de la sub-task
 *   R-03 (Q-10)  comprometida en CADA sprint cuyo label lleve
 *   R-04 (Q-05)  completada <=> statusCategory === "Done"
 *   R-05 (Q-43, Q-46) se acredita al sprint cuyo rango contiene resolutiondate,
 *                siempre que ese sprint estuviera comprometido
 *   R-06 (Q-43)  si no cae en ningún sprint -> bolsa "fuera de sprint"
 *   R-07 (Q-10)  carry-over: lleva también el label del sprint siguiente
 *   R-10 (Q-11)  sin label de sprint -> no planificada
 *   R-12 (Q-18, Q-37, Q-40) propia/apoyo comparando el assignee de la ÉPICA,
 *                sin excepción para el líder
 *   R-19 (Q-39)  un label de sprint no configurado no rompe nada: se reporta
 */

import { isDone, sprintLabelsFrom } from "../jira/fields.js";
import { parseFecha } from "../dates.js";
import { sprintPorId, sprintPorFecha, sprintSiguiente, esDelEquipo } from "../config.js";

export const INICIATIVA_PROPIA = "propia";
export const INICIATIVA_APOYO = "apoyo";
export const SIN_INICIATIVA = "sin iniciativa";

export const CLAS_CUMPLIDA = "comprometida y cumplida";
export const CLAS_NO_CUMPLIDA = "comprometida y no cumplida";
export const CLAS_FUERA_DE_SPRINT = "comprometida, fuera de sprint";
export const CLAS_NO_PLANIFICADA = "no planificada";

/**
 * Normaliza una sub-task cruda de Jira a la forma que consume el dominio.
 *
 * `historias` y `epicas` son Map clave -> datos, como los que devuelve
 * fetchParents en server.js. La épica aporta su assignee, que R-12 necesita.
 */
export function normalizarSubtask(issue, { historias = new Map(), epicas = new Map() } = {}) {
  const f = issue?.fields ?? {};
  const historiaKey = f.parent?.key ?? null;
  const historia = historiaKey ? historias.get(historiaKey) : null;
  const epicaKey = historia?.epicKey ?? null;
  const epica = epicaKey ? epicas.get(epicaKey) : null;

  return {
    clave: issue?.key ?? null,
    resumen: f.summary ?? "",
    assigneeKey: f.assignee?.key ?? null,
    assigneeNombreJira: f.assignee?.displayName ?? null,
    labels: Array.isArray(f.labels) ? f.labels : [],
    completada: isDone(issue),
    fechaResolucion: parseFecha(f.resolutiondate),
    historiaKey,
    historiaResumen: historia?.summary ?? null,
    epicaKey,
    epicaResumen: epica?.summary ?? null,
    epicaAssigneeKey: epica?.assigneeKey ?? null,
  };
}

/**
 * Determina si la sub-task es de una iniciativa propia o de apoyo — R-12.
 *
 * La comparación usa el assignee de la ÉPICA, nunca el de la historia
 * intermedia. No hay excepción para el líder: si la épica sigue asignada al
 * líder, el resultado es "apoyo", y eso señala que falta reasignarla (Q-40).
 *
 * Devuelve { iniciativa, motivo } donde motivo solo se llena cuando no se pudo
 * clasificar: preferimos reportar el hueco antes que inventar una atribución.
 */
export function clasificarIniciativa(sub) {
  if (!sub.epicaKey) {
    return { iniciativa: SIN_INICIATIVA, motivo: "la historia padre no tiene épica asociada" };
  }
  if (!sub.epicaAssigneeKey) {
    return { iniciativa: SIN_INICIATIVA, motivo: `la épica ${sub.epicaKey} no tiene responsable asignado` };
  }
  if (!sub.assigneeKey) {
    return { iniciativa: SIN_INICIATIVA, motivo: "la sub-task no tiene responsable asignado" };
  }

  return {
    iniciativa: sub.epicaAssigneeKey === sub.assigneeKey ? INICIATIVA_PROPIA : INICIATIVA_APOYO,
    motivo: null,
  };
}

/**
 * Clasifica una sub-task normalizada contra la configuración de sprints.
 *
 * Añade, sin mutar la entrada:
 *   sprintLabels          todos los labels S<n> normalizados a minúscula
 *   sprintsComprometidos  los que SÍ están en config/sprints.yaml  (R-03)
 *   sprintsNoConfigurados los que NO están registrados             (R-19)
 *   planificada           lleva al menos un label de sprint        (R-10)
 *   sprintCumplido        sprint cuyo rango contiene la resolución (R-05)
 *   fueraDeSprint         completada pero fuera de todo rango      (R-06)
 *   arrastradaDesde       sprints de los que es carry-over         (R-07)
 *   iniciativa            propia | apoyo | sin iniciativa          (R-12)
 *   enEquipo              su assignee figura en config/team.yaml
 */
export function clasificarSubtask(sub, { sprints, team = null }) {
  const sprintLabels = sprintLabelsFrom(sub.labels);

  const sprintsComprometidos = [];
  const sprintsNoConfigurados = [];
  for (const id of sprintLabels) {
    (sprintPorId(sprints, id) ? sprintsComprometidos : sprintsNoConfigurados).push(id);
  }

  // Orden cronológico de config, no alfabético del label.
  sprintsComprometidos.sort(
    (a, b) => sprintPorId(sprints, a).inicio - sprintPorId(sprints, b).inicio
  );

  const planificada = sprintLabels.length > 0;

  // R-05 / R-06: el cumplimiento se acredita por la fecha de resolución.
  //
  // Matiz necesario para el trabajo PLANIFICADO (Q-46): sólo se acredita si ese
  // sprint es uno de los que la sub-task tenía comprometidos. Una sub-task que
  // prometió s1 y se resolvió durante s2 sin llevar el label S2 no cumplió su
  // compromiso en ningún sprint: va a la bolsa "fuera de sprint".
  //
  // Sin este matiz un sprint podría acumular más cumplidas que comprometidas y
  // el cumplimiento superaría el 100%, que es imposible por definición.
  //
  // El trabajo NO planificado no tiene compromiso que contrastar, así que se
  // atribuye por fecha sin más (R-10) y queda fuera del denominador.
  const sprintDeResolucion =
    sub.completada && sub.fechaResolucion ? sprintPorFecha(sprints, sub.fechaResolucion) : null;

  const acreditable =
    sprintDeResolucion !== null &&
    (!planificada || sprintsComprometidos.includes(sprintDeResolucion.id));

  const sprintCumplido = acreditable ? sprintDeResolucion.id : null;
  const fueraDeSprint = Boolean(sub.completada) && sprintCumplido === null;

  // R-07: es carry-over del sprint S si además lleva el label del siguiente.
  const arrastradaDesde = sprintsComprometidos.filter((id) => {
    const siguiente = sprintSiguiente(sprints, id);
    return Boolean(siguiente) && sprintLabels.includes(siguiente.id);
  });

  const { iniciativa, motivo } = clasificarIniciativa(sub);

  return {
    ...sub,
    sprintLabels,
    sprintsComprometidos,
    sprintsNoConfigurados,
    planificada,
    sprintCumplido,
    fueraDeSprint,
    arrastradaDesde,
    iniciativa,
    motivoSinIniciativa: motivo,
    enEquipo: team ? esDelEquipo(team, sub.assigneeKey) : null,
  };
}

/** Clasifica un lote de sub-tasks ya normalizadas. */
export function clasificarLote(subs, opciones) {
  return subs.map((s) => clasificarSubtask(s, opciones));
}

/**
 * Cómo se lee una sub-task ya clasificada DESDE un sprint concreto.
 *
 * Devuelve null si la sub-task no tiene nada que decir sobre ese sprint, para
 * que quien agrega pueda descartarla sin ambigüedad.
 *
 * El orden de las reglas importa: una sub-task arrastrada se reporta como
 * arrastrada en su sprint de origen aunque también esté completada, porque en
 * ese sprint no se cumplió.
 */
export function clasificacionEnSprint(clasificada, sprintId, { sprints }) {
  const id = String(sprintId ?? "").toLowerCase();

  // R-10: sin label de sprint es trabajo no planificado. Se atribuye al sprint
  // en cuyo rango cayó su resolución.
  if (!clasificada.planificada) {
    return clasificada.sprintCumplido === id ? CLAS_NO_PLANIFICADA : null;
  }

  if (!clasificada.sprintsComprometidos.includes(id)) return null;

  if (clasificada.sprintCumplido === id) return CLAS_CUMPLIDA;

  if (clasificada.arrastradaDesde.includes(id)) {
    const siguiente = sprintSiguiente(sprints, id);
    return `comprometida, arrastrada a ${siguiente.id}`;
  }

  if (clasificada.fueraDeSprint) return CLAS_FUERA_DE_SPRINT;

  return CLAS_NO_CUMPLIDA;
}

/** true si la sub-task es carry-over del sprint indicado — R-07. */
export function esArrastrada(clasificada, sprintId) {
  return clasificada.arrastradaDesde.includes(String(sprintId ?? "").toLowerCase());
}

/** Sub-tasks que quedan en la bolsa "fuera de sprint" — R-06. */
export function fueraDeSprint(clasificadas) {
  return clasificadas.filter((c) => c.fueraDeSprint);
}

/** Labels de sprint presentes en los datos que no están en la configuración — R-19. */
export function sprintsNoConfigurados(clasificadas) {
  const set = new Set();
  for (const c of clasificadas) for (const id of c.sprintsNoConfigurados) set.add(id);
  return [...set].sort();
}
