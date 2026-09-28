# 02 — Registro de preguntas abiertas

> Regla del proyecto: **ninguna incertidumbre se rellena con una suposición.** Se registra aquí,
> se pregunta, y solo con la respuesta se escribe la especificación.
>
> Estado: `ABIERTA` · `RESPONDIDA` · `DIFERIDA` (no bloquea el MVP)
> Bloque **A** = bloquea escribir Gherkin. Bloque **B** = bloquea cerrar el brief. Bloque **C** = necesario antes de desplegar.
>
> Al responder: cambiar el estado, escribir la respuesta **con fecha**, y actualizar el documento
> que referencia la pregunta.

---

## BLOQUE A — Bloquean la escritura de requerimientos Gherkin

### A.1 · Medición y datos del sprint

| ID | Pregunta | Por qué bloquea | Estado | Respuesta |
|---|---|---|---|---|
| **Q-01** | ¿Cuál es la **unidad de medida** del compromiso? ¿Conteo de sub-tasks, story points, horas estimadas (`timeoriginalestimate`), u otra? | Es el eje Y de todo burndown y el denominador de toda eficiencia. Sin esto no hay ni un escenario escribible. | ✅ **RESPONDIDA** 2026-09-28 | **Conteo de sub-tasks.** Cada sub-task vale 1. No se usan story points ni horas. |
| **Q-02** | ¿De dónde salen las **fechas de inicio y fin** de cada sprint `S1..Sn`? ¿Existen sprints reales de Jira en paralelo al label, o hay que mantener una tabla de fechas aparte? | Un burndown necesita un eje X. Hoy el label `S1` no lleva fechas. | ✅ **RESPONDIDA** 2026-09-28 | **Archivo de configuración propio** (JSON o YAML) con el listado de sprints y sus fechas, mantenido en el repositorio. No se usan los sprints nativos de Jira. → detalle pendiente en `Q-36` |
| **Q-03** | El eje X del burndown, ¿son **días calendario o días hábiles**? ¿Cuánto dura un sprint? | Define la línea ideal y el número de puntos de la serie. | ✅ **RESPONDIDA** 2026-09-28 | **Días hábiles (lunes a viernes), sin gestión de feriados en el MVP.** Los feriados quedan fuera de alcance y se añaden después si distorsionan. La duración sale de `inicio`/`fin` en `config/sprints.yaml` |
| **Q-04** | ¿Cómo se determina **cuándo** una sub-task pasó a completada? ¿Se puede consultar el *changelog* (`?expand=changelog`), o hay que aproximar con `resolutiondate` / `updated`? | Sin fecha de transición no hay burndown real, solo una foto final. **Además, el *cycle time* elegido en Q-14 es imposible sin esto.** La PoC hoy no lee changelog. | ✅ **RESPONDIDA** 2026-09-28 | **`resolutiondate`.** No se consulta el changelog. **Limitación aceptada y que debe declararse en la visualización:** si una sub-task se reabrió y se volvió a cerrar, solo se ve el último cierre; el tiempo de la primera pasada se pierde. El *cycle time* se calcula por tanto como `resolutiondate − created` salvo que se defina otro inicio → `Q-38` |
| **Q-05** | ¿`statusCategory = "Done"` es la definición correcta de completado? ¿Existen estados tipo *Cancelado*, *Descartado* o *Bloqueado* que **no** deban contar como completados? | `isDone()` (`server.js:56`) usa esa regla hoy; un "Cancelado" en categoría Done inflaría el cumplimiento. | ✅ **RESPONDIDA** 2026-09-28 | **`statusCategory === "Done"` es correcto.** Se conserva `isDone()` (`server.js:56`) tal cual. No hay estados a excluir |
| **Q-10** | Una sub-task con labels `S1` **y** `S2`: ¿en S2 cuenta como nuevo compromiso? ¿Cuenta como *carry-over*? ¿Penaliza la eficiencia de S1, de S2, o de ninguno? | El sponsor confirma que el re-compromiso ocurre. Es la regla de negocio más delicada del modelo. | ✅ **RESPONDIDA** 2026-09-28 | **Carry-over: falló en S1.** Cuenta como comprometida-y-no-cumplida en S1, y como comprometida otra vez en S2. Penaliza el cumplimiento de S1. **Regla general derivada:** una sub-task es *comprometida* en **cada** sprint cuyo label lleve; es *cumplida* solo en el sprint en cuyo rango de fechas cae su `resolutiondate` |
| **Q-11** | Sub-tasks **sin ningún label de sprint**: ¿se ignoran, o representan trabajo no planificado que debe verse? | Afecta el denominador y la lectura de carga real. | ✅ **RESPONDIDA** 2026-09-28 | **Se muestran como "no planificado".** Visibles como categoría aparte, **fuera del denominador** del cumplimiento del compromiso. Sí cuentan en el throughput si se completaron → confirmar en `Q-41` |
| **Q-12** | ¿Existe alguna marca para el **trabajo no planificado** que entra a mitad de sprint (un label, una convención, la fecha de creación)? | Necesario para no castigar la eficiencia por trabajo que llegó después del compromiso. | ✅ **RESPONDIDA (implícita)** 2026-09-28 | **La marca es la ausencia de label de sprint** (ver Q-11). No hay otra convención. **Consecuencia:** el no-planificado no se puede atribuir a un sprint concreto por label; se atribuye por la fecha en que cae su `resolutiondate` dentro de `config/sprints.yaml` |

