# Internal Solution Brief — Dashboard de Sprint para Equipo de Arquitectura de Datos

> **Plantilla base:** `idea/internal_solution_brief.md` (AI for Developers — Cohorte 4)
> **Estado:** borrador v0.1 — 2026-09-28
> **Cómo leer este documento:** todo lo marcado `[Q-nn]` es una incertidumbre **abierta**, no un
> supuesto. Está registrada en `idea/02_preguntas_abiertas.md`. Nada se ha inventado para rellenar
> un hueco. Las secciones marcadas ✅ están respaldadas por el enunciado del sponsor o por la
> inspección de código en `idea/00_hallazgos_codigo.md`.

---

## SOLUCIÓN

**Nombre de la solución:**
`[Q-32]` — propuesto: **Sprint Lens** (dashboard de ejecución y eficiencia para arquitectura de datos)

**Descripción en una línea:**
✅ Dashboard web que consume Jira y muestra, para un equipo de arquitectos de datos, la ejecución
del sprint (burndown y compromiso por persona), la eficiencia individual a lo largo del tiempo, y
el balance entre iniciativas propias y trabajo de apoyo.

**Empresa / Organización:**
`[Q-33]`

---

## 1. PROBLEMA DE NEGOCIO

**¿Cuál es el problema?**
✅ El equipo de arquitectura de datos atiende solicitudes de arquitectura organizadas en Jira como
Épica (iniciativa) → Historia (agrupación temática: discovery, EXM, TDD, OR…) → Sub-task (el
compromiso real del sprint, marcado con labels `S1..Sn`). Esa estructura es correcta para operar,
pero **Jira no la puede leer como sprint**: el sprint vive en un *label* de la sub-task, no en el
campo Sprint, así que los tableros y reportes nativos de Jira (burndown, velocity) no aplican.

Consecuencias:
1. No hay burndown confiable del sprint.
2. No hay forma de ver el compromiso y el cumplimiento **por arquitecto**.
3. No existe una medida de eficiencia del arquitecto, ni puntual ni en el tiempo.
4. No se distingue el trabajo sobre iniciativas propias del trabajo de apoyo a iniciativas de otros,
   lo que distorsiona cualquier lectura de carga y de desempeño.

**¿Cuánto cuesta este problema?**
`[Q-22]` — pendiente cuantificar: horas/sprint dedicadas hoy a armar el reporte a mano, frecuencia,
cuántas personas intervienen, decisiones que se toman tarde o sin dato.
*(Regla de la plantilla: "es lento" no sirve; hace falta el número.)*

**¿Hace cuánto existe este problema?**
`[Q-23]`

---

## 2. STAKEHOLDERS Y SPONSOR

**¿Quién es el sponsor?**
`[Q-19]`

**¿Quiénes son los usuarios finales?**
`[Q-20]` — hipótesis a confirmar: (a) el líder del equipo de arquitectura, para la vista general y
la conversación de desempeño; (b) cada arquitecto, para su propia vista; (c) `[Q-20]` ¿alguien fuera
del equipo (PM, gerencia, clientes internos)?

**¿Quién puede bloquear la adopción?**
`[Q-21]` — candidatos identificados desde el código:
- **Seguridad / IT:** el servidor desactiva la validación TLS (`rejectUnauthorized: false`,
  `server.js:20`) y usa un PAT de Jira en `.env` → ver [Q-27], [Q-28].
- **Los propios arquitectos**, si la métrica de eficiencia se percibe como vigilancia → ver [Q-17].
  Este riesgo **sube** con la respuesta a [Q-14]: un ranking de "quién resuelve más y más rápido"
  es exactamente el tipo de métrica que el equipo puede rechazar si no se acuerda su uso.

---

## 3. ESTADO ACTUAL

**¿Cómo se resuelve hoy?**
✅ (parcial) Existe una PoC en este repositorio: Node + Express + Chart.js que consulta la API REST
de Jira Data Center. `[Q-24]` ¿qué se hace además de la PoC — exportar a Excel, revisar Jira issue
por issue, nada?

