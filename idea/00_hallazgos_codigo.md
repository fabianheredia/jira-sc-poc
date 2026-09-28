# 00 — Hallazgos de la inspección del código

> Fecha de inspección: 2026-09-28
> Commit inspeccionado: `ae36092 add base information for project`
> Propósito: inventariar lo que ya existe para no re-especificar lo construido y para que las
> especificaciones futuras (Gherkin) se apoyen en hechos verificados, no en supuestos.

---

## 1. Inventario de archivos

| Archivo | Líneas | Rol |
|---|---|---|
| `server.js` | 206 | Backend Express + cliente Jira. **INCOMPLETO** (ver §4) |
| `public/index.html` | 145 | Shell del dashboard, tema oscuro, 5 canvas de Chart.js |
| `public/app.js` | 410 | Fetch de APIs + render de 5 gráficos. **Tiene error de sintaxis** (ver §4) |
| `package.json` | — | ESM (`"type": "module"`), sin script de arranque ni de test |
| `.env` | — | `JIRA_URL`, `JIRA_TOKEN`, `JIRA_PROJECT`, `PORT` (ignorado por git) |
| `.agents/skills/**` | 26 skills | Skills de desarrollo instaladas (`addyosmani/agent-skills`) |

---

## 2. Lo que SÍ funciona y se conserva — capa de cliente Jira (`server.js`)

Esta es la parte que la condición del proyecto declara estable. Se documenta con detalle
porque es el contrato con Jira que **no se debe tocar**.

| Componente | Línea | Comportamiento verificado |
|---|---|---|
| `authHeader()` | 34 | `Authorization: Bearer <JIRA_TOKEN>` → indica **Jira Data Center / Server** con PAT, no Jira Cloud |
| Agente HTTPS | 20 | `new https.Agent({ rejectUnauthorized: false })` → **verificación TLS desactivada** por certificado corporativo self-signed |
| `jiraGetJson()` | 66 | GET con reintento acotado ante `429`; lee `Retry-After`, `X-RateLimit-*`; tope de espera 60 s; `max429Retries` configurable (default 2) |
| `parseRetryAfterMs()` | 43 | Soporta `Retry-After` en segundos y en fecha HTTP |
| `loadFieldMetadataOnce()` | 114 | `GET /rest/api/2/field`, busca el campo cuyo nombre es `epic link` y cachea su `customfield_xxxxx`. Necesario porque en DC la épica no es `parent` |
| `jiraSearchPaginated()` | 135 | `GET /rest/api/2/search` con JQL; `pageSize` 50; **`maxPages` 5 → techo duro de 250 issues**; `sleep(1200)` entre páginas |
| `fetchParents()` | 167 | Resuelve los padres (historias) en lotes de 40 vía `key in (...)`; trae `summary` + `epicKey`; `sleep(900)` entre lotes |
| `isDone()` | 56 | Completado ⇔ `fields.status.statusCategory.name === "Done"` |
| `sprintLabelsFrom()` | 60 | Filtra labels con `/^s\d+$/i` y normaliza a minúscula → **ya soporta múltiples sprints por issue** |

### API de Jira efectivamente usada
- `GET /rest/api/2/field`
- `GET /rest/api/2/search?jql=&startAt=&maxResults=&fields=`

Solo dos endpoints. Ningún uso de `/rest/agile/1.0/board|sprint`, ni de `?expand=changelog`.

---

## 3. Contrato de datos que el frontend YA espera

Deducido de `public/app.js`. Cualquier backend nuevo debe cumplirlo (o cambiar ambos lados a la vez).

```jsonc
// GET /api/meta
{ "ok": true, "meta": { "sprints": ["s1","s2"], "users": ["..."] } }

// GET /api/dashboard?sprint=<ALL|sN>&user=<ALL|user>
{
  "ok": true,
  "filters": { "sprint": "ALL", "user": "ALL" },
  "counts":  { "allIssuesLoaded": 0, "filteredIssues": 0 },
  "charts": {
    "teamBurndown":       { "labels": [], "remaining": [] },
    "userBurndown":       { "labels": [], "remaining": [] },
    "barCommittedVsDone": { "labels": [], "committed": [], "done": [] }
  },
  "groups": {
    "parentRows": [ { "parentKey": "", "parentSummary": "", "total": 0, "done": 0 } ],
    "epicRows":   [ { "epicKey": "",   "epicSummary": "",   "total": 0, "done": 0 } ]
  }
}
```

### Visualizaciones implementadas (5)

| # | Gráfico | Tipo | Fuente | Recorte |
|---|---|---|---|---|
| 1 | Burndown Equipo | línea | `charts.teamBurndown` | — |
| 2 | Burndown Usuario | línea | `charts.userBurndown` | placeholder si `user === "ALL"` |
| 3 | Comprometidas vs Done | barra horizontal | `charts.barCommittedVsDone` | **Top 12** por `committed` |
| 4 | Historias (Parent) | barra horizontal | `groups.parentRows` | **Top 12** (primeros 12, sin ordenar) |
| 5 | Épicas | barra vertical | `groups.epicRows` | **Top 12**, nombre de iniciativa solo en tooltip |

