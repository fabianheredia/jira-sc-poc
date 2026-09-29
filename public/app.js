let dashboard = null;
 
// instances de charts para destroy()
let barChart = null;
let teamChart = null;
let userChart = null;
let parentChart = null;
let epicChart = null;
 
document.addEventListener("DOMContentLoaded", init);
 
function $(id){ return document.getElementById(id); }
 
function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
 
function safeDestroy(ch){
  if (ch) ch.destroy();
  return null;
}
 
async function init(){
  // Defaults visuales (canvas blanco)
  if (window.Chart){
    Chart.defaults.color = "#111827";
    Chart.defaults.font.family = "Arial";
  }
 
  await loadMeta();
  await loadDashboard();
 
  $("sprintSelect")?.addEventListener("change", loadDashboard);
  $("userSelect")?.addEventListener("change", loadDashboard);
}
 
async function loadMeta(){
  const res = await fetch("/api/meta");
  const data = await res.json();
 
  if (!data.ok){
    console.error(data);
    alert("No se pudo cargar /api/meta");
    return;
  }
 
  const sprintSel = $("sprintSelect");
  const userSel = $("userSelect");
 
  const sprints = data.meta?.sprints || [];
  const users = data.meta?.users || [];
 
  sprintSel.innerHTML = `<option value="ALL">ALL</option>` +
    sprints.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
 
  userSel.innerHTML = `<option value="ALL">ALL</option>` +
    users.map(u => `<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`).join("");
}
 
async function loadDashboard(){
  const sprint = $("sprintSelect")?.value || "ALL";
  const user = $("userSelect")?.value || "ALL";
 
  const url = `/api/dashboard?sprint=${encodeURIComponent(sprint)}&user=${encodeURIComponent(user)}`;
  const res = await fetch(url);
  dashboard = await res.json();
 
  if (!dashboard.ok){
    console.error(dashboard);
    alert("No se pudo cargar /api/dashboard");
    return;
  }
 
  renderSummaryPills();
  renderTeamBurndown();
  renderUserBurndown();
  renderCommittedVsDoneBar();   // horizontal + tamaño controlado
  renderParentBar();            // horizontal + tamaño controlado
  renderEpicBar();              // tooltip con nombre iniciativa
}
 
function renderSummaryPills(){
  const div = $("summaryPills");
  if (!div) return;
 
  const sprint = dashboard.filters?.sprint || "ALL";
  const user = dashboard.filters?.user || "ALL";
  const loaded = dashboard.counts?.allIssuesLoaded ?? "-";
  const filtered = dashboard.counts?.filteredIssues ?? "-";
 
  div.innerHTML = `
    <span class="pill">Sprint: <b>${escapeHtml(sprint)}</b></span>
    <span class="pill">Usuario: <b>${escapeHtml(user)}</b></span>
    <span class="pill">Cargadas: <b>${loaded}</b></span>
    <span class="pill">Filtradas: <b>${filtered}</b></span>
  `;
}
 
/* =========================================================
   1) Burndown equipo
========================================================= */
function renderTeamBurndown(){
  const canvas = $("teamChart");
  if (!canvas) return;
 
  const bd = dashboard.charts?.teamBurndown;
  if (!bd) return;
 
  teamChart = safeDestroy(teamChart);
 
  teamChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: bd.labels || [],
      datasets: [{
        label: "Remaining (Equipo)",
        data: bd.remaining || [],
        borderColor: "rgba(59,130,246,1)",
        backgroundColor: "rgba(59,130,246,0.12)",
        fill: true,
        tension: 0.2,
        pointRadius: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // container define height [1](https://www.chartjs.org/docs/latest/configuration/responsive.html)
      plugins: { legend: { display: true } },
      scales: { y: { beginAtZero: true } }
    }
  });
}
 
