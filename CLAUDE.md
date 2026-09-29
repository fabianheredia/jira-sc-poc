# jira-dash — contexto para Claude

Dashboard de sprint y eficiencia para el equipo de arquitectura de datos, sobre Jira Data Center
(auth PAT, TLS corporativo self-signed). Backend Express (`server.js`) + capa de dominio pura en
`src/` + frontend Chart.js en `public/`.

## Al empezar a trabajar en este repo: valida el avance real, no lo asumas

Los documentos en `idea/` describen la intención y las reglas de negocio, pero **el código es la
fuente de verdad sobre qué está implementado**. Antes de proponer o hacer cambios:

1. Si `node_modules` no existe, corre `npm install`. Luego `npm test` — los tests en `test/*.test.js`
   son la prueba real de qué reglas de dominio están implementadas y correctas.
2. Repasa `idea/03_requisitos_gherkin.md` (features F-00 a F-08, reglas R-01 a R-20) y contrasta
   cada feature contra `src/config.js`, `src/dates.js`, `src/domain/*.js` y los endpoints en
   `server.js`. No confíes en que un feature "documentado" ya esté escrito.
3. Repasa `idea/02_preguntas_abiertas.md` — el bloque A (reglas de negocio) está cerrado y confirmado
   por el sponsor; los bloques B (contexto organizacional) y C (despliegue) tienen preguntas
   abiertas que no bloquean el desarrollo.
4. Antes de asumir el alcance de una tarea, resume en 1-2 frases qué hay implementado y probado, y
   qué falta — igual que harías con cualquier estado de avance real.

### Snapshot de la última verificación (2026-09-29) — reverificar, no dar por hecho

- **Hecho y con tests (74/74 pasando):** F-00 (`src/config.js`, `config/*.yaml`), F-01
  (`src/domain/clasificacion.js`: carry-over, fuera de sprint, no planificada), el núcleo de F-07
  (propia vs apoyo, dentro de `clasificacion.js`), F-02/F-03 básicos (`src/domain/metricas.js`:
  burndown por sprint, resumen comprometidas/cumplidas por arquitecto).
- **Cableado en `server.js`:** `/api/meta` (desde config, no desde Jira) y `/api/dashboard`
  (burndown de equipo/usuario, comprometidas-vs-cumplidas, historias/épicas, aviso de truncamiento
  D-04), `app.listen()`. D-01 y D-02 (truncamiento de `server.js` y backtick suelto en
  `public/app.js`) están reparados.
- **Pendiente:** F-04 (los 4 indicadores de eficiencia por separado: cumplimiento, throughput,
  cycle time, carry-over rate), F-05 (vista individual con drill-down), F-06 (evolución en el
  tiempo entre sprints), y los refuerzos de F-02 (línea ideal + promedio histórico). Cualquiera de
  estos cambia la forma de `/api/dashboard` y probablemente `public/app.js` — no asumas que caben
  en el contrato JSON actual sin extenderlo.

## Reglas de negocio: no son supuestos, no las reinventes

R-01 a R-20 en `idea/03_requisitos_gherkin.md` fueron confirmadas por el sponsor (trazabilidad en
`idea/02_preguntas_abiertas.md`, bloque A, cerrado 2026-09-28). Si algo parece ambiguo, la pregunta
y su respuesta ya existen en ese documento — búscala antes de suponer. No cambies una regla de
negocio ya confirmada sin que el usuario lo pida explícitamente.

## Capa de cliente Jira: no tocar sin razón

`authHeader`, `parseRetryAfterMs`, `jiraGetJson`, `loadFieldMetadataOnce`, `jiraSearchPaginated`,
`fetchParents`, `fetchEpics` en `server.js` son el contrato estable con Jira (reintento acotado
ante 429, paginación, resolución de Epic Link). `isDone` y `sprintLabelsFrom` viven en
`src/jira/fields.js`. Ver `idea/00_hallazgos_codigo.md` §2 para el detalle verificado de cada pieza.

## Skills del proyecto — úsalas, no las ignores

Este repo tiene una colección de skills de ingeniería en `.agents/skills/` (formato `SKILL.md` con
frontmatter `name`/`description`, pero **no** están en `.claude/skills/`, así que no aparecen en el
listado de skills invocables por el tool `Skill` — hay que leer su `SKILL.md` y seguir el proceso
manualmente, no esperar que se autoinvoquen).

- Empieza por `.agents/skills/using-agent-skills/SKILL.md`: es el meta-skill que indica cuál aplica
  según la fase del trabajo (definir, planear, construir, verificar, revisar, entregar).
- Para features nuevas del Gherkin (F-04 en adelante), la secuencia esperada — la misma que dejó
  planteada `idea/03_requisitos_gherkin.md` en su "Siguiente paso" — es:
  `spec-driven-development` → `planning-and-task-breakdown` → `incremental-implementation` →
  `test-driven-development` → `code-review-and-quality`.
- Para un bug o algo que se rompió: `debugging-and-error-recovery` → `test-driven-development` →
  `code-review-and-quality`.
- No es necesario pasar por todas las skills para cambios triviales (un fix de una línea, un typo).
  Úsalas cuando el tamaño y la ambigüedad de la tarea las justifique — son procesos, no checklists
  burocráticas.