### A.2 · Definición de eficiencia (O2 y O4)

| ID | Pregunta | Por qué bloquea | Estado | Respuesta |
|---|---|---|---|---|
| **Q-14** | **¿Cuál es la definición oficial de "eficiencia del arquitecto"?** Candidatos: (a) *completion rate*; (b) *throughput*; (c) *cycle time*; (d) *carry-over rate*; (e) índice compuesto. | Es **el** hueco central. O2 y O4 son inespecificables sin esto. | ✅ **RESPONDIDA** 2026-09-28 | **Las cuatro.** Cumplimiento del compromiso + carry-over rate + cycle time + throughput. Intención declarada por el sponsor: *"medir quién resuelve más y más rápido"* → **volumen × velocidad**, con cumplimiento y arrastre como contexto. Consecuencias: (1) el *cycle time* hace que `Q-04` pase a ser bloqueante dura; (2) falta definir cómo se combinan → `Q-35` |
| **Q-15** | ¿La eficiencia se **normaliza por capacidad** (vacaciones, dedicación parcial, incorporaciones)? | Sin normalizar, quien tuvo vacaciones aparece como ineficiente. | ✅ **RESPONDIDA** 2026-09-28 | **No se normaliza en el MVP.** Las 4 métricas se muestran crudas. **Limitación conocida y aceptada:** quien tuvo ausencias aparece con menos throughput; se interpreta con contexto humano, no con fórmula. Queda como mejora posterior |
| **Q-16** | ¿Existen **umbrales o targets** ya acordados, o se establecen con la línea base? | Define si el dashboard semaforiza o solo muestra el número. | ✅ **RESPONDIDA** 2026-09-28 | **Sin umbrales absolutos. Cada arquitecto se compara contra el promedio del equipo en ese sprint.** El dashboard muestra el valor individual y la referencia del promedio; no colorea bien/mal contra un target fijo |
| **Q-18** | **Regla exacta de "iniciativa propia" vs "apoyo".** ¿Es `assignee(épica) == assignee(sub-task)`? ¿Qué pasa si la épica no tiene assignee? ¿Y si el apoyo se pide a nivel de historia en lugar de sub-task? | O5 no es implementable sin la regla. Además obliga a traer el assignee de la épica, que hoy no se consulta. | ✅ **RESPONDIDA (parcial)** 2026-09-28 | **Comparar `assignee(épica)` vs `assignee(sub-task)`:** iguales → propia; distintos → apoyo. **Impacto técnico:** `fetchParents()` debe extenderse para traer el `assignee` de la **épica** (hoy solo trae `summary` + `epicKey` de la historia, y nunca consulta la épica en sí). **Sigue abierto:** el caso "épica sin assignee" → `Q-37` |

