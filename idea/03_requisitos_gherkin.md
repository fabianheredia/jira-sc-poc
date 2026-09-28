# 03 — Requerimientos en Gherkin

> **Fecha:** 2026-09-28 · **Versión:** 1.0
> **Precondición cumplida:** el bloque A de `idea/02_preguntas_abiertas.md` está cerrado con 22
> respuestas del sponsor. **Ninguna regla de negocio de este documento es un supuesto**: cada una
> declara el `Q-nn` del que proviene.
> **Idioma Gherkin:** español (`# language: es`).

---

## Índice

- [Reglas de negocio confirmadas](#reglas-de-negocio-confirmadas)
- [Juego de datos de referencia](#juego-de-datos-de-referencia)
- [F-00 — Configuración del equipo y de los sprints](#f-00--configuración-del-equipo-y-de-los-sprints)
- [F-01 — Clasificación de sub-tasks](#f-01--clasificación-de-sub-tasks)
- [F-02 — Burndown del sprint (O1)](#f-02--burndown-del-sprint-o1)
- [F-03 — Compromiso y cumplimiento por arquitecto (O1)](#f-03--compromiso-y-cumplimiento-por-arquitecto-o1)
- [F-04 — Métricas de eficiencia del arquitecto (O2)](#f-04--métricas-de-eficiencia-del-arquitecto-o2)
- [F-05 — Vista general del equipo y zoom a la persona (O3)](#f-05--vista-general-del-equipo-y-zoom-a-la-persona-o3)
- [F-06 — Evolución de la eficiencia en el tiempo (O4)](#f-06--evolución-de-la-eficiencia-en-el-tiempo-o4)
- [F-07 — Iniciativas propias vs apoyo (O5)](#f-07--iniciativas-propias-vs-apoyo-o5)
- [F-08 — Integridad y honestidad del dato](#f-08--integridad-y-honestidad-del-dato)
- [Trazabilidad](#trazabilidad-objetivo--feature--pregunta)
- [Punto abierto](#punto-abierto)

---

## Reglas de negocio confirmadas

| ID | Regla | Origen |
|---|---|---|
| **R-01** | La unidad de medida es el **conteo de sub-tasks**. Cada sub-task vale 1. No se usan story points ni horas | Q-01 |
| **R-02** | El sprint se identifica por un **label** de la sub-task con forma `S<n>` (regex `/^s\d+$/i`, normalizado a minúscula). No se usa el campo Sprint de Jira | Q-02, código `server.js:60` |
| **R-03** | Una sub-task está **comprometida** en **cada** sprint cuyo label lleve. Dos labels = dos compromisos | Q-10 |
| **R-04** | Una sub-task está **completada** cuando `statusCategory === "Done"` | Q-05, código `server.js:56` |
| **R-05** | Una sub-task se **acredita como cumplida** al sprint en cuyo rango de fechas cae su `resolutiondate` | Q-43 |
| **R-06** | Una sub-task completada cuya `resolutiondate` no cae en **ningún** sprint configurado va a la bolsa **`fuera de sprint`**. No desaparece | Q-43 |
| **R-07** | **Carry-over:** una sub-task con labels `S1` y `S2` cuenta como no cumplida en S1 y comprometida de nuevo en S2. Penaliza el cumplimiento de S1 | Q-10 |
| **R-08** | Las fechas de los sprints viven en **`config/sprints.yaml`**, con campos `id`, `nombre`, `inicio`, `fin` | Q-02, Q-36, Q-39 |
| **R-09** | El eje temporal son **días hábiles (lunes a viernes)**. Sin gestión de feriados en el MVP | Q-03 |
| **R-10** | Una sub-task **sin ningún label de sprint** es **no planificada**: visible, pero **fuera del denominador** del cumplimiento | Q-11, Q-12 |
| **R-11** | El trabajo no planificado completado **sí suma al throughput**; **no entra en el cycle time** | Q-41 |
| **R-12** | **Propia** si `assignee(épica) == assignee(sub-task)`; **apoyo** si difieren. **Sin excepciones**, tampoco para el líder | Q-18, Q-37, Q-40 |
| **R-13** | La clave de identidad es **`assignee.key`**. En la interfaz siempre se muestra **`displayName`**, nunca la key | Q-09 |
| **R-14** | El equipo a seguir vive en **`config/team.yaml`**, separado de los sprints | Q-08 |
| **R-15** | La eficiencia son **cuatro indicadores separados**: cumplimiento, throughput, cycle time y carry-over. **No se combinan** en un índice | Q-14, Q-35 |
| **R-16** | El **cycle time** se mide en **días hábiles** desde el **inicio del sprint** en que se comprometió hasta su `resolutiondate` | Q-38, Q-42 |
| **R-17** | **No hay umbrales absolutos.** Cada arquitecto se contrasta contra el **promedio del equipo** en ese sprint | Q-16 |
| **R-18** | **No se normaliza por capacidad** (vacaciones, dedicación parcial) en el MVP | Q-15 |
| **R-19** | Un label de sprint **no registrado** en `config/sprints.yaml` se muestra **con aviso visible**, sin burndown ni cycle time. Ni se ignora en silencio ni impide el arranque | Q-39 |
| **R-20** | El burndown lleva **línea ideal recta** y **curva de promedio histórico** del equipo, sobre la curva real | Q-44 |

### Cómo se calcula cada métrica

```
cumplimiento(arq, sprint) = cumplidas(arq, sprint) ÷ comprometidas(arq, sprint)
                            (el no planificado NO entra en el denominador — R-10)

throughput(arq, sprint)   = cumplidas(arq, sprint) + no_planificadas_cumplidas(arq, sprint)   — R-11

cycle_time(arq, sprint)   = promedio, en días hábiles, de
                            (resolutiondate − inicio_del_sprint) sobre las cumplidas
                            (el no planificado NO entra — R-11)

carry_over(arq, sprint)   = comprometidas(arq, sprint) que además llevan el label del
                            sprint siguiente ÷ comprometidas(arq, sprint)                      — R-07
```

---

## Juego de datos de referencia

Todos los escenarios de este documento usan este juego. Está construido para ejercitar **cada**
regla, incluidos los bordes.

**`config/sprints.yaml`**

| id | nombre | inicio | fin | días hábiles |
|---|---|---|---|---|
| `s1` | Sprint 1 | 2026-08-03 (lun) | 2026-08-14 (vie) | 10 |
| `s2` | Sprint 2 | 2026-08-17 (lun) | 2026-08-28 (vie) | 10 |
| `s3` | Sprint 3 | 2026-08-31 (lun) | 2026-09-11 (vie) | 10 |

**`config/team.yaml`**

| key | displayName |
|---|---|
| `arq.ana` | Ana Rivas |
| `arq.beto` | Beto Luna |
| `arq.caro` | Caro Díaz |
| `lider.max` | Max Soto |

**Épicas (iniciativas)**

| clave | resumen | assignee |
|---|---|---|
| `EPIC-10` | Gobierno de datos | `arq.ana` |
| `EPIC-20` | Catálogo unificado | `arq.beto` |
| `EPIC-30` | Linaje de datos | `lider.max` *(nunca reasignada)* |

**Historias (agrupaciones temáticas)**

| clave | resumen | épica |
|---|---|---|
| `HU-11` | Discovery | `EPIC-10` |
| `HU-12` | TDD | `EPIC-10` |
| `HU-21` | Exemption EXM | `EPIC-20` |
| `HU-31` | Discovery | `EPIC-30` |

**Sub-tasks (el compromiso real)**

| clave | historia | assignee | labels | estado | resolutiondate | qué caso ejercita |
|---|---|---|---|---|---|---|
| `ST-101` | HU-11 | `arq.ana` | `S1` | Done | 2026-08-07 | caso normal, propia |
| `ST-102` | HU-11 | `arq.ana` | `S1`,`S2` | Done | 2026-08-20 | carry-over de S1 a S2 |
| `ST-103` | HU-12 | `arq.ana` | `S1` | En curso | — | comprometida sin cumplir |
| `ST-104` | HU-12 | `arq.beto` | `S1` | Done | 2026-08-12 | **apoyo** (épica de Ana) |
| `ST-105` | HU-11 | `arq.ana` | `S1` | Done | 2026-08-18 | resuelta **fuera** del rango de S1 |
| `ST-201` | HU-21 | `arq.beto` | `S2` | Done | 2026-08-21 | caso normal, propia |
| `ST-202` | HU-21 | `arq.beto` | *(ninguno)* | Done | 2026-08-25 | **no planificado** |
| `ST-301` | HU-31 | `arq.caro` | `S2` | Done | 2026-08-26 | **apoyo** (épica del líder) |
| `ST-901` | HU-11 | `arq.ana` | `S9` | Done | 2026-09-15 | sprint **no configurado** |

---

## F-00 — Configuración del equipo y de los sprints

```gherkin
# language: es

Característica: Configuración del equipo y de los sprints
  Como responsable del dashboard
  quiero declarar en archivos versionados quiénes son los arquitectos y cuándo ocurre cada sprint
  para que el dashboard tenga el eje temporal y la lista de personas que Jira no provee.

  Antecedentes:
    Dado que existe el archivo "config/sprints.yaml"
    Y que existe el archivo "config/team.yaml"

  Escenario: Cargar las fechas de los sprints al arrancar
    Dado que "config/sprints.yaml" contiene los sprints:
      | id | nombre   | inicio     | fin        |
      | s1 | Sprint 1 | 2026-08-03 | 2026-08-14 |
      | s2 | Sprint 2 | 2026-08-17 | 2026-08-28 |
      | s3 | Sprint 3 | 2026-08-31 | 2026-09-11 |
    Cuando el servidor arranca
    Entonces los sprints "s1", "s2" y "s3" quedan disponibles como filtro
    Y cada uno expone su rango de fechas y su cantidad de días hábiles

  Escenario: Calcular los días hábiles de un sprint
    Dado el sprint "s1" con inicio "2026-08-03" y fin "2026-08-14"
    Cuando se calcula su eje temporal
    Entonces el eje tiene 10 días hábiles
    Y no incluye sábados ni domingos
    Y no se descuentan feriados

  Escenario: Cargar el equipo con clave estable y nombre visible
    Dado que "config/team.yaml" contiene:
      | key       | displayName |
      | arq.ana   | Ana Rivas   |
      | arq.beto  | Beto Luna   |
      | arq.caro  | Caro Díaz   |
      | lider.max | Max Soto    |
    Cuando el servidor arranca
    Entonces toda agregación de métricas se hace por "key"
    Y toda etiqueta mostrada en la interfaz usa "displayName"
    Y en ningún punto de la interfaz se muestra la "key"

  Escenario: Un arquitecto de Jira que no está en config/team.yaml
    Dado que la sub-task "ST-777" está asignada a la clave "externo.zoe"
    Y que "externo.zoe" no figura en "config/team.yaml"
    Cuando se calculan las métricas del sprint
    Entonces "externo.zoe" no aparece en la vista de equipo
    Y sus sub-tasks no alteran el promedio del equipo

  Escenario: Un label de sprint que no está configurado
    Dado que la sub-task "ST-901" lleva el label "S9"
    Y que "s9" no existe en "config/sprints.yaml"
    Cuando el usuario abre el dashboard
    Entonces el servidor arranca con normalidad
    Y "s9" aparece en el selector de sprint con el aviso "fechas no configuradas"
    Y al seleccionar "s9" se muestran los conteos de sub-tasks
    Pero no se dibuja burndown
    Y no se calcula cycle time
    Y se muestra un mensaje indicando que faltan sus fechas en "config/sprints.yaml"
```

---

## F-01 — Clasificación de sub-tasks

> Esta feature es el **núcleo del dominio**. Todas las demás dependen de que esta clasificación sea
> correcta. Debe implementarse y probarse primero.

```gherkin
# language: es

Característica: Clasificación de sub-tasks por sprint, cumplimiento y planificación
  Como dashboard
  quiero clasificar cada sub-task de forma inequívoca
  para que todas las métricas partan del mismo criterio.

  Antecedentes:
    Dado el juego de datos de referencia
    Y que los sprints "s1", "s2" y "s3" están configurados con sus fechas

  Escenario: Una sub-task se compromete en cada sprint cuyo label lleve
    Dado que la sub-task "ST-102" lleva los labels "S1" y "S2"
    Cuando se calcula el compromiso
    Entonces "ST-102" cuenta como comprometida en "s1"
    Y cuenta como comprometida en "s2"

  Escenario: Cumplimiento acreditado al sprint que contiene la fecha de resolución
    Dado que la sub-task "ST-102" está en estado "Done"
    Y que su "resolutiondate" es "2026-08-20"
    Y que ese día cae dentro del rango de "s2"
    Cuando se calcula el cumplimiento
    Entonces "ST-102" cuenta como cumplida en "s2"
    Y cuenta como NO cumplida en "s1"

  Escenario: Carry-over penaliza al sprint de origen
    Dado que la sub-task "ST-102" lleva los labels "S1" y "S2"
    Cuando se calcula el carry-over de "s1"
    Entonces "ST-102" se marca como arrastrada desde "s1"
    Y suma al carry-over rate de "Ana Rivas" en "s1"

  Escenario: Sub-task resuelta fuera del rango de todo sprint
    Dado que la sub-task "ST-105" lleva únicamente el label "S1"
    Y que su "resolutiondate" es "2026-08-18"
    Y que "s1" terminó el "2026-08-14"
    Y que "ST-105" no lleva el label "S2"
    Cuando se calcula el cumplimiento
    Entonces "ST-105" cuenta como NO cumplida en "s1"
    Y no cuenta como cumplida en ningún sprint
    Y aparece en la categoría visible "fuera de sprint"
    Y la categoría "fuera de sprint" es consultable desde la interfaz

  Escenario: Sub-task sin label de sprint es trabajo no planificado
    Dado que la sub-task "ST-202" no lleva ningún label de sprint
    Y que está en estado "Done" con "resolutiondate" "2026-08-25"
    Y que ese día cae dentro del rango de "s2"
    Cuando se calculan las métricas de "s2"
    Entonces "ST-202" se clasifica como "no planificada"
    Y no entra en el denominador del cumplimiento de "Beto Luna"
    Y sí suma al throughput de "Beto Luna" en "s2"
    Y no entra en el cálculo de su cycle time

  Escenario: Solo statusCategory Done cuenta como completada
    Dado que la sub-task "ST-103" está en un estado cuya categoría no es "Done"
    Cuando se calcula el cumplimiento de "s1"
    Entonces "ST-103" cuenta como comprometida y no cumplida

  Esquema del escenario: Clasificación completa del juego de datos en s1
    Dado el juego de datos de referencia
    Cuando se clasifica la sub-task "<clave>" para el sprint "s1"
    Entonces su clasificación es "<clasificacion>"

    Ejemplos:
      | clave  | clasificacion                    |
      | ST-101 | comprometida y cumplida          |
      | ST-102 | comprometida, arrastrada a s2    |
      | ST-103 | comprometida y no cumplida       |
      | ST-104 | comprometida y cumplida          |
      | ST-105 | comprometida, fuera de sprint    |
      | ST-202 | no planificada                   |
```

---

## F-02 — Burndown del sprint (O1)

```gherkin
# language: es

Característica: Burndown del sprint
  Como líder del equipo de arquitectura
  quiero ver cómo baja el trabajo pendiente a lo largo del sprint
  para saber si el equipo va al ritmo necesario para cerrarlo.

  Antecedentes:
    Dado el juego de datos de referencia
    Y que el usuario seleccionó el sprint "s1"

  Escenario: El eje temporal son los días hábiles del sprint
    Cuando se dibuja el burndown de "s1"
    Entonces el eje X tiene 10 puntos
    Y el primero es "2026-08-03"
    Y el último es "2026-08-14"
    Y no aparece ningún sábado ni domingo

  Escenario: La curva real desciende con cada sub-task cumplida
    Dado que en "s1" hay 5 sub-tasks comprometidas
    Cuando se dibuja la curva real del burndown
    Entonces el pendiente al cierre de cada día es:
      | dia        | pendiente |
      | 2026-08-03 |         5 |
      | 2026-08-06 |         5 |
      | 2026-08-07 |         4 |
      | 2026-08-11 |         4 |
      | 2026-08-12 |         3 |
      | 2026-08-14 |         3 |
    Y el pendiente final es 3 porque "ST-102", "ST-103" y "ST-105" no se cumplieron en "s1"

  Escenario: Una sub-task resuelta fuera del sprint no baja la curva
    Dado que "ST-105" se resolvió el "2026-08-18"
    Y que "s1" terminó el "2026-08-14"
    Cuando se dibuja el burndown de "s1"
    Entonces la curva de "s1" no desciende por "ST-105"

  Escenario: Línea ideal de referencia
    Dado que "s1" tiene 5 sub-tasks comprometidas y 10 días hábiles
    Cuando se dibuja el burndown
    Entonces se superpone una línea ideal recta
    Y parte de 5 al inicio del sprint
    Y llega a 0 al cierre del último día hábil

  Escenario: Curva de promedio histórico del equipo
    Dado que existen sprints anteriores a "s1" con datos cargados
    Cuando se dibuja el burndown de "s1"
    Entonces se superpone una tercera curva con el promedio histórico del equipo
    Y esa curva está normalizada como porcentaje del total comprometido
    Y se indica sobre cuántos sprints anteriores se calculó

  Escenario: Primer sprint, sin historia previa
    Dado que "s1" es el primer sprint configurado
    Y que no hay sprints anteriores con datos
    Cuando se dibuja el burndown de "s1"
    Entonces se muestran la curva real y la línea ideal
    Y no se dibuja la curva de promedio histórico
    Y se indica que aún no hay historia suficiente

  Escenario: Burndown de un arquitecto concreto
    Dado que el usuario seleccionó al arquitecto "Ana Rivas"
    Cuando se dibuja el burndown
    Entonces la curva considera únicamente las sub-tasks comprometidas por "Ana Rivas" en "s1"
    Y el total de partida es 4
```

---

## F-03 — Compromiso y cumplimiento por arquitecto (O1)

```gherkin
# language: es

Característica: Compromiso y cumplimiento por arquitecto
  Como líder del equipo
  quiero ver qué comprometió y qué cumplió cada arquitecto en el sprint
  para evaluar la ejecución persona por persona.

  Antecedentes:
    Dado el juego de datos de referencia

  Escenario: Comprometidas contra cumplidas en s1
    Cuando se calculan las métricas de "s1"
    Entonces el resumen por arquitecto es:
      | arquitecto | comprometidas | cumplidas | cumplimiento |
      | Ana Rivas  |             4 |         1 |          25% |
      | Beto Luna  |             1 |         1 |         100% |
    Y "Caro Díaz" no aparece porque no tiene sub-tasks comprometidas en "s1"

  Escenario: Comprometidas contra cumplidas en s2
    Cuando se calculan las métricas de "s2"
    Entonces el resumen por arquitecto es:
      | arquitecto | comprometidas | cumplidas | cumplimiento |
      | Ana Rivas  |             1 |         1 |         100% |
      | Beto Luna  |             1 |         1 |         100% |
      | Caro Díaz  |             1 |         1 |         100% |

  Escenario: El trabajo no planificado se muestra aparte, no en el cumplimiento
    Cuando se calculan las métricas de "s2" para "Beto Luna"
    Entonces su cumplimiento es 100% sobre 1 sub-task comprometida
    Y además se muestra 1 sub-task no planificada
    Y la no planificada no aparece en el denominador del cumplimiento

  Escenario: Todas las etiquetas visibles usan el nombre de la persona
    Cuando se renderiza el resumen por arquitecto
    Entonces cada fila se identifica con "displayName"
    Y en ningún caso se muestra "arq.ana", "arq.beto" ni "arq.caro"
```

---

## F-04 — Métricas de eficiencia del arquitecto (O2)

```gherkin
# language: es

Característica: Métricas de eficiencia del arquitecto
  Como líder del equipo
  quiero cuatro indicadores independientes de eficiencia por arquitecto
  para entender quién resuelve más y más rápido, sin reducirlo todo a un solo número.

  Antecedentes:
    Dado el juego de datos de referencia

  Escenario: Los cuatro indicadores se muestran por separado
    Cuando se abre la vista de eficiencia de "s1"
    Entonces se muestran los indicadores "cumplimiento", "throughput", "cycle time" y "carry-over"
    Y cada uno se muestra con su propio valor
    Y no se calcula ningún índice compuesto
    Y no se muestra un único número de eficiencia por persona

  Escenario: Cumplimiento del compromiso
    Cuando se calcula el cumplimiento de "Ana Rivas" en "s1"
    Entonces el valor es 25%
    Y el detalle indica 1 cumplida de 4 comprometidas

  Escenario: Throughput incluye el trabajo no planificado
    Cuando se calcula el throughput de "Beto Luna" en "s2"
    Entonces el valor es 2
    Y el detalle indica 1 comprometida cumplida y 1 no planificada cumplida

  Escenario: Cycle time en días hábiles desde el inicio del sprint
    Cuando se calcula el cycle time de "Beto Luna" en "s1"
    Entonces el valor es 8 días hábiles
    Y corresponde a "ST-104", comprometida en "s1" que inició el "2026-08-03"
    Y resuelta el "2026-08-12"

  Escenario: El cycle time de una tarea arrastrada se mide desde el sprint que la cumple
    Dado que "ST-102" se comprometió en "s1" y en "s2"
    Y que se resolvió el "2026-08-20", dentro de "s2"
    Cuando se calcula el cycle time de "Ana Rivas" en "s2"
    Entonces el valor es 4 días hábiles
    Y se mide desde el inicio de "s2" el "2026-08-17"
    Y no se mide desde el inicio de "s1"

  Escenario: El trabajo no planificado no entra en el cycle time
    Cuando se calcula el cycle time de "Beto Luna" en "s2"
    Entonces "ST-202" queda excluida del cálculo
    Y el valor corresponde únicamente a "ST-201"

  Escenario: Carry-over rate
    Cuando se calcula el carry-over de "Ana Rivas" en "s1"
    Entonces el valor es 25%
    Y el detalle indica 1 sub-task arrastrada de 4 comprometidas

  Escenario: Cada indicador se contrasta contra el promedio del equipo
    Cuando se muestra el throughput de "Beto Luna" en "s2"
    Entonces junto al valor 2 se muestra el promedio del equipo para "s2"
    Y el promedio del equipo es 1,33
    Y no se colorea el valor contra ningún umbral fijo
    Y no se muestra ninguna etiqueta de tipo "bueno" o "malo"

  Escenario: No se normaliza por capacidad
    Dado que "Caro Díaz" estuvo ausente parte de "s2"
    Cuando se calcula su throughput
    Entonces el valor se muestra crudo, sin ajuste por días disponibles
    Y el dashboard no infiere ni declara ninguna ausencia

  Escenario: Arquitecto sin sub-tasks cumplidas en el sprint
    Dado que un arquitecto tiene sub-tasks comprometidas y ninguna cumplida en "s1"
    Cuando se calcula su cycle time
    Entonces no se muestra un valor de cycle time
    Y se indica que no hay sub-tasks cumplidas para calcularlo
    Y no se muestra 0
```

---

## F-05 — Vista general del equipo y zoom a la persona (O3)

```gherkin
# language: es

Característica: Vista general del equipo con zoom a la persona
  Como líder del equipo
  quiero partir de una vista general del sprint y poder profundizar en un arquitecto
  para evaluar primero al equipo y solo después a la persona.

  Antecedentes:
    Dado el juego de datos de referencia
    Y que el usuario seleccionó el sprint "s1"

  Escenario: La vista por defecto es la del equipo
    Cuando el usuario abre el dashboard
    Entonces se muestra la vista de equipo
    Y no hace falta seleccionar ningún arquitecto para ver datos
    Y se muestran el burndown del equipo y el resumen por arquitecto

  Escenario: Indicadores de cabecera del equipo
    Cuando se muestra la vista de equipo de "s1"
    Entonces se muestran el total comprometido, el total cumplido y el cumplimiento del equipo
    Y se muestra la cantidad de sub-tasks no planificadas
    Y se muestra la cantidad de sub-tasks en la categoría "fuera de sprint"

  Escenario: Zoom a un arquitecto desde la vista de equipo
    Dado que se muestra el resumen por arquitecto
    Cuando el usuario selecciona a "Ana Rivas"
    Entonces se muestra la vista individual de "Ana Rivas"
    Y contiene su burndown, sus cuatro indicadores de eficiencia
    Y contiene el detalle de sus sub-tasks del sprint
    Y contiene su distribución entre iniciativas propias y de apoyo

  Escenario: Volver del zoom a la vista de equipo
    Dado que el usuario está en la vista individual de "Ana Rivas"
    Cuando elige volver a la vista de equipo
    Entonces se restaura la vista de equipo con el mismo sprint seleccionado

  Escenario: Detalle de sub-tasks en la vista individual
    Cuando se muestra la vista individual de "Ana Rivas" en "s1"
    Entonces se listan sus sub-tasks con clave, resumen, historia padre, iniciativa y estado
    Y cada fila indica si es propia o de apoyo
    Y cada fila indica si está arrastrada al sprint siguiente
    Y el listado no se recorta a un número fijo de filas
```

---

## F-06 — Evolución de la eficiencia en el tiempo (O4)

```gherkin
# language: es

Característica: Evolución de la eficiencia del arquitecto en el tiempo
  Como líder del equipo
  quiero ver la tendencia de cada indicador a lo largo de los sprints
  para evaluar la trayectoria y no solo la foto de un sprint.

  Antecedentes:
    Dado el juego de datos de referencia
    Y que existen los sprints "s1", "s2" y "s3"

  Escenario: Cuatro series independientes en el tiempo
    Cuando se abre la vista de evolución de "Ana Rivas"
    Entonces se muestran cuatro series a lo largo de "s1", "s2" y "s3"
    Y las series son "cumplimiento", "throughput", "cycle time" y "carry-over"
    Y las series no se combinan en una sola

  Escenario: El eje X son los sprints configurados, en orden
    Cuando se dibuja la evolución
    Entonces el eje X recorre "Sprint 1", "Sprint 2" y "Sprint 3" en ese orden
    Y el orden proviene de las fechas de "config/sprints.yaml"
    Y no del orden alfabético del label

  Escenario: Comparación contra el promedio del equipo en cada sprint
    Cuando se dibuja la evolución de "Ana Rivas"
    Entonces cada serie individual se acompaña del promedio del equipo por sprint
    Y no se dibuja ninguna línea de umbral fijo

  Escenario: Sprint sin datos para el arquitecto
    Dado que "Caro Díaz" no tiene sub-tasks comprometidas en "s1"
    Cuando se dibuja su evolución
    Entonces el punto de "s1" queda vacío
    Y no se dibuja como 0
    Y la serie no interpola entre "s1" y "s2"

  Escenario: Un sprint sin fechas configuradas queda fuera de la evolución
    Dado que "s9" no existe en "config/sprints.yaml"
    Cuando se dibuja la evolución
    Entonces "s9" no aparece en el eje X
    Y se muestra un aviso de que hay sprints sin configurar

  Escenario: Evolución del equipo completo
    Cuando el usuario abre la evolución sin seleccionar arquitecto
    Entonces se muestran las cuatro series agregadas del equipo
    Y se puede superponer a un arquitecto concreto para compararlo con el equipo
```

---

## F-07 — Iniciativas propias vs apoyo (O5)

```gherkin
# language: es

Característica: Distinción entre iniciativa propia y trabajo de apoyo
  Como líder del equipo
  quiero saber cuánto del trabajo de cada arquitecto es de sus propias iniciativas
  y cuánto es apoyo a iniciativas de otros
  para leer correctamente su carga y su desempeño.

  Antecedentes:
    Dado el juego de datos de referencia

  Escenario: Sub-task cuya épica es del mismo arquitecto es propia
    Dado que la sub-task "ST-101" está asignada a "arq.ana"
    Y que su épica "EPIC-10" está asignada a "arq.ana"
    Cuando se clasifica "ST-101"
    Entonces se marca como "propia"

  Escenario: Sub-task cuya épica es de otro arquitecto es apoyo
    Dado que la sub-task "ST-104" está asignada a "arq.beto"
    Y que su épica "EPIC-10" está asignada a "arq.ana"
    Cuando se clasifica "ST-104"
    Entonces se marca como "apoyo"
    Y se indica que la iniciativa "EPIC-10" pertenece a "Ana Rivas"

  Escenario: Una épica aún asignada al líder produce apoyo, sin excepción
    Dado que la sub-task "ST-301" está asignada a "arq.caro"
    Y que su épica "EPIC-30" sigue asignada a "lider.max"
    Cuando se clasifica "ST-301"
    Entonces se marca como "apoyo"
    Y no se aplica ninguna excepción por tratarse del líder
    Y la interfaz permite detectar que "EPIC-30" no ha sido reasignada

  Escenario: Distribución propia contra apoyo por arquitecto
    Cuando se calcula la distribución de "s1"
    Entonces la distribución es:
      | arquitecto | propias | apoyo |
      | Ana Rivas  |       4 |     0 |
      | Beto Luna  |       0 |     1 |

  Escenario: La marca propia o apoyo se resuelve desde la épica, no desde la historia
    Dado que la sub-task "ST-104" cuelga de la historia "HU-12"
    Y que "HU-12" pertenece a la épica "EPIC-10"
    Cuando se determina si es propia o de apoyo
    Entonces la comparación usa el assignee de "EPIC-10"
    Y no usa el assignee de "HU-12"

  Escenario: Sub-task sin épica resoluble
    Dado que la historia padre de una sub-task no tiene épica asociada
    Cuando se clasifica esa sub-task
    Entonces se marca como "sin iniciativa"
    Y se cuenta aparte de "propia" y de "apoyo"
    Y no se asume ninguna de las dos
```

---

## F-08 — Integridad y honestidad del dato

> Esta feature no corresponde a un objetivo del sponsor. Existe porque la inspección de código
> encontró un truncamiento silencioso (**D-04**) y porque una métrica de desempeño que miente es
> peor que no tenerla.

```gherkin
# language: es

Característica: Integridad y honestidad del dato mostrado
  Como usuario del dashboard
  quiero que el dashboard me avise cuando los datos están incompletos
  para no tomar decisiones sobre un número que no representa la realidad.

  Escenario: Aviso cuando la consulta a Jira se trunca
    Dado que la consulta a Jira devuelve más resultados de los que el dashboard puede traer
    Cuando se muestran las métricas
    Entonces se muestra un aviso visible de que los datos están incompletos
    Y se indica cuántas sub-tasks se cargaron frente al total informado por Jira
    Y las métricas no se presentan como definitivas

  Escenario: Ningún recorte silencioso en las visualizaciones
    Dado que una visualización muestra solo los primeros elementos de una lista más larga
    Cuando se renderiza
    Entonces se indica cuántos elementos quedaron fuera
    Y existe una forma de ver la lista completa

  Escenario: Jira no responde
    Dado que la API de Jira devuelve un error
    Cuando el usuario abre el dashboard
    Entonces se muestra el motivo del fallo
    Y no se muestran métricas parciales como si fueran completas

  Escenario: Jira limita la tasa de peticiones
    Dado que Jira responde con 429
    Cuando el cliente reintenta según la cabecera "Retry-After"
    Y los reintentos se agotan
    Entonces se informa al usuario que Jira está limitando las peticiones
    Y se sugiere reintentar más tarde

  Escenario: La aproximación del cycle time es declarada
    Dado que el cumplimiento se determina con "resolutiondate" y no con el historial de cambios
    Cuando se muestra el cycle time
    Entonces la interfaz declara que una sub-task reabierta solo refleja su último cierre
```

---

## Trazabilidad: objetivo → feature → pregunta

| Objetivo | Features | Reglas | Preguntas de origen |
|---|---|---|---|
| **O1** Ejecución del sprint | F-02, F-03 | R-01…R-10, R-20 | Q-01, Q-02, Q-03, Q-04, Q-05, Q-10, Q-11, Q-43, Q-44 |
| **O2** Eficiencia del arquitecto | F-04 | R-11, R-15…R-18 | Q-14, Q-15, Q-16, Q-35, Q-38, Q-41, Q-42 |
| **O3** General con zoom a persona | F-05 | R-13 | Q-09 |
| **O4** Eficiencia en el tiempo | F-06 | R-15, R-17, R-19 | Q-14, Q-16, Q-35, Q-39 |
| **O5** Propias vs apoyo | F-07 | R-12 | Q-18, Q-37, Q-40 |
| *(transversal)* Configuración | F-00 | R-08, R-09, R-13, R-14, R-19 | Q-02, Q-03, Q-08, Q-09, Q-36, Q-39 |
| *(transversal)* Integridad | F-08 | — | D-04, Q-04 |

---

## Punto abierto

**`Q-45` — Normalización de la curva de promedio histórico (F-02).** El sponsor confirmó que el
burndown lleva línea ideal **y** promedio histórico (Q-44). Este documento especifica ese promedio
como el **remaining medio de los sprints anteriores, normalizado a porcentaje del total
comprometido de cada uno**, para que sprints con distinto volumen sean comparables. Es una
definición **propuesta**, no confirmada. Si la intención era otra (promedio en valor absoluto, o
solo sobre los últimos N sprints), el escenario *"Curva de promedio histórico del equipo"* de F-02
debe ajustarse.

No bloquea el desarrollo: afecta a una sola curva de referencia, no a ninguna métrica.

---

## Siguiente paso

1. Confirmar `Q-45`.
2. Implementar en este orden, que respeta las dependencias:
   **F-00** (configuración) → **F-01** (clasificación, el núcleo) → **F-03** → **F-02** → **F-07**
   → **F-04** → **F-05** → **F-06** → **F-08**.
3. Reparar en el camino **D-01** (`server.js` truncado) y **D-02** (`public/app.js:410`), y extender
   `fetchParents()` para traer el assignee de la épica, que R-12 necesita.
4. Usar las skills de `.agents/skills/`: `spec-driven-development` para derivar el plan desde este
   documento y `test-driven-development` para convertir cada escenario en una prueba.
