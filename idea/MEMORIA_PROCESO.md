# MEMORIA DEL PROCESO — Dashboard de Sprint / Arquitectura de Datos

> **Para qué sirve este archivo:** es el punto de reentrada. Si la sesión se corta, se pierde el
> contexto, o pasa una semana, **se lee este archivo primero** y se continúa desde "Próximo paso".
> Mantenerlo actualizado al final de cada sesión de trabajo.

---

## 0. Estado en una línea

`2026-09-28` — **Bloque A cerrado (22 preguntas) y Gherkin escrito.** `idea/03_requisitos_gherkin.md`
contiene 20 reglas de negocio confirmadas, un juego de datos de referencia y 9 features con ~60
escenarios. Listo para desarrollar. Pendiente menor: confirmar `Q-45`.

### Respuestas confirmadas del sponsor (2026-09-28)

| ID | Decisión |
|---|---|
| **Q-01** | Unidad de medida = **conteo de sub-tasks**. Sin story points, sin horas |
| **Q-02 / Q-36** | Fechas de sprint en **`config/sprints.yaml`** (campos `id`, `nombre`, `inicio`, `fin`). No se usan los sprints nativos de Jira. **Implica añadir dependencia de parseo YAML** |
| **Q-03** | Eje temporal = **días hábiles (L-V), sin feriados** en el MVP |
| **Q-04** | Fecha de completado = **`resolutiondate`**. No se usa el changelog. Limitación aceptada: una sub-task reabierta solo refleja su último cierre |
| **Q-05** | Completada ⇔ `statusCategory === "Done"`. Se conserva `isDone()` tal cual |
| **Q-08** | Equipo en **`config/team.yaml`**, archivo separado de los sprints |
| **Q-09** | Identidad = **`assignee.key`**; la interfaz muestra siempre **`displayName`** |
| **Q-10** | `S1`+`S2` = **carry-over**: falló en S1, se re-compromete en S2. Penaliza el cumplimiento de S1 |
| **Q-11 / Q-12 / Q-41** | Sub-task sin label = **no planificada**. Fuera del denominador del cumplimiento; **sí** suma al throughput; **no** entra en cycle time |
| **Q-14 / Q-35** | Eficiencia = **cuatro indicadores separados**: cumplimiento, throughput, cycle time, carry-over. **No** se combinan en un índice |
| **Q-15** | **No** se normaliza por capacidad en el MVP |
| **Q-16** | **Sin umbrales absolutos**: cada arquitecto se compara contra el **promedio del equipo** del sprint |
| **Q-18 / Q-37 / Q-40** | Propia vs apoyo = `assignee(épica)` vs `assignee(sub-task)`. **Sin excepción para el líder**: si la épica sigue en el líder, sus sub-tasks son apoyo, y eso señala que falta reasignarla |
| **Q-38 / Q-42** | Cycle time = **días hábiles desde el inicio del sprint** de compromiso hasta `resolutiondate` |
| **Q-39** | Label de sprint no configurado → **se muestra con aviso**, sin burndown ni cycle time. Ni silencio ni fallo de arranque |
| **Q-43** | Cumplimiento **por fecha**: se acredita al sprint cuyo rango contiene `resolutiondate`. Lo resuelto fuera de todo rango va a la bolsa visible **"fuera de sprint"** |
| **Q-44** | Burndown = curva real + **línea ideal** + **curva de promedio histórico** del equipo |
| **Q-34** | Esta fase es **documental**: primero el Gherkin, después reparar la PoC y desarrollar |

---

## 1. Objetivo del proyecto (fuente: sponsor, no inferido)

Visualización de las tareas de un equipo de arquitectos que atiende solicitudes de arquitectura de
datos. Objetivos declarados:

