import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import https from "https";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const PORT = Number(process.env.PORT || 3000);
const JIRA_URL = process.env.JIRA_URL;
const JIRA_TOKEN = process.env.JIRA_TOKEN;
const DEFAULT_PROJECT = process.env.JIRA_PROJECT || "IA";

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

function isDone(issue) {
return issue?.fields?.status?.statusCategory?.name === "Done";
}

function sprintLabelsFrom(labels = []) {
if (!Array.isArray(labels)) return [];
return labels.filter((l) => /^s\d+$/i.test(l)).map((l) => l.toLowerCase());
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

// ===== Metrics builders =====
function buildMetaFromIssues(issues) {
const sprints = new Set();
const users = new Set();

for (const it of issues) {
const u