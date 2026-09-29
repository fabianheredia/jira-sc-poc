import { test } from "node:test";
import assert from "node:assert/strict";

import { cargarConfiguracion } from "../src/config.js";
import {
  normalizarSubtask,
  clasificarSubtask,
  clasificarLote,
  clasificacionEnSprint,
  esArrastrada,
  fueraDeSprint,
  sprintsNoConfigurados,
  INICIATIVA_PROPIA,
  INICIATIVA_APOYO,
  SIN_INICIATIVA,
  CLAS_CUMPLIDA,
  CLAS_NO_CUMPLIDA,
  CLAS_FUERA_DE_SPRINT,
  CLAS_NO_PLANIFICADA,
} from "../src/domain/clasificacion.js";
import { SUBTASKS, SUBTASKS_BORDE, HISTORIAS, EPICAS } from "./fixtures/dataset.js";
import { formatFecha } from "../src/dates.js";

const { sprints, team } = cargarConfiguracion();
const padres = { historias: HISTORIAS, epicas: EPICAS };

const clasificadas = clasificarLote(
  [...SUBTASKS, ...SUBTASKS_BORDE].map((i) => normalizarSubtask(i, padres)),
  { sprints, team }
);

const porClave = new Map(clasificadas.map((c) => [c.clave, c]));
const sub = (clave) => porClave.get(clave);

/* =========================================================
   Normalización desde la forma cruda de Jira
========================================================= */

test("normalizarSubtask resuelve historia, épica y responsable de la épica", () => {
  const n = normalizarSubtask(SUBTASKS[0], padres);

  assert.equal(n.clave, "ST-101");
  assert.equal(n.assigneeKey, "arq.ana");
  assert.equal(n.historiaKey, "HU-11");
  assert.equal(n.historiaResumen, "Discovery");
  assert.equal(n.epicaKey, "EPIC-10");
  assert.equal(n.epicaResumen, "Gobierno de datos");
  assert.equal(n.epicaAssigneeKey, "arq.ana");
  assert.equal(n.completada, true);
  assert.equal(formatFecha(n.fechaResolucion), "2026-08-07");
});

test("normalizarSubtask no inventa datos cuando falta la historia o la épica", () => {
  const n = normalizarSubtask(SUBTASKS[0], { historias: new Map(), epicas: new Map() });
  assert.equal(n.historiaResumen, null);
  assert.equal(n.epicaKey, null);
  assert.equal(n.epicaAssigneeKey, null);
});

/* =========================================================
   F-01: "Una sub-task se compromete en cada sprint cuyo label lleve"  — R-03
========================================================= */

test("dos labels de sprint son dos compromisos", () => {
  assert.deepEqual(sub("ST-102").sprintsComprometidos, ["s1", "s2"]);
});

test("los sprints comprometidos salen en orden cronológico, no alfabético", () => {
  const n = normalizarSubtask(
    { key: "ST-X", fields: { labels: ["S2", "S1"], status: {}, parent: { key: "HU-11" } } },
    padres
  );
  assert.deepEqual(clasificarSubtask(n, { sprints }).sprintsComprometidos, ["s1", "s2"]);
});

/* =========================================================
   F-01: "Cumplimiento acreditado al sprint que contiene la fecha"  — R-05
========================================================= */

test("el cumplimiento se acredita por fecha de resolución, no por label", () => {
  const st102 = sub("ST-102");
  assert.equal(st102.sprintCumplido, "s2");
  assert.equal(clasificacionEnSprint(st102, "s2", { sprints }), CLAS_CUMPLIDA);
  assert.notEqual(clasificacionEnSprint(st102, "s1", { sprints }), CLAS_CUMPLIDA);
});

/* =========================================================
   F-01: "Carry-over penaliza al sprint de origen"  — R-07
========================================================= */

test("una sub-task con S1 y S2 es arrastrada desde s1", () => {
  assert.deepEqual(sub("ST-102").arrastradaDesde, ["s1"]);
  assert.equal(esArrastrada(sub("ST-102"), "s1"), true);
  assert.equal(esArrastrada(sub("ST-102"), "s2"), false);
});

test("una sub-task de un solo sprint no es arrastrada", () => {
  assert.deepEqual(sub("ST-101").arrastradaDesde, []);
});