**¿Qué herramientas se usan actualmente?**
✅ Jira Data Center (API v2, autenticación Bearer/PAT). La PoC: Node.js ≥18, Express 5, Chart.js
vía CDN, `.env` para configuración. `[Q-24]` ¿Excel / Confluence / algo más en el proceso actual?

**¿Qué funciona bien del proceso actual? (no tocar)**
✅ **La capa de conexión a Jira de la PoC.** Verificada en la inspección y declarada estable por el
sponsor. Incluye autenticación Bearer, reintento acotado ante `429` con lectura de `Retry-After` y
`X-RateLimit-*`, paginación de `/rest/api/2/search` con throttling, descubrimiento y cacheo del
campo `Epic Link`, y resolución por lotes de las historias padre.
✅ **La estructura de trabajo en Jira** (Épica → Historia → Sub-task + labels de sprint). Es la
convención del equipo; la solución se adapta a ella, no al revés.

**¿Qué no funciona? (oportunidad de mejora)**
✅ Verificado en código — detalle completo en `00_hallazgos_codigo.md` §4 y §5:
- **D-01:** `server.js` está truncado en la línea 206. `/api/meta`, `/api/dashboard` y `app.listen()`
  no existen: el servidor no arranca.
- **D-02:** `public/app.js:410` tiene un ``` `` ``` residual → `SyntaxError`, el frontend no renderiza.
- **D-04:** techo silencioso de 250 issues (`maxPages: 5 × pageSize: 50`) sin aviso de truncamiento.
- **O2 y O4 (eficiencia, puntual y en el tiempo) no existen** en ninguna forma.
- **O5 (propias vs apoyo) no existe**: la épica nunca se consulta con su *assignee*.
- **O3 (zoom)** está resuelto solo con dos combos; no hay drill-down ni tabla de detalle.
- Los gráficos 3, 4 y 5 recortan a **Top 12** sin indicar cuántos elementos quedaron fuera.

---

## 4. ESTADO FUTURO DESEADO

**¿Cómo se vería el proceso si la solución funciona perfectamente?**
✅ Derivado de los objetivos del sponsor:
1. **Vista de equipo (por defecto):** burndown del sprint seleccionado + KPIs del equipo +
   comprometido vs completado por arquitecto, todo en una pantalla.
2. **Zoom a la persona:** desde la vista de equipo se entra al detalle de un arquitecto — su
   burndown, sus sub-tasks, sus iniciativas, su mezcla propias/apoyo.
3. **Eficiencia en el tiempo:** serie por arquitecto a lo largo de los sprints `S1..Sn`, para ver
   tendencia y no solo la foto del sprint actual.
4. **Marca propias vs apoyo** visible en las vistas de equipo y de persona.

### Definición de eficiencia ✅ (respondida 2026-09-28, `Q-14`)

La eficiencia del arquitecto se compone de **cuatro** medidas, todas sobre **conteo de sub-tasks**
como unidad (`Q-01`):

| Medida | Cálculo | Qué responde |
|---|---|---|
| **Cumplimiento del compromiso** | sub-tasks completadas ÷ sub-tasks comprometidas en el sprint | ¿Cumple lo que promete? |
| **Throughput** | sub-tasks completadas por sprint | ¿Cuánto resuelve? |
| **Cycle time** | días promedio desde inicio hasta completado | ¿Qué tan rápido resuelve? |
| **Carry-over rate** | % de sub-tasks que se arrastran al sprint siguiente (multi-label `S1`+`S2`) | ¿Qué tan confiable es el compromiso? |

Intención explícita del sponsor: **"medir quién resuelve más y más rápido"** → el par
*throughput × cycle time* es el eje principal; cumplimiento y carry-over dan el contexto que evita
leer la velocidad sola.

Decisiones asociadas, ya cerradas:
- ✅ `Q-35` — **Los cuatro indicadores se muestran por separado.** No hay índice compuesto ni un
  único número que ordene a las personas. Esto **baja** el riesgo de ranking de §8.
- ✅ `Q-16` — **Sin umbrales absolutos.** Cada arquitecto se contrasta contra el promedio del equipo
  en ese sprint.
