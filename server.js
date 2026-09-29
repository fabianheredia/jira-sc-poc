import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import https from "https";

import { cargarConfiguracion, sprintPorId } from "./src/config.js";
import { normalizarSubtask, clasificarLote } from "./src/domain/clasificacion.js";
import {
  burndownSprint,
  resumenPorArquitecto,
  parentRows,
  epicRows,
} from "./src/domain/metricas.js";

dotenv.config({ quiet: true });

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const PORT = Number(process.env.PORT || 3000);
const JIRA_URL = process.env.JIRA_URL;
const JIRA_TOKEN = process.env.JIRA_TOKEN;
const DEFAULT_PROJECT = process.env.JIRA_PROJECT || "IA";

// ===== Configuración F-00: falla explícita al arrancar si sprints.yaml o
// team.yaml están mal formados. Es un error del operador, no del dato de Jira.
let sprints, team;
try {
  ({ sprints, team } = cargarConfiguracion());
  console.log(`Configuración cargada: ${sprints.length} sprints, ${team.lista.length} arquitectos.`);
} catch (e) {
  console.error("No se pudo cargar la configuración (config/sprints.yaml, config/team.yaml):", e.message);
  process.exit(1);
}

// SSL corporativo (self-signed)
const agent = new https.Agent({ rejectUnauthorized: false });

// ===== Logging =====
app.use((req, _res, next) => {
console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
next();
});

process.on("unhandledRejection", (e) => console.error("UNHANDLED:", e));
process.on("uncaughtException", (e) => console.error("UNCAUGHT:", e));

// ===== Utils =====
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function authHeader() {
if (!JIRA_TOKEN) throw new Error("Falta JIRA_TOKEN en .env");
return `Bearer ${JIRA_TOKEN}`;
}

function getHeader(headers, name) {
return headers.get(name) || headers.get(name.toLowerCase()) || null;
}

function parseRetryAfterMs(headers, fallbackMs = 60000) {
const raw = getHeader(headers, "Retry-After");
if (!raw) return fallbackMs;

const n = Number(raw);
if (Number.isFinite(n) && n > 0) return Math.min(n * 1000, 60000);

const d = Date.parse(raw);
if (!Number.isNaN(d)) return Math.min(Math.max(d - Date.now(), 1000), 60000);

return fallbackMs;
}

// ===== Jira client with bounded retry =====
async function jiraGetJson(url, { max429Retries = 2 } = {}) {
for (let attempt = 0; attempt <= max429Retries; attempt++) {
const res = await fetch(url, {
agent,
headers: {
Authorization: authHeader(),
Accept: "application/json",
},
});

if (res.status === 429) {
const retryMs = parseRetryAfterMs(res.headers, 60000);
const limit = getHeader(res.headers, "X-RateLimit-Limit");
const remaining = getHeader(res.headers, "X-RateLimit-Remaining");
const interval = getHeader(res.headers, "X-RateLimit-Interval-Seconds");

console.warn(
`429 Too Many Requests. attempt=${attempt + 1}/${max429Retries + 1}. ` +
`RetryAfter=${retryMs}ms, Limit=${limit}, Remaining=${remaining}, Interval=${interval}`
);

if (attempt === max429Retries) {
const body = await res.text().catch(() => "");
throw new Error(
`429 persistente. RetryAfter=${retryMs}ms, Limit=${limit}, Remaining=${remaining}, Interval=${interval}. ` +
`Body: ${body.slice(0, 200)}`
);
}

await sleep(retryMs);
continue;
}

if (!res.ok) {
const text = await res.text().catch(() => "");
throw new Error(`Jira respondió ${res.status}: ${text.slice(0, 500)}`);
}

// OK
return res.json();
}

throw new Error("jiraGetJson falló sin respuesta");
}

// ===== Cache field metadata (Epic Link) =====
let fieldCache = { loaded: false, epicLinkId: null };

