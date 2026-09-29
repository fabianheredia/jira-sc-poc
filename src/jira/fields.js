/**
 * Lectura de campos de un issue de Jira.
 *
 * Estas dos funciones vienen VERBATIM de server.js (líneas 56-63 del commit
 * ae36092). Se extraen aquí para que la capa de dominio y el servidor usen la
 * misma definición en lugar de mantener dos copias que puedan divergir.
 * El comportamiento es idéntico al de la versión declarada estable.
 *
 * R-04 (Q-05): completada <=> statusCategory === "Done".
 * R-02 (Q-02): el sprint se identifica por un label con forma S<n>.
 */

export function isDone(issue) {
  return issue?.fields?.status?.statusCategory?.name === "Done";
}

export function sprintLabelsFrom(labels = []) {
  if (!Array.isArray(labels)) return [];
  return labels.filter((l) => /^s\d+$/i.test(l)).map((l) => l.toLowerCase());
}