test("el carry-over exige el label del sprint INMEDIATAMENTE siguiente", () => {
  const n = normalizarSubtask(
    { key: "ST-SALTO", fields: { labels: ["S1", "S3"], status: {}, parent: { key: "HU-11" } } },
    padres
  );
  const c = clasificarSubtask(n, { sprints });
  assert.deepEqual(c.sprintsComprometidos, ["s1", "s3"]);
  assert.deepEqual(c.arrastradaDesde, [], "s1 -> s3 salta s2, no es carry-over de s1");
});

/* =========================================================
   F-01: "Sub-task resuelta fuera del rango de todo sprint"  — R-06
========================================================= */

test("resuelta después de que el sprint cerró: no cumplida y a la bolsa fuera de sprint", () => {
  const st105 = sub("ST-105");

  assert.equal(formatFecha(st105.fechaResolucion), "2026-08-18");
  assert.equal(st105.sprintCumplido, null, "no se acredita a ningún sprint");
  assert.equal(st105.fueraDeSprint, true);
  assert.equal(clasificacionEnSprint(st105, "s1", { sprints }), CLAS_FUERA_DE_SPRINT);
});

test("la bolsa fuera de sprint es consultable y no pierde sub-tasks", () => {
  assert.deepEqual(
    fueraDeSprint(clasificadas).map((c) => c.clave).sort(),
    ["ST-105", "ST-901"]
  );
});

/* =========================================================
   F-01: "Sub-task sin label de sprint es trabajo no planificado"  — R-10, R-11
========================================================= */

test("sin label de sprint es no planificada y se atribuye por fecha", () => {
  const st202 = sub("ST-202");

  assert.equal(st202.planificada, false);
  assert.deepEqual(st202.sprintsComprometidos, []);
  assert.equal(st202.sprintCumplido, "s2");
  assert.equal(clasificacionEnSprint(st202, "s2", { sprints }), CLAS_NO_PLANIFICADA);
  assert.equal(clasificacionEnSprint(st202, "s1", { sprints }), null, "no aparece en otro sprint");
});

/* =========================================================
   F-01: "Solo statusCategory Done cuenta como completada"  — R-04
========================================================= */

test("un estado cuya categoría no es Done queda comprometido y no cumplido", () => {
  const st103 = sub("ST-103");
  assert.equal(st103.completada, false);
  assert.equal(st103.sprintCumplido, null);
  assert.equal(st103.fueraDeSprint, false, "sin completar no va a la bolsa fuera de sprint");
  assert.equal(clasificacionEnSprint(st103, "s1", { sprints }), CLAS_NO_CUMPLIDA);
});

/* =========================================================
   F-01 / R-19: label de sprint no registrado en la configuración
========================================================= */

test("un label S9 no configurado se reporta sin romper la clasificación", () => {
  const st901 = sub("ST-901");

  assert.deepEqual(st901.sprintLabels, ["s9"]);
  assert.deepEqual(st901.sprintsComprometidos, [], "no se puede comprometer a un sprint sin fechas");
  assert.deepEqual(st901.sprintsNoConfigurados, ["s9"]);
  assert.equal(st901.planificada, true, "lleva label: no es trabajo no planificado");
});

test("los labels no configurados se pueden listar para el aviso de la interfaz", () => {
  assert.deepEqual(sprintsNoConfigurados(clasificadas), ["s9"]);
});

/* =========================================================
   F-07 anticipado: iniciativa propia vs apoyo  — R-12
========================================================= */

test("la épica del mismo responsable es iniciativa propia", () => {
  assert.equal(sub("ST-101").iniciativa, INICIATIVA_PROPIA);
});

test("la épica de otro arquitecto es apoyo", () => {
  const st104 = sub("ST-104");
  assert.equal(st104.assigneeKey, "arq.beto");
  assert.equal(st104.epicaAssigneeKey, "arq.ana");
  assert.equal(st104.iniciativa, INICIATIVA_APOYO);
});

test("una épica aún asignada al líder produce apoyo, sin excepción", () => {
  const st301 = sub("ST-301");
  assert.equal(st301.epicaAssigneeKey, "lider.max");
  assert.equal(st301.iniciativa, INICIATIVA_APOYO);
});