/* =========================================================
   2) Burndown usuario
========================================================= */
function renderUserBurndown(){
  const canvas = $("userChart");
  if (!canvas) return;
 
  const user = dashboard.filters?.user || "ALL";
  const bd = dashboard.charts?.userBurndown;
 
  userChart = safeDestroy(userChart);
 
  if (user === "ALL"){
    userChart = new Chart(canvas, {
      type: "line",
      data: { labels: ["Selecciona usuario"], datasets: [{ label:"Burndown Usuario", data:[0]}] },
      options: { responsive:true, maintainAspectRatio:false }
    });
    return;
  }
 
  userChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: bd.labels || [],
      datasets: [{
        label: `Remaining (${user})`,
        data: bd.remaining || [],
        borderColor: "rgba(34,197,94,1)",
        backgroundColor: "rgba(34,197,94,0.12)",
        fill: true,
        tension: 0.2,
        pointRadius: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true } },
      scales: { y: { beginAtZero: true } }
    }
  });
}
 
/* =========================================================
   3) Comprometidas vs Done (horizontal, eje Y con nombres)
   - Para que se vea bien en dashboard: mostramos TOP 12 por committed
   - Barras delgadas con barThickness
========================================================= */
function renderCommittedVsDoneBar(){
  const canvas = $("barChart");
  if (!canvas) return;
 
  const bar = dashboard.charts?.barCommittedVsDone;
  if (!bar) return;
 
  // Top N para evitar gráfico monstruo (tamaño adecuado de pantalla)
  const rows = bar.labels.map((name, i) => ({
    name,
    committed: bar.committed[i] ?? 0,
    done: bar.done[i] ?? 0
  }))
  .sort((a,b) => b.committed - a.committed)
  .slice(0, 12);
 
  const labels = rows.map(r => r.name);
  const committed = rows.map(r => r.committed);
  const done = rows.map(r => r.done);
 
  barChart = safeDestroy(barChart);
 
  barChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Committed",
          data: committed,
          backgroundColor: "rgba(59,130,246,0.75)",
          borderColor: "rgba(59,130,246,1)",
          borderWidth: 1,
          borderRadius: 6
        },
        {
          label: "Done",
          data: done,
          backgroundColor: "rgba(34,197,94,0.85)",   // ✅ verde
          borderColor: "rgba(34,197,94,1)",
          borderWidth: 1,
          borderRadius: 6
        }
      ]
    },
    options: {
      indexAxis: "y",                 // ✅ nombres en Y [2](https://teams.microsoft.com/l/meeting/details?eventId=AAMkADczMWE5MzgyLWIyN2UtNGE3MC05YjUzLWZkZTYwN2JjOTI2ZAFRAAgI3sA548IAAEYAAAAA96975YsJDk20juZHerGCggcAQ3Y8a2TDs0Salq8_p4QVYQAAAAABDQAAQ3Y8a2TDs0Salq8_p4QVYQAAKjRmOQAAEA%3d%3d)
      responsive: true,
      maintainAspectRatio: false,     // altura la da el container [1](https://www.chartjs.org/docs/latest/configuration/responsive.html)
      elements: {
        bar: {
          barThickness: 10,
          maxBarThickness: 12
        }
      },
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            title: (items) => items?.[0]?.label || "",
            label: (ctx) => `${ctx.dataset.label}: ${ctx.formattedValue}`
          }
        }
      },
      scales: {
        x: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.08)" } },
        y: {
          grid: { display: false },
          ticks: {
            padding: 6,
            callback: (value) => {
              const label = labels[value] ?? "";
              return label.length > 28 ? label.slice(0, 28) + "…" : label;
            }
          }
        }
      }
    }
  });
}
 
