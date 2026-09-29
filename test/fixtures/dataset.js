/**
 * Juego de datos de referencia — idea/03_requisitos_gherkin.md
 *
 * 9 sub-tasks construidas para ejercitar cada regla y cada borde. Se expresan
 * con la forma cruda de Jira Data Center para que las pruebas atraviesen también
 * la normalización.
 */

export const EPICAS = new Map([
  ["EPIC-10", { key: "EPIC-10", summary: "Gobierno de datos", assigneeKey: "arq.ana" }],
  ["EPIC-20", { key: "EPIC-20", summary: "Catálogo unificado", assigneeKey: "arq.beto" }],
  // Nunca reasignada: sigue en el líder (Q-40).
  ["EPIC-30", { key: "EPIC-30", summary: "Linaje de datos", assigneeKey: "lider.max" }],
  // Épica declarada en una historia pero sin responsable: borde de R-12.
  ["EPIC-40", { key: "EPIC-40", summary: "Calidad de datos", assigneeKey: null }],
]);

export const HISTORIAS = new Map([
  ["HU-11", { key: "HU-11", summary: "Discovery", epicKey: "EPIC-10" }],
  ["HU-12", { key: "HU-12", summary: "TDD", epicKey: "EPIC-10" }],
  ["HU-21", { key: "HU-21", summary: "Exemption EXM", epicKey: "EPIC-20" }],
  ["HU-31", { key: "HU-31", summary: "Discovery", epicKey: "EPIC-30" }],
  ["HU-41", { key: "HU-41", summary: "Perfilado", epicKey: "EPIC-40" }],
  // Historia sin épica: borde de R-12.
  ["HU-51", { key: "HU-51", summary: "Historia huérfana", epicKey: null }],
]);

const ANA = { key: "arq.ana", displayName: "Ana Rivas" };
const BETO = { key: "arq.beto", displayName: "Beto Luna" };
const CARO = { key: "arq.caro", displayName: "Caro Díaz" };
const ZOE = { key: "externo.zoe", displayName: "Zoe Externa" };

const DONE = { statusCategory: { name: "Done" } };
const EN_CURSO = { statusCategory: { name: "In Progress" } };

function issue(key, { assignee, labels = [], estado, resolucion = null, historia }) {
  return {
    key,
    fields: {
      summary: `Trabajo de ${key}`,
      assignee,
      labels,
      status: estado,
      resolutiondate: resolucion,
      parent: { key: historia },
    },
  };
}

export const SUBTASKS = [
  // Caso normal, propia, cumplida en s1.
  issue("ST-101", { assignee: ANA, labels: ["S1"], estado: DONE, resolucion: "2026-08-07T16:20:00.000-0500", historia: "HU-11" }),

  // Carry-over de s1 a s2: resuelta dentro de s2.
  issue("ST-102", { assignee: ANA, labels: ["S1", "S2"], estado: DONE, resolucion: "2026-08-20T09:05:00.000-0500", historia: "HU-11" }),

  // Comprometida en s1 y sin completar.
  issue("ST-103", { assignee: ANA, labels: ["S1"], estado: EN_CURSO, historia: "HU-12" }),

  // Apoyo: la épica EPIC-10 es de Ana, la sub-task es de Beto.
  issue("ST-104", { assignee: BETO, labels: ["S1"], estado: DONE, resolucion: "2026-08-12T11:40:00.000-0500", historia: "HU-12" }),

  // Resuelta el 18-ago: s1 cerró el 14-ago y no lleva label S2 -> fuera de sprint.
  issue("ST-105", { assignee: ANA, labels: ["S1"], estado: DONE, resolucion: "2026-08-18T08:15:00.000-0500", historia: "HU-11" }),

  // Caso normal, propia, cumplida en s2.
  issue("ST-201", { assignee: BETO, labels: ["S2"], estado: DONE, resolucion: "2026-08-21T17:30:00.000-0500", historia: "HU-21" }),

  // Sin label de sprint -> no planificada, resuelta dentro de s2.
  issue("ST-202", { assignee: BETO, labels: [], estado: DONE, resolucion: "2026-08-25T10:00:00.000-0500", historia: "HU-21" }),

  // Apoyo porque EPIC-30 sigue asignada al líder.
  issue("ST-301", { assignee: CARO, labels: ["S2"], estado: DONE, resolucion: "2026-08-26T15:00:00.000-0500", historia: "HU-31" }),

  // Label S9: no existe en config/sprints.yaml.
  issue("ST-901", { assignee: ANA, labels: ["S9"], estado: DONE, resolucion: "2026-09-15T12:00:00.000-0500", historia: "HU-11" }),
];

/** Bordes que no forman parte del juego principal pero R-12 y F-00 deben cubrir. */
export const SUBTASKS_BORDE = [
  // Historia sin épica.
  issue("ST-501", { assignee: ANA, labels: ["S1"], estado: EN_CURSO, historia: "HU-51" }),
  // Épica sin responsable.
  issue("ST-401", { assignee: ANA, labels: ["S1"], estado: EN_CURSO, historia: "HU-41" }),
  // Assignee que no figura en config/team.yaml.
  issue("ST-777", { assignee: ZOE, labels: ["S1"], estado: DONE, resolucion: "2026-08-10T09:00:00.000-0500", historia: "HU-11" }),
];