Controles: dos `<select>` (sprint, usuario) + botón *Actualizar*. Cada cambio dispara una
recarga completa contra `/api/dashboard`.

---

## 4. Defectos bloqueantes encontrados

| ID | Archivo:línea | Defecto | Impacto |
|---|---|---|---|
| **D-01** | `server.js:206` | El archivo termina a mitad de `buildMetaFromIssues`, en `const u`. **No existen `/api/meta`, `/api/dashboard` ni `app.listen()`** | El servidor no arranca y ninguna de las dos APIs que el frontend consume está implementada |
| **D-02** | `public/app.js:410` | Carácter ``` `` ``` suelto tras `window.loadDashboard = loadDashboard;` (residuo de un fence markdown) | `SyntaxError`: el archivo no parsea, el dashboard no renderiza nada |
| **D-03** | `server.js:20` | `rejectUnauthorized: false` deshabilita la validación del certificado TLS | Riesgo de seguridad; probable punto de bloqueo con el área de seguridad/IT |
| **D-04** | `server.js:139` | `maxPages: 5` × `pageSize: 50` = **techo silencioso de 250 issues**; no se avisa al usuario cuando se trunca | Métricas incorrectas por debajo del umbral de detección si el volumen supera 250 |

> **Consecuencia sobre la premisa del proyecto:** la conexión a Jira (auth, retry, paginación,
> resolución de épica) es efectivamente estable y reutilizable. Lo que **no** existe es la capa
> de agregación ni los endpoints HTTP. El trabajo pendiente es mayor de lo que sugiere "ya hay
> una versión que no cumple al 100%".

---

## 5. Brecha frente a los 4 objetivos declarados

| Objetivo | Estado | Brecha concreta |
|---|---|---|
| **O1.** Evaluar ejecución del sprint (burndown + tareas por integrante) | 🟡 Parcial | Los dos burndowns y el "Comprometidas vs Done" están **dibujados pero no calculados** (D-01). Además falta definir la unidad de medida y el eje temporal → [Q-01], [Q-02], [Q-03], [Q-04] |
| **O2.** Medir eficiencia del arquitecto | 🔴 Ausente | No hay ninguna métrica de eficiencia en el código. Falta la definición de negocio → [Q-14] |
| **O3.** Vista general del equipo con zoom a la persona | 🟡 Parcial | Existen los dos filtros, pero no hay drill-down (clic en una barra → detalle), ni fila de KPIs de equipo, ni tabla de sub-tasks. El burndown de usuario exige preseleccionar en el combo |
| **O4.** Eficiencia del arquitecto en el tiempo | 🔴 Ausente | El filtro de sprint es de selección única (`ALL` o un `sN`). No hay ninguna serie multi-sprint |
| **O5.** Iniciativas propias vs apoyo | 🔴 Ausente | Requiere comparar el *assignee* de la épica contra el de la sub-task. `fetchParents()` trae `summary` + `epicKey` pero **no trae assignee**, y la épica nunca se consulta. Falta además la regla de negocio → [Q-18] |

(O5 no estaba numerado en el enunciado original; se numera aquí para poder trazarlo.)

---

## 6. Modelo de dominio según lo descrito por el usuario

```
Épica            = Iniciativa                       (normalmente asignada a 1 arquitecto)
  └─ Historia    = Agrupación temática              (discovery, EXM, TDD, OR, …)
       └─ Sub-task = COMPROMISO REAL DEL SPRINT     ← unidad de medida del dashboard
            labels = S1, S2, … Sn                   ← sprint(s) al que pertenece
```

Reglas del dominio que el código refleja hoy:
- El sprint se identifica **por label**, no por el campo Sprint de Jira. (`sprintLabelsFrom`)
- Una sub-task puede llevar **varios** labels de sprint → se re-compromete entre sprints. El parser
  ya devuelve una lista, así que el modelo lo soporta; la semántica de negocio no está definida → [Q-10].
- **Propia vs apoyo:** si el arquitecto tiene la épica asignada, todos sus hijos son trabajo propio;
  si solo tiene la sub-task, es apoyo a otra iniciativa. Regla exacta sin confirmar → [Q-18].

---

## 7. Qué se reutiliza y qué se reescribe

**Reutilizar tal cual (no tocar):**
`authHeader`, `parseRetryAfterMs`, `jiraGetJson`, `loadFieldMetadataOnce`, `jiraSearchPaginated`,
`fetchParents`, `isDone`, `sprintLabelsFrom`.

**Escribir:**
`buildMetaFromIssues` (completar), builders de burndown, agregador de eficiencia, detector
propia-vs-apoyo, endpoints `/api/meta` y `/api/dashboard`, `app.listen()`.

**Corregir:**
D-02 (una línea), D-04 (aviso de truncamiento), D-03 (decisión de seguridad → [Q-27]).

**Revisar según las respuestas:**
El contrato JSON de §3 y el set de 5 gráficos — O2 y O4 no caben en la forma actual.