- ✅ `Q-15` — **No se normaliza por capacidad** en el MVP. Limitación conocida y aceptada.
- ✅ `Q-04` — El completado se determina con **`resolutiondate`**, no con el changelog. Una sub-task
  reabierta solo refleja su último cierre; la interfaz lo declara.
- ✅ `Q-38` / `Q-42` — El *cycle time* se mide en **días hábiles desde el inicio del sprint** de
  compromiso hasta `resolutiondate`.

`[Q-24]` ¿En qué ceremonia/momento se consume el dashboard (daily, sprint review, 1:1 mensual)?
Esto determina la frescura de datos requerida.

**¿Qué cambia para el usuario final en su día a día?**
`[Q-20]`, `[Q-22]` — a completar tras la conversación con los usuarios. El "antes → después" debe
expresarse en tiempo ahorrado o en decisiones que hoy no se pueden tomar.

---

## 5. CRITERIOS DE ÉXITO

> La plantilla pide 2-3 métricas que el sponsor entienda y valore. **Ninguna línea de valor actual
> puede completarse sin [Q-22] y [Q-14].** Se dejan las filas candidatas, no los números.

| Métrica | Valor actual | Target |
|---------|-------------|--------|
| Tiempo de preparación del reporte de sprint | `[Q-22]` | `[Q-22]` |
| % de sub-tasks comprometidas completadas dentro del sprint (completion rate) | `[Q-16]` | `[Q-16]` |
| Adopción: % de arquitectos que consultan el dashboard al menos 1 vez/sprint | `[Q-20]` | `[Q-20]` |

`[Q-16]` ¿Existen umbrales ya acordados (ej. ≥80 % = saludable) o hay que establecerlos con la
línea base de los primeros sprints?

---

## 6. RESTRICCIONES

**Restricciones técnicas:** ✅ (verificado en código) + `[Q-26]`
- Jira **Data Center / Server**, API REST v2, autenticación `Bearer` con PAT. No es Jira Cloud.
- Certificado TLS corporativo self-signed → hoy se resuelve desactivando la verificación.
- Rate limiting activo en el Jira corporativo: la PoC ya maneja `429` + `Retry-After` y aplica
  throttling propio (1200 ms entre páginas, 900 ms entre lotes de padres).
- Stack actual: Node.js ≥18, ESM, Express 5, Chart.js. Sin base de datos, sin pruebas.
- `[Q-26]` ¿Dónde se despliega? ¿Local de cada usuario, servidor interno, contenedor?
- `[Q-29]` ¿Se permite persistir datos (snapshots por sprint)? Jira no conserva el estado pasado sin
  leer el *changelog*; sin persistencia o sin changelog, el burndown histórico no es reconstruible.

**Restricciones de datos:**
- ✅ Acceso a Jira confirmado y funcionando.
- `[Q-06]` ¿Un solo proyecto (`JIRA_PROJECT=IA`) o varios?
- `[Q-08]` Lista de arquitectos a seguir: el sponsor indica que se puede obtener. ¿Dónde vive y en
  qué formato? ¿`.env`, archivo JSON, grupo de Jira?
- `[Q-09]` Identificador de persona a usar: ¿`assignee.name`, `accountId` o `displayName`?
- `[Q-13]` Volumen de sub-tasks por sprint (define si el techo de 250 de D-04 es un problema real).
- `[Q-17]` Métricas individuales de desempeño: ¿hay alguna política de RR.HH. o acuerdo con el
  equipo sobre cómo se pueden mostrar y quién las ve?

**Restricciones organizacionales:**
`[Q-31]` timeline y fecha de presentación · `[Q-19]` aprobaciones · presupuesto `[Q-31]`

**Restricciones de compliance/seguridad:**
- `[Q-27]` ¿Se puede instalar el CA corporativo en lugar de usar `rejectUnauthorized: false`?
- `[Q-28]` ¿El token es un PAT personal o una cuenta de servicio? Un PAT personal hace que el
  dashboard vea solo lo que ve esa persona y ata la herramienta a un individuo.

---

## 7. ENFOQUE TÉCNICO PROPUESTO

