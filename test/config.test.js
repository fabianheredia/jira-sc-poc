import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  cargarSprints,
  cargarTeam,
  cargarConfiguracion,
  sprintPorId,
  sprintPorFecha,
  sprintContiene,
  sprintSiguiente,
  esDelEquipo,
  nombreVisible,
} from "../src/config.js";
import { parseFecha, formatFecha } from "../src/dates.js";

function yamlTemporal(contenido) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jira-sc-"));
  const ruta = path.join(dir, "config.yaml");
  fs.writeFileSync(ruta, contenido, "utf8");
  return ruta;
}

/* =========================================================
   F-00: "Cargar las fechas de los sprints al arrancar"
========================================================= */

test("los sprints del repositorio se cargan con su rango y sus días hábiles", () => {
  const sprints = cargarSprints();

  assert.deepEqual(sprints.map((s) => s.id), ["s1", "s2", "s3"]);
  assert.deepEqual(sprints.map((s) => s.nombre), ["Sprint 1", "Sprint 2", "Sprint 3"]);
  assert.deepEqual(sprints.map((s) => s.totalDiasHabiles), [10, 10, 10]);

  const s1 = sprintPorId(sprints, "s1");
  assert.equal(formatFecha(s1.inicio), "2026-08-03");
  assert.equal(formatFecha(s1.fin), "2026-08-14");
});

test("los sprints quedan ordenados por fecha de inicio, no por el texto del label", () => {
  const ruta = yamlTemporal(`
sprints:
  - id: s10
    nombre: Sprint 10
    inicio: "2026-09-14"
    fin: "2026-09-25"
  - id: s2
    nombre: Sprint 2
    inicio: "2026-08-17"
    fin: "2026-08-28"
`);
  assert.deepEqual(cargarSprints(ruta).map((s) => s.id), ["s2", "s10"]);
});

test("el id del sprint se normaliza a minúscula", () => {
  const ruta = yamlTemporal(`
sprints:
  - id: S1
    nombre: Sprint 1
    inicio: "2026-08-03"
    fin: "2026-08-14"
`);
  assert.equal(cargarSprints(ruta)[0].id, "s1");
});

/* =========================================================
   F-00: validación — un YAML inválido falla con mensaje explícito
========================================================= */

const YAML_INVALIDOS = [
  ["sin la clave sprints", `otra_cosa: 1`, /debe tener una lista bajo la clave "sprints"/],
  ["sin id", `sprints:\n  - nombre: X\n    inicio: "2026-08-03"\n    fin: "2026-08-14"`, /falta "id"/],
  ["id con forma inválida", `sprints:\n  - id: sprint-uno\n    inicio: "2026-08-03"\n    fin: "2026-08-14"`, /no tiene la forma s<n>/],
  ["id duplicado", `sprints:\n  - id: s1\n    inicio: "2026-08-03"\n    fin: "2026-08-14"\n  - id: s1\n    inicio: "2026-08-17"\n    fin: "2026-08-28"`, /duplicado/],
  ["inicio inválido", `sprints:\n  - id: s1\n    inicio: "ayer"\n    fin: "2026-08-14"`, /"inicio" no es una fecha/],
  ["fin anterior al inicio", `sprints:\n  - id: s1\n    inicio: "2026-08-14"\n    fin: "2026-08-03"`, /es anterior a "inicio"/],
  ["rango sin días hábiles", `sprints:\n  - id: s1\n    inicio: "2026-08-08"\n    fin: "2026-08-09"`, /no contiene ningún día hábil/],
];

for (const [caso, contenido, esperado] of YAML_INVALIDOS) {
  test(`cargarSprints falla con mensaje explícito: ${caso}`, () => {
    assert.throws(() => cargarSprints(yamlTemporal(contenido)), esperado);
  });
}

test("cargarSprints informa la ruta cuando el archivo no existe", () => {
  assert.throws(() => cargarSprints("/ruta/que/no/existe.yaml"), /No se pudo leer/);
});

/* =========================================================
   F-00: "Cargar el equipo con clave estable y nombre visible"
========================================================= */

test("el equipo se carga indexado por key y expone el nombre visible", () => {
  const { porKey, lista } = cargarTeam();

  assert.deepEqual(lista.map((a) => a.key), ["arq.ana", "arq.beto", "arq.caro", "lider.max"]);
  assert.equal(porKey.get("arq.ana").nombre, "Ana Rivas");
  assert.equal(porKey.size, 4);
});

test("cargarTeam exige key y nombre", () => {
  assert.throws(() => cargarTeam(yamlTemporal(`arquitectos:\n  - nombre: Sin Key`)), /falta "key"/);
  assert.throws(() => cargarTeam(yamlTemporal(`arquitectos:\n  - key: sin.nombre`)), /falta "nombre"/);
  assert.throws(
    () => cargarTeam(yamlTemporal(`arquitectos:\n  - key: a\n    nombre: A\n  - key: a\n    nombre: B`)),
    /duplicada/
  );
});

/* =========================================================
   F-00: "Un arquitecto de Jira que no está en config/team.yaml"
========================================================= */

test("una key ajena a config/team.yaml no pertenece al equipo y no tiene nombre visible", () => {
  const { team } = cargarConfiguracion();

  assert.equal(esDelEquipo(team, "arq.ana"), true);
  assert.equal(esDelEquipo(team, "externo.zoe"), false);
  assert.equal(esDelEquipo(team, null), false);
  assert.equal(nombreVisible(team, "externo.zoe"), null);
});

/* =========================================================
   R-05: acreditación del cumplimiento por rango de fechas
========================================================= */

test("sprintPorFecha devuelve el sprint cuyo rango contiene la fecha", () => {
  const sprints = cargarSprints();

  assert.equal(sprintPorFecha(sprints, parseFecha("2026-08-03")).id, "s1", "primer día inclusive");
  assert.equal(sprintPorFecha(sprints, parseFecha("2026-08-14")).id, "s1", "último día inclusive");
  assert.equal(sprintPorFecha(sprints, parseFecha("2026-08-20")).id, "s2");
});

test("sprintPorFecha devuelve null en el hueco entre dos sprints", () => {
  const sprints = cargarSprints();
  assert.equal(sprintPorFecha(sprints, parseFecha("2026-08-15")), null, "sábado entre s1 y s2");
  assert.equal(sprintPorFecha(sprints, parseFecha("2026-09-15")), null, "posterior a s3");
});

test("sprintContiene respeta ambos extremos", () => {
  const s1 = sprintPorId(cargarSprints(), "s1");
  assert.equal(sprintContiene(s1, parseFecha("2026-08-02")), false);
  assert.equal(sprintContiene(s1, parseFecha("2026-08-03")), true);
  assert.equal(sprintContiene(s1, parseFecha("2026-08-14")), true);
  assert.equal(sprintContiene(s1, parseFecha("2026-08-15")), false);
});

test("sprintSiguiente recorre el orden configurado y termina en null", () => {
  const sprints = cargarSprints();
  assert.equal(sprintSiguiente(sprints, "s1").id, "s2");
  assert.equal(sprintSiguiente(sprints, "s2").id, "s3");
  assert.equal(sprintSiguiente(sprints, "s3"), null);
  assert.equal(sprintSiguiente(sprints, "s9"), null);
});

/* =========================================================
   F-00 / R-19: "Un label de sprint que no está configurado"
========================================================= */

test("un sprint no registrado devuelve null sin lanzar excepción", () => {
  const sprints = cargarSprints();
  assert.equal(sprintPorId(sprints, "s9"), null);
  assert.equal(sprintPorId(sprints, "S9"), null, "también en mayúscula");
});
