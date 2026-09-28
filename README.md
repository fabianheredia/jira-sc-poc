# Jira Sprint Dashboard

> Dashboard web para explorar métricas de sprints de Jira, con filtros por sprint y usuario y visualizaciones de avance del equipo.

> **Estado:** prueba de concepto en desarrollo. Algunas secciones de este README se completarán a medida que evolucione el proyecto.

## Contenido

- [Descripción](#descripción)
- [Funcionalidades](#funcionalidades)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Ideación](#ideación)
- [Herramientas de desarrollo con IA](#herramientas-de-desarrollo-con-ia)
- [Tecnologías](#tecnologías)
- [Requisitos](#requisitos)
- [Instalación y ejecución](#instalación-y-ejecución)
- [Configuración](#configuración)
- [Pruebas](#pruebas)
- [API](#api)
- [Contribución](#contribución)
- [Seguridad](#seguridad)
- [Licencia](#licencia)

## Descripción

Este proyecto presenta información de Jira en un dashboard web para facilitar el seguimiento del trabajo comprometido y completado durante los sprints. El servidor consulta Jira y entrega los datos que consume la interfaz para mostrar métricas del equipo y de sus usuarios.

## Funcionalidades

- Filtrado del dashboard por sprint y usuario.
- Visualización de burndown del equipo y por usuario.
- Comparación de trabajo comprometido y completado.
- Resúmenes por responsable, elemento padre e iniciativa.

## Estructura del proyecto

```text
.
├── .agents/
│   └── skills/
├── idea/
│   └── internal_solution_brief.md
├── public/
│   ├── app.js
│   └── index.html
├── server.js
├── package.json
└── skills-lock.json
```

## Ideación

La etapa de ideación y definición de la solución se documenta en [Internal Solution Brief](idea/internal_solution_brief.md). El brief recoge el problema de negocio, stakeholders, estado actual y deseado, criterios de éxito, restricciones, enfoque técnico, riesgos y límites de alcance.

## Herramientas de desarrollo con IA

El entorno de trabajo incorpora **Claude Code Setup** como plugin de Claude Code. El comando usado para instalarlo es:

```sh
claude plugin install claude-code-setup@claude-plugins-official
```

También se añadieron skills de desarrollo desde [`addyosmani/agent-skills`](https://github.com/addyosmani/agent-skills) mediante:

```sh
npx skills add addyosmani/agent-skills
```

El archivo [`skills-lock.json`](skills-lock.json) registra las skills incorporadas al proyecto.

## Tecnologías

- Node.js y Express para el servidor.
- HTML, CSS y JavaScript para la interfaz.
- Chart.js para las visualizaciones.
- Jira REST API para obtener información de proyectos y sprints.

## Requisitos

- Node.js 18 o posterior.
- npm.
- Acceso a una instancia de Jira y un token de autenticación válido.

## Instalación y ejecución

Desde la raíz del repositorio, instala las dependencias:

```sh
npm install
```

Antes de iniciar el servidor, crea el archivo `.env` en la raíz y agrega la configuración descrita en [Configuración](#configuración). Luego ejecuta:

```sh
node server.js
```

Cuando aparezca el mensaje de inicio en la terminal, abre [http://localhost:3000](http://localhost:3000) en el navegador. Si configuraste un valor distinto para `PORT`, usa ese puerto en la dirección. Para detener el servidor, presiona `Ctrl+C` en la terminal.

## Configuración

Crea un archivo `.env` en la raíz del proyecto y define:

```dotenv
JIRA_URL=https://tu-instancia-de-jira
JIRA_TOKEN=tu-token
JIRA_PROJECT=IA
PORT=3000
```

`JIRA_URL` y `JIRA_TOKEN` son necesarios para consultar Jira. `JIRA_PROJECT` tiene como valor predeterminado `IA` y `PORT` tiene como valor predeterminado `3000`.

## Pruebas

Por completar. El comando `npm test` todavía no ejecuta pruebas del proyecto.

## API

Por completar.

## Contribución

Por completar.

## Seguridad

Por completar.