**¿Qué capacidad de AI aplica a este problema?**
`[Q-30]` — **Pregunta abierta y deliberadamente sin responder.** El problema tal como está descrito
es de **agregación y visualización determinista**, no de AI. Rellenar esta sección con un caso de
uso de AI inventado sería exactamente lo que este proceso busca evitar.

Opciones honestas a validar con el sponsor:
- (a) El programa exige un componente de AI → candidatos legítimos: resumen narrativo del sprint en
  lenguaje natural sobre las métricas ya calculadas; detección de anomalías en la tendencia de
  eficiencia; clasificación automática de la agrupación temática de la historia (discovery / EXM /
  TDD / OR) cuando el título no la declara.
- (b) El entregable del programa es la solución construida **con** AI (Claude Code, skills, Gherkin)
  y no necesariamente una solución **de** AI. En ese caso esta sección describe el método de
  construcción, no el producto.

**¿Por qué AI es la solución correcta y no una automatización tradicional?**
`[Q-30]` — depende de la respuesta anterior. **Si la respuesta es (b), la respuesta honesta a esta
pregunta es "no lo es, y no debe serlo"**: el cálculo de un burndown debe ser determinista y
auditable. Se documentará así.

**Arquitectura de alto nivel**
✅ Basada en lo que ya existe, con la capa de conexión intacta:

```
Jira DC (REST v2)
   │  Bearer PAT · 429-aware · paginado
   ▼
[ Capa de cliente Jira ]   ← YA EXISTE, NO SE TOCA
   │   authHeader · jiraGetJson · jiraSearchPaginated
   │   loadFieldMetadataOnce (Epic Link) · fetchParents
   ▼
[ Capa de dominio ]        ← POR CONSTRUIR
   │   normalización Épica→Historia→Sub-task
   │   resolución de sprint por label S1..Sn
   │   clasificación propia vs apoyo   [Q-18]
   │   cálculo de burndown             [Q-02][Q-03][Q-04]
   │   cálculo de eficiencia           [Q-14]
   ▼
[ API HTTP ]               ← POR CONSTRUIR (/api/meta, /api/dashboard, + endpoints de O4)
   ▼
[ Frontend ]               ← EXISTE, REQUIERE EXTENSIÓN (O3 drill-down, O4 serie temporal)
```

`[Q-29]` Si se requiere histórico reconstruible, se añade una capa de persistencia de snapshots
entre dominio y API.

---

## 8. RIESGOS Y DEPENDENCIAS

**Riesgo 1 — La métrica de eficiencia se usa como instrumento de vigilancia y el equipo la rechaza.**
Es el modo de fallo más común de este tipo de dashboards en contextos corporativos: la métrica se
vuelve el objetivo, y los arquitectos fragmentan sub-tasks o inflan el compromiso para "verse bien".
**Mitigación:** `[Q-17]` definir con el sponsor y con el equipo quién ve qué; acompañar siempre la
eficiencia con el contexto (mezcla propias/apoyo, carga, re-compromisos) para que no se lea sola;
preferir tendencia sobre valor puntual.

**Riesgo 2 — Los datos de Jira no soportan la métrica que se quiere medir.** 🟢 *Mitigado*
El sprint vive en un *label* de texto libre, no en el campo Sprint, y no trae fechas.
**Mitigación aplicada:** las fechas se declaran en `config/sprints.yaml` ✅ `Q-02` con eje de días
hábiles ✅ `Q-03`; el completado se determina con `resolutiondate` ✅ `Q-04`, y la interfaz **declara
la aproximación** (una sub-task reabierta solo refleja su último cierre) — escenario explícito en
F-08 del Gherkin.
**Riesgo residual:** una sub-task resuelta fuera del rango de todo sprint no se acredita a ninguno;
se mitigó con la bolsa visible "fuera de sprint" ✅ `Q-43` en lugar de dejarla desaparecer.

**Riesgo 4 — `config/sprints.yaml` y `config/team.yaml` son mantenimiento manual.**
Si nadie actualiza el YAML, el sprint nuevo aparece sin burndown y un arquitecto nuevo no se ve.
**Mitigación:** un label de sprint no registrado **no se ignora en silencio ni tumba el arranque**:
se muestra con aviso visible ✅ `Q-39`. El hueco queda evidente en la propia interfaz.