### A.3 · Preguntas nuevas, abiertas por las respuestas del 2026-09-28

| ID | Pregunta | Origen | Estado | Respuesta |
|---|---|---|---|---|
| **Q-35** | Se eligieron **cuatro** métricas de eficiencia. ¿Cómo se presentan: separadas, índice compuesto, o ranking principal + contexto? | Q-14 | ✅ **RESPONDIDA** 2026-09-28 | **Cuatro indicadores separados.** No se combinan en un índice. Consecuencia para O4: la evolución en el tiempo son **cuatro series**, no una. Consecuencia positiva: **baja el riesgo de ranking** señalado en §8 del brief, porque no hay un único número que ordene a las personas |
| **Q-36** | El archivo de fechas de sprint: ¿**JSON o YAML**? ¿Ruta? ¿Campos? ¿Quién lo mantiene? ¿Qué pasa con un label no registrado? | Q-02 | ✅ **RESPONDIDA (parcial)** 2026-09-28 | **YAML en `config/sprints.yaml`.** **Implica añadir una dependencia de parseo YAML** (p. ej. `js-yaml`) — hoy el proyecto no tiene ninguna. **Sigue abierto:** esquema exacto de campos y comportamiento ante un label `S9` no registrado → `Q-39` |
| **Q-37** | Regla de **propia vs apoyo cuando la épica no tiene assignee** | Q-18 | ✅ **RESPONDIDA — pero abre un caso nuevo** 2026-09-28 | **El caso no existe: la épica siempre tiene assignee inicial, que es el líder del equipo** (puede haber uno o más líderes definidos). **Problema derivado:** con la regla de Q-18 (`assignee(épica) ≠ assignee(sub-task)` → apoyo), toda épica aún no reasignada desde el líder haría que *todas* sus sub-tasks se clasifiquen como apoyo, lo cual es falso → `Q-40` |
| **Q-38** | El *cycle time* se mide desde qué momento hasta `resolutiondate`: ¿desde `created`, desde el inicio del sprint, o desde "En progreso"? | Q-04 + Q-14 | ✅ **RESPONDIDA** 2026-09-28 | **Desde el inicio del sprint** en que se comprometió, según `config/sprints.yaml`, hasta `resolutiondate`. Mide tiempo dentro del sprint, no vida total del issue. **Caso a cubrir:** una sub-task con carry-over (`S1`+`S2`) resuelta en S2 mide desde el inicio de S2, no de S1 |
| **Q-40** | Dado que la épica nace asignada al **líder**: ¿caso especial, o se exige reasignar? | Q-37 | ✅ **RESPONDIDA** 2026-09-28 | **La épica debe reasignarse al arquitecto responsable.** El dashboard refleja lo que Jira diga, sin excepciones ni casos especiales para el líder. Si una épica sigue asignada al líder, sus sub-tasks aparecen como **apoyo** — y eso es una señal legítima de que falta higienizar Jira. **Regla de Q-18 queda sin excepciones** |
| **Q-41** | El trabajo **no planificado** (sin label de sprint) que sí se completó, ¿cuenta en el **throughput**? ¿Y en el **cycle time**? | Q-11 | ✅ **RESPONDIDA** 2026-09-28 | **Sí en throughput, no en cycle time.** Suma a "cuánto resuelve" porque es trabajo real; se excluye del cycle time porque no hay sprint de compromiso desde el cual medir el inicio (Q-38) |
| **Q-39** | Esquema de `config/sprints.yaml` y comportamiento ante un label no registrado | Q-36 | ✅ **RESPONDIDA** 2026-09-28 | **Un label `S9` sin entrada en el YAML se muestra con aviso visible:** aparece en el selector y en los conteos, pero **sin burndown ni cycle time**, con la leyenda "fechas no configuradas". Ni se ignora en silencio ni tumba el arranque. Sin feriados (Q-03) → el esquema es `id`, `nombre`, `inicio`, `fin` |