| ID | Objetivo |
|---|---|
| **O1** | Evaluar la ejecución del sprint mediante burndown y las tareas ejecutadas por cada integrante |
| **O2** | Medir la eficiencia de los arquitectos |
| **O3** | Ver el sprint de forma general para evaluar al equipo y, si hace falta, hacer zoom a la persona |
| **O4** | Ver la eficiencia del arquitecto a lo largo del tiempo |
| **O5** | Distinguir iniciativas propias del trabajo de apoyo pedido al equipo *(derivado del enunciado; no venía numerado)* |

---

## 2. Modelo de dominio (fuente: sponsor)

```
Épica         = Iniciativa                      → normalmente asignada a 1 arquitecto
  └─ Historia = Agrupación temática             → discovery, EXM (exemption), TDD, OR, otras
       └─ Sub-task = COMPROMISO REAL DEL SPRINT → unidad de medida del dashboard
            labels = S1, S2, … Sn               → sprint(s) al que pertenece
```

Reglas conocidas:
- El sprint se identifica **por label** (`S1..Sn`), **no** por el campo Sprint de Jira.
- Una sub-task puede llevar **varios** labels → fue comprometida/desarrollada en varios sprints.
- **Propia:** el arquitecto tiene la épica asignada y por herencia sus hijos.
- **Apoyo:** el arquitecto solo tiene asignada la sub-task, la épica es de otro.
- Existe (o se puede obtener) un listado de IDs de asignación de los arquitectos a seguir.

---

## 3. Condiciones fijas dadas por el sponsor

1. El repositorio ya tiene una versión de la visualización que **no cumple al 100 %** los objetivos.
2. **La forma de conexión a Jira es estable — no se cambia.**
3. Ante cualquier incertidumbre: **preguntar, nunca inventar.** Esta es la regla rectora de todo
   el proceso documental.

---

## 4. Hallazgos verificados en el código (commit `ae36092`, 2026-09-28)

Detalle completo en `idea/00_hallazgos_codigo.md`. Resumen para reentrada rápida:

**Estable y reutilizable — capa de cliente Jira (`server.js`), NO TOCAR:**
`authHeader` (Bearer PAT → Jira **Data Center**, no Cloud) · `parseRetryAfterMs` · `jiraGetJson`
(retry 429 acotado) · `loadFieldMetadataOnce` (descubre el customfield `Epic Link`) ·
`jiraSearchPaginated` (paginado + throttle) · `fetchParents` (lotes de 40) · `isDone`
(`statusCategory === "Done"`) · `sprintLabelsFrom` (`/^s\d+$/i`).

**Defectos bloqueantes:**

| ID | Dónde | Qué |
|---|---|---|
| D-01 | `server.js:206` | Archivo **truncado** a mitad de `buildMetaFromIssues`. No existen `/api/meta`, `/api/dashboard` ni `app.listen()`. El servidor no arranca |
| D-02 | `public/app.js:410` | ``` `` ``` residual → `SyntaxError`, el frontend no renderiza |
| D-03 | `server.js:20` | `rejectUnauthorized: false` — validación TLS desactivada |
| D-04 | `server.js:139` | Techo silencioso de 250 issues (`maxPages 5 × pageSize 50`) |

**Cobertura de objetivos:** O1 🟡 parcial · O2 🔴 ausente · O3 🟡 parcial · O4 🔴 ausente · O5 🔴 ausente.

> **Corrección importante a la premisa #2 del sponsor:** la *conexión* a Jira sí es estable, pero la
> capa de agregación y los endpoints HTTP **no existen**. El trabajo pendiente es mayor de lo que
> sugiere "ya hay una versión".

---

## 5. Documentos generados

| Archivo | Contenido | Estado |
|---|---|---|
| `idea/internal_solution_brief.md` | Plantilla original del programa (no modificar) | Referencia |
| `idea/00_hallazgos_codigo.md` | Inventario de código, contrato JSON actual, defectos, brecha vs objetivos | ✅ Completo |
| `idea/01_internal_solution_brief.md` | Brief lleno con lo verificado; huecos marcados `[Q-nn]` | 🟡 Borrador v0.1 |
| `idea/02_preguntas_abiertas.md` | 45 preguntas en bloques A/B/C con estado y trazabilidad | ✅ Bloque A cerrado (22/22) |
| `idea/MEMORIA_PROCESO.md` | Este archivo | ✅ Vivo |
| `idea/03_requisitos_gherkin.md` | 20 reglas de negocio, juego de datos de referencia, 9 features (F-00…F-08), ~60 escenarios, matriz de trazabilidad | ✅ v1.0 |