async function loadFieldMetadataOnce() {
if (fieldCache.loaded) return fieldCache;

const url = `${JIRA_URL}/rest/api/2/field`;
const fields = await jiraGetJson(url, { max429Retries: 1 });

// Buscar campo "Epic Link" (Data Center/Server clásico)
const epic = Array.isArray(fields)
? fields.find((f) => (f.name || "").toLowerCase() === "epic link")
: null;

fieldCache = {
loaded: true,
epicLinkId: epic?.id || null,
};

console.log("Field metadata loaded. EpicLinkId:", fieldCache.epicLinkId);
return fieldCache;
}

// ===== Search helpers =====
async function jiraSearchPaginated({ jql, fields = [], pageSize = 50, maxPages = 5 }) {
let startAt = 0;
let issues = [];
let total = null;

for (let page = 0; page < maxPages; page++) {
const url =
`${JIRA_URL}/rest/api/2/search` +
`?jql=${encodeURIComponent(jql)}` +
`&startAt=${startAt}` +
`&maxResults=${pageSize}` +
(fields.length ? `&fields=${encodeURIComponent(fields.join(","))}` : "");

console.log(`Search page ${page + 1}/${maxPages}: startAt=${startAt}`);

const data = await jiraGetJson(url, { max429Retries: 2 });
const batch = Array.isArray(data.issues) ? data.issues : [];
total = typeof data.total === "number" ? data.total : batch.length;

issues.push(...batch);

if (batch.length === 0) break;
if (issues.length >= total) break;

startAt += batch.length;
await sleep(1200); // throttle suave
}

return { issues, total: total ?? issues.length };
}

// ===== Bulk fetch parent stories to get epic link & summary =====
async function fetchParents(parentKeys, epicLinkId) {
const unique = Array.from(new Set(parentKeys)).filter(Boolean);
if (unique.length === 0) return new Map();

const parentMap = new Map();

const chunkSize = 40;
for (let i = 0; i < unique.length; i += chunkSize) {
const chunk = unique.slice(i, i + chunkSize);
const jql = `key in (${chunk.join(",")})`;

const fields = ["summary"];
if (epicLinkId) fields.push(epicLinkId);

const { issues } = await jiraSearchPaginated({
jql,
fields,
pageSize: 50,
maxPages: 2,
});

for (const p of issues) {
const key = p.key;
const summary = p.fields?.summary || "";
const epicKey = epicLinkId ? p.fields?.[epicLinkId] : null;
parentMap.set(key, { key, summary, epicKey });
}

await sleep(900);
}

return parentMap;
}

// ===== Bulk fetch epics to get their assignee (R-12 necesita comparar contra
// el assignee de la ÉPICA, no de la historia intermedia) =====
async function fetchEpics(epicKeys) {
const unique = Array.from(new Set(epicKeys)).filter(Boolean);
if (unique.length === 0) return new Map();

const epicMap = new Map();

const chunkSize = 40;
for (let i = 0; i < unique.length; i += chunkSize) {
const chunk = unique.slice(i, i + chunkSize);
const jql = `key in (${chunk.join(",")})`;

const { issues } = await jiraSearchPaginated({
jql,
fields: ["summary", "assignee"],
pageSize: 50,
maxPages: 2,
});

for (const e of issues) {
epicMap.set(e.key, {
key: e.key,
summary: e.fields?.summary || "",
assigneeKey: e.fields?.assignee?.key || null,
});
}

await sleep(900);
}

return epicMap;
}

// ===== Carga y clasificación de sub-tasks (F-01), con cache corto para no
// martillar Jira en cada cambio de filtro del dashboard =====
const SUBTASK_FIELDS = ["summary", "status", "assignee", "labels", "resolutiondate", "parent"];
const CACHE_TTL_MS = 120_000;
let subtasksCache = { at: 0, data: null };

function buildSubtaskJql() {
return process.env.JIRA_SUBTASK_JQL || `project = "${DEFAULT_PROJECT}" AND issuetype = Sub-task ORDER BY created ASC`;
}