---

## BLOQUE B — Bloquean el cierre del Internal Solution Brief

| ID | Pregunta | Sección del brief | Estado | Respuesta |
|---|---|---|---|---|
| **Q-19** | ¿Quién es el **sponsor** (nombre y rol) — la persona con autoridad para aprobar recursos y adoptar la solución? | §2 | ABIERTA | |
| **Q-20** | ¿Quiénes son los **usuarios finales** exactos? ¿Solo el líder, todos los arquitectos, alguien fuera del equipo? | §2, §4, §5 | ABIERTA | |
| **Q-21** | ¿Quién puede **bloquear la adopción**? (IT, seguridad, compliance, jefatura) | §2 | ABIERTA | |
| **Q-22** | **Cuantificación del dolor actual:** ¿cuántas horas por sprint se invierten hoy en armar este reporte a mano? ¿Cuántas personas? ¿Qué decisión se toma tarde o sin dato por no tenerlo? | §1, §5 | ABIERTA | |
| **Q-23** | ¿**Hace cuánto** existe el problema? | §1 | ABIERTA | |
| **Q-24** | ¿En qué **momento/ceremonia** se consume el dashboard (daily, sprint review, 1:1 mensual)? ¿Y qué se hace hoy además de la PoC (Excel, revisar Jira a mano)? | §3, §4 | ABIERTA | |
| **Q-25** | ¿**Cuántos arquitectos** tiene el equipo y cuánto dura el sprint? | §1, dimensionamiento | ABIERTA | |
| **Q-17** | ¿Existe alguna política (RR.HH. o acuerdo de equipo) sobre **métricas individuales de desempeño**? ¿Quién puede ver la eficiencia de quién? | §6, Riesgo 1 | ABIERTA | |
| **Q-30** | ¿El programa exige un **componente de AI en el producto**, o basta con haberlo construido usando AI? | §7 completo | ABIERTA | |
| **Q-31** | ¿Cuál es el **timeline** y la fecha de presentación? ¿Hay presupuesto o es esfuerzo propio? | §6, §9 | ABIERTA | |
| **Q-32** | ¿**Nombre** definitivo de la solución? | Encabezado | ABIERTA | |
| **Q-33** | ¿**Empresa / organización**? | Encabezado | ABIERTA | |

---

## BLOQUE C — Técnicas / de despliegue (no bloquean escribir Gherkin, sí ejecutar)

| ID | Pregunta | Referencia | Estado | Respuesta |
|---|---|---|---|---|
| **Q-06** | ¿Un solo proyecto de Jira (`JIRA_PROJECT=IA`) o varios? | `server.js:17` | ABIERTA | |
| **Q-07** | El regex de sprint es `^s\d+$`. ¿Hay variantes reales como `S1-2026`, `Sprint1`, `s10`, o labels en mayúscula mezclada? | `server.js:62` | ABIERTA | |
| **Q-08** | ¿Dónde vive la **lista de arquitectos a seguir** y en qué formato? | O3, O4 | ✅ **RESPONDIDA** 2026-09-28 | **Archivo propio `config/team.yaml`**, separado de `config/sprints.yaml`. Cada archivo con una responsabilidad: el *quién* y el *cuándo* |
| **Q-09** | ¿Qué **identificador de persona** se usa como clave estable: `assignee.name`, `accountId` o `displayName`? (Jira DC usa `name`.) | Agrupación por usuario, `config/team.yaml` | ✅ **RESPONDIDA** 2026-09-28 | **`assignee.key` como clave** de agrupación y de `config/team.yaml`. **`displayName` es lo que se muestra en la interfaz** — nunca la key. Toda agregación va por key; toda etiqueta visible va por nombre |
| **Q-13** | ¿Cuántas sub-tasks hay por sprint aproximadamente? | D-04, techo de 250 | ABIERTA | |
| **Q-26** | ¿Dónde se **despliega**? ¿Local por usuario, servidor interno, contenedor? ¿Quién lo opera? | §6 | ABIERTA | |
| **Q-27** | ¿Se puede instalar el **CA corporativo** en lugar de mantener `rejectUnauthorized: false`? | D-03, `server.js:20` | ABIERTA | |
| **Q-28** | ¿El token es un **PAT personal o una cuenta de servicio**? ¿Cuál es su vigencia? | §6, `.env` | ABIERTA | |
| **Q-29** | ¿Se permite **persistir datos** (snapshots por sprint) para reconstruir histórico, o todo debe calcularse en vivo contra Jira? | Riesgo 2, O4 | ABIERTA | |
| **Q-34** | ¿Se debe **arreglar ahora** la PoC rota (D-01, D-02) o esta fase es solo documental? | Alcance de la sesión | ✅ **RESPONDIDA** 2026-09-28 | **No.** Primero se cierra el Gherkin; la reparación de D-01/D-02 y el desarrollo vienen después, guiados por la especificación |