test("la comparación usa el responsable de la épica, no el de la historia", () => {
  // HU-12 pertenece a EPIC-10; la clasificación de ST-104 depende de EPIC-10.
  const n = normalizarSubtask(SUBTASKS[3], padres);
  assert.equal(n.historiaKey, "HU-12");
  assert.equal(n.epicaKey, "EPIC-10");
  assert.equal(clasificarSubtask(n, { sprints }).iniciativa, INICIATIVA_APOYO);
});

test("sin épica resoluble no se asume ni propia ni apoyo", () => {
  const st501 = sub("ST-501");
  assert.equal(st501.iniciativa, SIN_INICIATIVA);
  assert.match(st501.motivoSinIniciativa, /no tiene épica/);
});

test("una épica sin responsable se reporta como hueco, no se atribuye", () => {
  const st401 = sub("ST-401");
  assert.equal(st401.iniciativa, SIN_INICIATIVA);
  assert.match(st401.motivoSinIniciativa, /EPIC-40 no tiene responsable/);
});

/* =========================================================
   F-00: assignee ajeno al equipo configurado
========================================================= */

test("la clasificación marca si el responsable pertenece al equipo configurado", () => {
  assert.equal(sub("ST-101").enEquipo, true);
  assert.equal(sub("ST-777").enEquipo, false);
});

/* =========================================================
   F-01: "Clasificación completa del juego de datos en s1"
   (Esquema del escenario del Gherkin, tabla de ejemplos literal)
========================================================= */

const ESPERADO_S1 = [
  ["ST-101", CLAS_CUMPLIDA],
  ["ST-102", "comprometida, arrastrada a s2"],
  ["ST-103", CLAS_NO_CUMPLIDA],
  ["ST-104", CLAS_CUMPLIDA],
  ["ST-105", CLAS_FUERA_DE_SPRINT],
  ["ST-202", null],
];

for (const [clave, esperado] of ESPERADO_S1) {
  test(`clasificación de ${clave} en s1 -> ${esperado ?? "(no aplica)"}`, () => {
    assert.equal(clasificacionEnSprint(sub(clave), "s1", { sprints }), esperado);
  });
}

test("ST-202 se clasifica como no planificada en el sprint donde cayó su resolución", () => {
  assert.equal(clasificacionEnSprint(sub("ST-202"), "s2", { sprints }), CLAS_NO_PLANIFICADA);
});

const ESPERADO_S2 = [
  ["ST-102", CLAS_CUMPLIDA],
  ["ST-201", CLAS_CUMPLIDA],
  ["ST-202", CLAS_NO_PLANIFICADA],
  ["ST-301", CLAS_CUMPLIDA],
  ["ST-101", null],
];

for (const [clave, esperado] of ESPERADO_S2) {
  test(`clasificación de ${clave} en s2 -> ${esperado ?? "(no aplica)"}`, () => {
    assert.equal(clasificacionEnSprint(sub(clave), "s2", { sprints }), esperado);
  });
}

/* =========================================================
   Inmutabilidad: clasificar no debe mutar la entrada
========================================================= */

test("clasificarSubtask no muta la sub-task normalizada", () => {
  const n = normalizarSubtask(SUBTASKS[0], padres);
  const antes = JSON.stringify(n);
  clasificarSubtask(n, { sprints, team });
  assert.equal(JSON.stringify(n), antes);
});

/* =========================================================
   Invariante que justifica Q-46: un sprint nunca puede tener
   más sub-tasks cumplidas que comprometidas.
========================================================= */

test("ningún sprint acumula más cumplidas que comprometidas", () => {
  for (const sprint of sprints) {
    const comprometidas = clasificadas.filter((c) => c.sprintsComprometidos.includes(sprint.id));
    const cumplidas = comprometidas.filter((c) => c.sprintCumplido === sprint.id);

    assert.ok(
      cumplidas.length <= comprometidas.length,
      `${sprint.id}: ${cumplidas.length} cumplidas sobre ${comprometidas.length} comprometidas`
    );
  }
});

test("una sub-task planificada resuelta en un sprint que no comprometió no se acredita a nadie", () => {
  const st105 = sub("ST-105");

  assert.deepEqual(st105.sprintsComprometidos, ["s1"], "sólo prometió s1");
  assert.equal(formatFecha(st105.fechaResolucion), "2026-08-18", "se resolvió durante s2");
  assert.equal(st105.sprintCumplido, null, "no se acredita a s2: nunca lo comprometió");
  assert.equal(clasificacionEnSprint(st105, "s2", { sprints }), null);
});
