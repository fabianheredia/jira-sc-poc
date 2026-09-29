import { test } from "node:test";
import assert from "node:assert/strict";

import {
  parseFecha,
  formatFecha,
  esDiaHabil,
  diasHabiles,
  diasHabilesTranscurridos,
} from "../src/dates.js";

test("parseFecha acepta YYYY-MM-DD", () => {
  assert.equal(formatFecha(parseFecha("2026-08-03")), "2026-08-03");
});

test("parseFecha toma la fecha que Jira reporta, sin reinterpretar el offset", () => {
  assert.equal(formatFecha(parseFecha("2026-08-07T14:03:00.000-0500")), "2026-08-07");
  assert.equal(formatFecha(parseFecha("2026-08-07T23:59:00.000-0500")), "2026-08-07");
});

test("parseFecha devuelve null ante valores no utilizables", () => {
  for (const v of [null, undefined, "", "ayer", 42]) assert.equal(parseFecha(v), null);
});

test("esDiaHabil excluye sábado y domingo", () => {
  assert.equal(esDiaHabil(parseFecha("2026-08-07")), true, "viernes");
  assert.equal(esDiaHabil(parseFecha("2026-08-08")), false, "sábado");
  assert.equal(esDiaHabil(parseFecha("2026-08-09")), false, "domingo");
  assert.equal(esDiaHabil(parseFecha("2026-08-10")), true, "lunes");
});

// F-00: "Calcular los días hábiles de un sprint"
test("un sprint de dos semanas tiene 10 días hábiles y ningún fin de semana", () => {
  const dias = diasHabiles(parseFecha("2026-08-03"), parseFecha("2026-08-14"));
  assert.equal(dias.length, 10);
  assert.ok(dias.every(esDiaHabil));
  assert.equal(formatFecha(dias[0]), "2026-08-03");
  assert.equal(formatFecha(dias.at(-1)), "2026-08-14");
});

test("diasHabiles devuelve vacío si el fin es anterior al inicio", () => {
  assert.deepEqual(diasHabiles(parseFecha("2026-08-14"), parseFecha("2026-08-03")), []);
});

// R-16: unidad del cycle time
test("diasHabilesTranscurridos cuenta ambos extremos", () => {
  const inicio = parseFecha("2026-08-03");
  assert.equal(diasHabilesTranscurridos(inicio, parseFecha("2026-08-03")), 1);
  assert.equal(diasHabilesTranscurridos(inicio, parseFecha("2026-08-07")), 5);
  assert.equal(diasHabilesTranscurridos(inicio, parseFecha("2026-08-12")), 8);
});

test("diasHabilesTranscurridos es null si la fecha precede al inicio", () => {
  assert.equal(diasHabilesTranscurridos(parseFecha("2026-08-03"), parseFecha("2026-07-31")), null);
});