async function loadClasificadas({ forceRefresh = false } = {}) {
const fresh = !forceRefresh && subtasksCache.data && Date.now() - subtasksCache.at < CACHE_TTL_MS;
if (fresh) return subtasksCache.data;

const { epicLinkId } = await loadFieldMetadataOnce();

const { issues, total } = await jiraSearchPaginated({
jql: buildSubtaskJql(),
fields: SUBTASK_FIELDS,
pageSize: 50,
maxPages: 5, // D-04: techo de 250 sub-tasks; counts.truncated avisa si se alcanza
});

const parentKeys = issues.map((it) => it.fields?.parent?.key).filter(Boolean);
const historias = await fetchParents(parentKeys, epicLinkId);

const epicKeys = [...historias.values()].map((h) => h.epicKey).filter(Boolean);
const epicas = await fetchEpics(epicKeys);

const clasificadas = clasificarLote(
issues.map((it) => normalizarSubtask(it, { historias, epicas })),
{ sprints, team }
);

const data = { clasificadas, loaded: issues.length, total };
subtasksCache = { at: Date.now(), data };
return data;
}

// ===== API =====

// F-00: sprints y equipo salen de la configuración, no de un escaneo de Jira.
app.get("/api/meta", (_req, res) => {
res.json({
ok: true,
meta: {
sprints: sprints.map((s) => s.id),
users: team.lista.map((a) => a.nombre),
},
});
});

app.get("/api/dashboard", async (req, res) => {
const sprintParam = String(req.query.sprint || "ALL");
const userParam = String(req.query.user || "ALL");
const forceRefresh = req.query.refresh === "1";

let loadResult;
try {
loadResult = await loadClasificadas({ forceRefresh });
} catch (e) {
// F-08: Jira caído o 429 agotado no debe presentarse como métricas parciales.
console.error("Error consultando Jira:", e);
res.status(502).json({ ok: false, error: e.message });
return;
}

const { clasificadas: todas, loaded, total } = loadResult;

const sprintObjetivo = sprintParam === "ALL" ? null : sprintPorId(sprints, sprintParam);
const sprintIds = sprintParam === "ALL" ? sprints.map((s) => s.id) : sprintObjetivo ? [sprintObjetivo.id] : [];

const arquitectoObjetivo = userParam === "ALL" ? null : team.lista.find((a) => a.nombre === userParam) || null;

const porUsuario = arquitectoObjetivo ? todas.filter((c) => c.assigneeKey === arquitectoObjetivo.key) : todas;

// Sub-tasks con algo que decir sobre el/los sprint(s) seleccionados: las
// comprometidas y las no planificadas que resolvieron dentro de su rango.
const relevantes =
sprintParam === "ALL"
? porUsuario
: sprintObjetivo
? porUsuario.filter(
(c) => c.sprintsComprometidos.includes(sprintObjetivo.id) || c.sprintCumplido === sprintObjetivo.id
)
: []; // sprint pedido no está en config/sprints.yaml (R-19): no rompe, no hay nada que mostrar

const teamBurndown = sprintObjetivo ? burndownSprint(todas, sprintObjetivo) : { labels: [], remaining: [] };

const userBurndown =
arquitectoObjetivo && sprintObjetivo ? burndownSprint(porUsuario, sprintObjetivo) : { labels: [], remaining: [] };

const resumen = resumenPorArquitecto(todas, sprintIds, { team });

res.json({
ok: true,
filters: { sprint: sprintParam, user: userParam },
counts: {
allIssuesLoaded: loaded,
filteredIssues: relevantes.length,
totalReportedByJira: total,
truncated: loaded < total,
},
// D-04 / F-08: ningún recorte silencioso.
warning:
loaded < total
? `Datos incompletos: se cargaron ${loaded} de ${total} sub-tasks reportadas por Jira.`
: null,
charts: {
teamBurndown,
userBurndown,
barCommittedVsDone: {
labels: resumen.map((r) => r.nombre),
committed: resumen.map((r) => r.comprometidas),
done: resumen.map((r) => r.cumplidas),
},
},
groups: {
parentRows: parentRows(relevantes),
epicRows: epicRows(relevantes),
},
});
});

app.listen(PORT, () => {
console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