---

## Resumen de bloqueo

> Actualizado 2026-09-28 tras tres rondas de respuestas.

| Bloque | Respondidas | Abiertas | Efecto si no se responden |
|---|---|---|---|
| **A** | **19 / 19** | **0** | ✅ **CERRADO.** Se puede escribir el Gherkin |
| B | 0 | 10 | El brief queda incompleto; el checklist de entrega no se puede marcar. **No bloquea el desarrollo** |
| C | 5 (Q-05, Q-08, Q-09, Q-34, Q-39) | 6 | Se puede especificar y desarrollar, pero no desplegar |

### A.4 · Ambigüedades destapadas al escribir el Gherkin (resueltas 2026-09-28)

| ID | Pregunta | Estado | Respuesta |
|---|---|---|---|
| **Q-42** | ¿El *cycle time* se cuenta en días hábiles o calendario? | ✅ RESPONDIDA | **Días hábiles**, consistente con el eje X del burndown (Q-03) |
| **Q-43** | Sub-task con label `S1` resuelta **después** de que S1 cerró, sin re-etiquetar a `S2` | ✅ RESPONDIDA | **Atribución por fecha, con bolsa de "resuelto fuera de sprint".** Solo cuenta como cumplida el sprint en cuyo rango cae `resolutiondate`. Lo resuelto fuera de todo rango **no desaparece**: se acumula en una categoría visible `fuera de sprint` |
| **Q-44** | ¿El burndown lleva línea de referencia? | ✅ RESPONDIDA | **Línea ideal recta + curva promedio histórico** del equipo en sprints anteriores. Dos referencias sobre la curva real |

### Bloque A — cerrado el 2026-09-28

Q-01 ✅ Q-02 ✅ Q-03 ✅ Q-04 ✅ Q-05 ✅ Q-10 ✅ Q-11 ✅ Q-12 ✅ Q-14 ✅ Q-15 ✅ Q-16 ✅ Q-18 ✅
Q-35 ✅ Q-36 ✅ Q-37 ✅ Q-38 ✅ Q-39 ✅ Q-40 ✅ Q-41 ✅ Q-42 ✅ Q-43 ✅ Q-44 ✅

**22 preguntas del bloque A respondidas.** Ninguna regla de negocio del Gherkin proviene de un
supuesto: todas tienen una fila en esta tabla con fecha y respuesta del sponsor.

### Lo que sigue abierto y por qué no bloquea

**Bloque B** (Q-17, Q-19 a Q-25, Q-30, Q-31, Q-32, Q-33): son datos de contexto organizacional —
sponsor, usuarios, cuantificación del dolor, nombre, timeline. Necesarios para **presentar** el
brief, no para **construir**. Se pueden responder en paralelo al desarrollo.

**Bloque C** (Q-06, Q-07, Q-13, Q-26, Q-27, Q-28, Q-29): son datos de entorno — proyectos, volumen
real, despliegue, certificado, token, persistencia. Necesarios antes de **ejecutar contra el Jira
real**, no antes de escribir la especificación ni el código.