**Riesgo 3 — Techo silencioso de 250 issues (D-04).**
Si el volumen real supera ese número, el dashboard muestra métricas incorrectas sin ninguna señal.
**Mitigación:** `[Q-13]` medir el volumen real; en cualquier caso hacer visible el truncamiento.

**Dependencias externas:**
- Disponibilidad y rate limit del Jira corporativo.
- `[Q-28]` vigencia y alcance del token.
- `[Q-08]` lista oficial de arquitectos a seguir.
- `[Q-21]` aprobación de seguridad/IT para el despliegue.

---

## 9. LÍMITES DE ALCANCE

> El alcance definitivo depende de `[Q-31]` (tiempo disponible) y `[Q-14]` (definición de
> eficiencia). Lo siguiente es una **propuesta priorizada por los objetivos del sponsor**, no un
> compromiso cerrado.

**En alcance (propuesto):**
- Reparar D-01 y D-02, y completar `/api/meta` + `/api/dashboard` sobre la capa de cliente existente.
- **O1** — burndown de equipo y compromiso por arquitecto del sprint seleccionado.
- **O3** — vista general de equipo con drill-down a la persona.
- **O5** — marca de iniciativa propia vs apoyo, por comparación de `assignee(épica)` vs
  `assignee(sub-task)` ✅ `Q-18`. Requiere extender `fetchParents()` para traer el assignee de la épica.
- **`config/sprints.yaml`** con las fechas de cada `S1..Sn` ✅ `Q-02`, `Q-36`, `Q-39`, y
  **`config/team.yaml`** con los arquitectos a seguir ✅ `Q-08`, `Q-09`.
- **Categoría "fuera de sprint"** y marca de **trabajo no planificado** ✅ `Q-11`, `Q-43`.
- **Avisos de integridad del dato** (truncamiento, recortes de gráfico, errores de Jira) → F-08.
- **O2** — las cuatro métricas de eficiencia del sprint ✅ `Q-14` (cumplimiento, throughput,
  cycle time, carry-over), sobre conteo de sub-tasks ✅ `Q-01`.
- **O4** — eficiencia por arquitecto a lo largo de `S1..Sn`.
- Hacer visible el truncamiento de datos (D-04).

**Fuera de alcance (propuesto):**
- Escribir en Jira. La herramienta es **solo de lectura**.
- Autenticación de usuarios / control de acceso por rol en el dashboard.
- Alertas, correos, integración con Slack o Teams.
- Predicción o forecast del cierre del sprint.
- Soporte para equipos distintos al de arquitectura de datos.
- Resolver D-03 (`rejectUnauthorized: false`) instalando el CA corporativo — depende de IT `[Q-27]`.

---

## Checklist de entrega

- [ ] Problema identificado y **cuantificado con datos reales** → bloqueado por `[Q-22]`
- [ ] Sponsor y stakeholders identificados → bloqueado por `[Q-19]`, `[Q-20]`, `[Q-21]`
- [x] Estado actual documentado (proceso, herramientas, pain points) → `00_hallazgos_codigo.md`
- [x] Estado futuro deseado definido → ✅ `Q-14`, `Q-35`; especificado en `03_requisitos_gherkin.md`
- [ ] Deep research de contexto completado
- [ ] Deep research de riesgos completado
- [ ] Internal Solution Brief completado (este documento) → falta el bloque B
- [ ] Listo para presentar
- [x] **Extra —** Requerimientos en Gherkin listos para desarrollar → `03_requisitos_gherkin.md`

---

## Siguiente paso

El **bloque A está cerrado** (22 preguntas) y los requerimientos están escritos en
`idea/03_requisitos_gherkin.md`. El desarrollo puede empezar.

Para cerrar **este documento** falta únicamente el **bloque B** de
`idea/02_preguntas_abiertas.md` — sponsor, usuarios, cuantificación del dolor, nombre de la
solución, timeline y política de métricas individuales. Son datos de contexto organizacional: se
pueden conseguir en paralelo al desarrollo, no lo bloquean.