---

## 6. Flujo del proceso y dónde estamos

```
[1] Inspeccionar código               ✅ hecho
[2] Registrar hallazgos               ✅ 00_hallazgos_codigo.md
[3] Redactar brief con huecos         ✅ 01_internal_solution_brief.md (v0.1)
[4] Registrar preguntas abiertas      ✅ 02_preguntas_abiertas.md
[5] Responder bloque A                ✅ 22/22 cerradas en 4 rondas
[6] Escribir 03_requisitos_gherkin.md ✅ v1.0
[7] DESARROLLAR                       ⬅️  AQUÍ ESTAMOS
[8] Cerrar brief (bloque B)           ⬜  en paralelo, no bloquea el desarrollo
```

### Orden de implementación (respeta las dependencias)

```
F-00 configuración  →  F-01 clasificación (núcleo)  →  F-03  →  F-02
                                                        ↓
     F-07 propia/apoyo  →  F-04 eficiencia  →  F-05 zoom  →  F-06 tiempo  →  F-08 integridad
```

En el camino: reparar **D-01** (`server.js` truncado), **D-02** (`public/app.js:410`) y extender
`fetchParents()` con el assignee de la épica, que R-12 necesita.

---

## 7. Preguntas pendientes *(ninguna bloquea el desarrollo)*

| ID | Pregunta | Efecto |
|---|---|---|
| **Q-45** | ¿La curva de promedio histórico del burndown se normaliza a porcentaje del total comprometido de cada sprint (definición propuesta en F-02), o es valor absoluto / últimos N sprints? | Afecta a una curva de referencia, a ninguna métrica |
| **Bloque B** (10) | Sponsor, usuarios, cuantificación del dolor, nombre, timeline, política de métricas individuales, componente de AI | Necesarias para **presentar** el brief, no para construir |
| **Bloque C** (6) | Proyectos de Jira, variantes del label, volumen real, despliegue, certificado corporativo, token, persistencia | Necesarias antes de **ejecutar contra el Jira real** |

---

## 8. Decisiones tomadas (con su razón)

| Fecha | Decisión | Razón |
|---|---|---|
| 2026-09-28 | No rellenar §7 del brief (enfoque de AI) con un caso de uso inventado | El problema es de agregación determinista. Inventar un caso de AI sería exactamente la alucinación que el proceso busca evitar → `[Q-30]` |
| 2026-09-28 | Numerar "propias vs apoyo" como **O5** | El sponsor lo describió como "objetivo adicional" sin numerar; se numera para poder trazarlo en el Gherkin |
| 2026-09-28 | No modificar el código en esta fase | El encargo fue documental. La reparación de D-01/D-02 se consulta en `[Q-34]` |
| 2026-09-28 | Conservar el contrato JSON actual de `/api/dashboard` como punto de partida | El frontend ya lo consume; pero **no alcanza para O2 ni O4** y deberá extenderse |
| 2026-09-28 | Las fechas de sprint viven en un archivo de configuración del repo, no en Jira | Decisión del sponsor (Q-02). Implica que el archivo es una **dependencia de mantenimiento manual**: si no se actualiza, el burndown del sprint nuevo no existe → cubrir en `Q-36` |
| 2026-09-28 | La eficiencia son 4 métricas, no una | Decisión del sponsor (Q-14). Implica extender el contrato de `/api/dashboard` y añadir un endpoint de serie multi-sprint para O4 |
| 2026-09-28 | `fetchParents()` debe extenderse para traer el assignee de la **épica** | Consecuencia de Q-18. Hoy solo resuelve la historia padre (`summary` + `epicKey`); la épica nunca se consulta. Es un cambio **aditivo** sobre la capa estable, no una reescritura |
| 2026-09-28 | Sin excepción para el líder en la regla propia/apoyo (Q-40) | Decisión del sponsor: el dashboard refleja Jira tal cual. Una épica sin reasignar aparece como apoyo, y eso **es** la señal de que falta higienizar Jira. Evita una regla especial que habría que mantener |
| 2026-09-28 | Añadir **F-08 (integridad del dato)**, que no corresponde a ningún objetivo del sponsor | D-04 mostró que el truncamiento hoy es silencioso. Una métrica de desempeño que miente es peor que no tenerla |
| 2026-09-28 | Juego de datos de referencia único para todos los escenarios | 9 sub-tasks construidas para ejercitar cada regla y cada borde. Sirve directamente como fixture de pruebas |