/* =========================================================
   4) Historias (Parent) (horizontal, eje Y con nombres)
   - Top 12 por total
   - Done verde
========================================================= */
function renderParentBar(){
  const canvas = $("parentChart");
  if (!canvas) return;
 
  const rows = dashboard.groups?.parentRows || [];
  const top = rows.slice(0, 12);
 
  const labelsFull = top.map(r => `${r.parentKey}: ${r.parentSummary}`);
  const labelsAxis = labelsFull.map(l => l.length > 42 ? l.slice(0,42) + "…" : l);
 
  const total = top.map(r => r.total);
  const done = top.map(r => r.done);
 
  parentChart = safeDestroy(parentChart);
 
  parentChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: labelsAxis,
      datasets: [
        {
          label: "Total",
          data: total,
          backgroundColor: "rgba(148,163,184,0.75)",
          borderColor: "rgba(148,163,184,1)",
          borderWidth: 1,
          borderRadius: 6
        },
        {
          label: "Done",
          data: done,
          backgroundColor: "rgba(34,197,94,0.85)",     // ✅ verde
          borderColor: "rgba(34,197,94,1)",
          borderWidth: 1,
          borderRadius: 6
        }
      ]
    },
    options: {
      indexAxis: "y",                 // ✅ nombres en Y [2](https://teams.microsoft.com/l/meeting/details?eventId=AAMkADczMWE5MzgyLWIyN2UtNGE3MC05YjUzLWZkZTYwN2JjOTI2ZAFRAAgI3sA548IAAEYAAAAA96975YsJDk20juZHerGCggcAQ3Y8a2TDs0Salq8_p4QVYQAAAAABDQAAQ3Y8a2TDs0Salq8_p4QVYQAAKjRmOQAAEA%3d%3d)
      responsive: true,
      maintainAspectRatio: false,     // contenedor controla altura [1](https://www.chartjs.org/docs/latest/configuration/responsive.html)
      elements: {
        bar: {
          barThickness: 10,
          maxBarThickness: 12
        }
      },
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            // mostrar label completo (sin recorte) en el tooltip
            title: (items) => {
              const idx = items?.[0]?.dataIndex ?? 0;
              return labelsFull[idx] || "";
            },
            label: (ctx) => `${ctx.dataset.label}: ${ctx.formattedValue}`
          }
        }
      },
      scales: {
        x: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.08)" } },
        y: { grid: { display:false }, ticks: { padding: 6 } }
      }
    }
  });
}
 
/* =========================================================
   5) Épicas (tooltip con nombre de iniciativa)
========================================================= */
function renderEpicBar(){
  const canvas = $("epicChart");
  if (!canvas) return;
 
  const rows = dashboard.groups?.epicRows || [];
  const top = rows.slice(0, 12);
 
  const labels = top.map(r => r.epicKey);
  const total = top.map(r => r.total);
  const done = top.map(r => r.done);
 
  const epicNameByKey = {};
  top.forEach(r => epicNameByKey[r.epicKey] = r.epicSummary || r.epicKey);
 
  epicChart = safeDestroy(epicChart);
 
  epicChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Total",
          data: total,
          backgroundColor: "rgba(59,130,246,0.75)",
          borderColor: "rgba(59,130,246,1)",
          borderWidth: 1,
          borderRadius: 6
        },
        {
          label: "Done",
          data: done,
          backgroundColor: "rgba(34,197,94,0.85)",     // ✅ verde
          borderColor: "rgba(34,197,94,1)",
          borderWidth: 1,
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,     // contenedor controla altura [1](https://www.chartjs.org/docs/latest/configuration/responsive.html)
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            // Título con nombre iniciativa (epicSummary) usando callbacks [3](https://teams.microsoft.com/l/meeting/details?eventId=AAMkADczMWE5MzgyLWIyN2UtNGE3MC05YjUzLWZkZTYwN2JjOTI2ZAFRAAgI3tC6Xm7AAEYAAAAA96975YsJDk20juZHerGCggcAQ3Y8a2TDs0Salq8_p4QVYQAAAAABDQAAQ3Y8a2TDs0Salq8_p4QVYQAAKjRmOQAAEA%3d%3d)
            title: (items) => {
              const key = items?.[0]?.label;
              return epicNameByKey[key] || key || "";
            },
            label: (ctx) => `${ctx.dataset.label}: ${ctx.formattedValue}`
          }
        }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}
 
// Exponer para botón HTML
window.loadDashboard = loadDashboard;