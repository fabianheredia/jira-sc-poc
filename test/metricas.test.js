import { test } from "node:test";
import assert from "node:assert/strict";

import { cargarConfiguracion, sprintPorId } from "../src/config.js";
import { normalizarSubtask, clasificarLote } from "../src/domain/clasificacion.js";
import { burndownSprint, resumenPorArquitecto, noPlanificadasEnSprints, parentRows, epicRows } from "../src/domain/metricas.js";
import { SUBTASKS, HISTORIAS, EPICAS } from "./fixtures/dataset.js";

const { sprints, team } = cargarConfiguracion();
const padres = { historias: HISTORIAS, epicas: EPICAS };

const clasificadas = clasificarLote(
  SUBTASKS.map((i) => normalizarSubtask(i, padres)),
  { sprints, team }
);

/* =========================================================
   F-02 — Burndown del sprint
========================================================= */

test("el burndown de s1 tiene 10 días hábiles, de 03-ago a 14-ago", () => {
  const bd = burndownSprint(clasificadas, sprintPorId(sprints, "s1"));
  assert.equal(bd.labels.length, 10);
  assert.equal(bd.labels[0], "2026-08-03");
  assert.equal(bd.labels.at(-1), "2026-08-14");
});

test("la curva real de s1 baja con cada cumplida y termina en 3", () => {
  const bd = burndownSprint(clasificadas, sprintPorId(sprints, "s1"));
  assert.equal(bd.total, 5); // ST-101,102,103,104,105

  const porDia = Object.fromEntries(bd.labels.map((l, i) => [l, bd.remaining[i]]));
  assert.equal(porDia["2026-08-03"], 5);
  assert.equal(porDia["2026-08-06"], 5);
  assert.equal(porDia["2026-08-07"], 4); // ST-101 resuelta
  assert.equal(porDia["2026-08-11"], 4);
  assert.equal(porDia["2026-08-12"], 3); // ST-104 resuelta
  assert.equal(porDia["2026-08-14"], 3);
});

test("ST-105 resuelta fuera de s1 no hace bajar la curva de s1", () => {
  const bd = burndownSprint(clasificadas, sprintPorId(sprints, "s1"));
  assert.equal(bd.remaining.at(-1), 3);
});

test("un sprint sin argumento devuelve una curva vacía", () => {
  assert.deepEqual(burndownSprint(clasificadas, null), { labels: [], remaining: [] });
});

/* =========================================================
   F-03 — Compromiso y cumplimiento por arquitecto
========================================================= */

test("resumen por arquitecto en s1: Ana 1/4, Beto 1/1, Caro ausente", () => {
  const resumen = resumenPorArquitecto(clasificadas, ["s1"], { team });
  const porNombre = Object.fromEntries(resumen.map((r) => [r.nombre, r]));

  assert.equal(porNombre["Ana Rivas"].comprometidas, 4);
  assert.equal(porNombre["Ana Rivas"].cumplidas, 1);
  assert.equal(porNombre["Beto Luna"].comprometidas, 1);
  assert.equal(porNombre["Beto Luna"].cumplidas, 1);
  assert.equal(porNombre["Caro Díaz"], undefined);
});

test("resumen por arquitecto en s2: los tres cumplen el 100%", () => {
  const resumen = resumenPorArquitecto(clasificadas, ["s2"], { team });
  const porNombre = Object.fromEntries(resumen.map((r) => [r.nombre, r]));

  assert.equal(porNombre["Ana Rivas"].comprometidas, 1);
  assert.equal(porNombre["Ana Rivas"].cumplidas, 1);
  assert.equal(porNombre["Beto Luna"].comprometidas, 1);
  assert.equal(porNombre["Beto Luna"].cumplidas, 1);
  assert.equal(porNombre["Caro Díaz"].comprometidas, 1);
  assert.equal(porNombre["Caro Díaz"].cumplidas, 1);
});

test("el trabajo no planificado no entra al resumen de comprometidas", () => {
  const resumen = resumenPorArquitecto(clasificadas, ["s2"], { team });
  const beto = resumen.find((r) => r.nombre === "Beto Luna");
  assert.equal(beto.comprometidas, 1); // ST-202 (no planificada) no cuenta
});

test("noPlanificadasEnSprints cuenta ST-202 en s2", () => {
  assert.equal(noPlanificadasEnSprints(clasificadas, ["s2"]), 1);
  assert.equal(noPlanificadasEnSprints(clasificadas, ["s1"]), 0);
});

/* =========================================================
   Agrupación por historia y por épica
========================================================= */

test("parentRows agrupa por historia con total y cumplidas", () => {
  const rows = parentRows(clasificadas);
  const hu11 = rows.find((r) => r.parentKey === "HU-11");
  // ST-101, ST-102, ST-105, ST-901 -> 4 sub-tasks, las 4 en Done
  assert.equal(hu11.total, 4);
  assert.equal(hu11.done, 4);
  assert.equal(hu11.parentSummary, "Discovery");
});

test("epicRows agrupa por épica con total y cumplidas", () => {
  const rows = epicRows(clasificadas);
  const epic10 = rows.find((r) => r.epicKey === "EPIC-10");
  // HU-11 (101,102,105,901) + HU-12 (103,104) -> 6 sub-tasks, 5 Done (103 no)
  assert.equal(epic10.total, 6);
  assert.equal(epic10.done, 5);
  assert.equal(epic10.epicSummary, "Gobierno de datos");
});