---

## 9. Supuestos vigentes (cosas asumidas que NO están confirmadas)

> Lista corta a propósito. Cualquier cosa que se asuma va aquí para poder refutarla después.

| # | Supuesto | Cómo se refuta |
|---|---|---|
| S-01 | El Jira es **Data Center / Server**, no Cloud | Deducido de `Bearer` + `/rest/api/2` + la existencia del campo `Epic Link`. Confirmar con el sponsor |
| S-02 | Las sub-tasks de interés viven todas bajo el proyecto de `JIRA_PROJECT` | → `[Q-06]` |
| S-03 | El truncamiento de `server.js` es accidental (copy/paste), no una versión parcial deliberada | El commit `ae36092` lo subió ya truncado; preguntar si existe una versión completa en otra parte |

---

## 10. Próximo paso

**Desarrollar contra `idea/03_requisitos_gherkin.md`.**

Al retomar:
1. Leer este archivo y luego `idea/03_requisitos_gherkin.md` (las 20 reglas y el juego de datos).
2. Empezar por **F-00** y **F-01**: son la base de la que dependen todas las demás features.
3. Convertir cada escenario en una prueba antes de implementarlo
   (skill `test-driven-development` en `.agents/skills/`).
4. No inventar ninguna regla que no esté en la tabla de §Reglas del Gherkin. Si aparece una
   decisión nueva → nueva fila `Q-nn` en `02_preguntas_abiertas.md` y **preguntar**.
5. Al cerrar cada feature, actualizar §0 y §11 de este archivo.

**Cosas que no se tocan:** `authHeader`, `parseRetryAfterMs`, `jiraGetJson`,
`loadFieldMetadataOnce`, `jiraSearchPaginated`, `isDone`, `sprintLabelsFrom`.
`fetchParents` se **extiende** (assignee de la épica), no se reescribe.

---

## 11. Bitácora de sesiones

| Fecha | Qué se hizo | Quién |
|---|---|---|
| 2026-09-28 | Inspección de `server.js`, `public/app.js`, `public/index.html`, `package.json`, README y git log. Creación de `00_hallazgos_codigo.md`, `01_internal_solution_brief.md`, `02_preguntas_abiertas.md` y este archivo. Detectados D-01…D-04 | fabian + Claude Code |
| 2026-09-28 | Primera ronda de preguntas al sponsor. Cerradas Q-01, Q-02, Q-14, Q-18. Abiertas Q-35, Q-36, Q-37 como consecuencia. `Q-04` reclasificada a prioridad 1 | fabian + Claude Code |
| 2026-09-28 | Rondas 2, 3 y 4. Cerradas Q-03, Q-04, Q-05, Q-08, Q-09, Q-10, Q-11, Q-12, Q-15, Q-16, Q-35…Q-44. **Bloque A cerrado: 22/22** | fabian + Claude Code |
| 2026-09-28 | Escrito `idea/03_requisitos_gherkin.md` v1.0: 20 reglas, juego de datos de 9 sub-tasks, 9 features, ~60 escenarios, matriz de trazabilidad objetivo→feature→pregunta. Abierta `Q-45` (no bloqueante) | fabian + Claude Code |
