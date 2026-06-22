import { escapeHtml, format } from "./utils.js";

export function statCard({ label, value, meta = "", tone = "cyan" }) {
  return `
    <article class="stat-card tone-${tone}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      ${meta ? `<small>${escapeHtml(meta)}</small>` : ""}
    </article>
  `;
}

export function panel({ title, eyebrow = "", action = "", body = "", className = "" }) {
  return `
    <article class="glass-panel ${className}">
      <header class="panel-header">
        <div>
          ${eyebrow ? `<p class="eyebrow">${escapeHtml(eyebrow)}</p>` : ""}
          <h3>${escapeHtml(title)}</h3>
        </div>
        ${action}
      </header>
      ${body}
    </article>
  `;
}

export function teamBadge(team) {
  if (!team?.name && !team?.shortName) return "";

  const label = team.shortName || team.name;
  const color = team.color || "rgba(255, 255, 255, 0.4)";

  return `
    <span class="team-badge" style="--team-color: ${escapeHtml(color)}">
      <span aria-hidden="true"></span>
      ${escapeHtml(label)}
    </span>
  `;
}

export function leaderboard(rows, valueKey, options = {}) {
  const unit = options.unit || "";
  const subtitle = options.subtitle || ((row) => `${row.tileTouchCount} tiles touched`);
  const limit = options.limit || 8;
  const top = rows.slice(0, limit);

  if (!top.length) return `<div class="empty-state">No rows yet.</div>`;

  return `
    <div class="leader-list">
      ${top
        .map(
          (row, index) => `
            <div class="leader-row ${index < 3 ? `medal-${index + 1}` : ""}">
              <div class="rank-badge">${row.rank}</div>
              <div class="leader-copy">
                <strong>${escapeHtml(row.displayName)}</strong>
                <span>${escapeHtml(subtitle(row))}</span>
              </div>
              <div class="leader-value">
                <strong>${format(row[valueKey], 5)}</strong>
                ${unit ? `<span>${escapeHtml(unit)}</span>` : ""}
              </div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

export function podium(rows, valueKey, options = {}) {
  const unit = options.unit || "";
  const top = rows.slice(0, 3);

  if (!top.length) return `<div class="empty-state">No positive gains yet.</div>`;

  return `
    <div class="podium">
      ${top
        .map(
          (row, index) => `
            <article class="podium-card medal-${index + 1}">
              <div class="rank-badge">${row.rank}</div>
              <div>
                <strong>${escapeHtml(row.displayName)}</strong>
                ${teamBadge(row.team)}
                <span>${escapeHtml(options.subtitle ? options.subtitle(row) : `${row.accountCount || 1} account${(row.accountCount || 1) === 1 ? "" : "s"}`)}</span>
              </div>
              <p>${format(row[valueKey], 5)}${unit ? ` ${escapeHtml(unit)}` : ""}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

export function table(columns, rows, className = "", options = {}) {
  if (!rows.length) return `<div class="empty-state">No rows yet.</div>`;

  return `
    <div class="table-wrap ${className}">
      <table>
        <thead>
          <tr>${columns.map((column) => `<th>${column.header ? column.header(column, options) : escapeHtml(column.label)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
                <tr>
                  ${columns.map((column) => `<td>${column.render(row)}</td>`).join("")}
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

export function gainedTable(rows, options = {}) {
  const limit = options.limit || 10;
  const tableRows = rows.filter((row) => row.kills > 0 || row.ehb > 0).slice(0, limit);

  return table(
    [
      { label: "Rank", render: (row) => row.rank },
      {
        label: "Player",
        render: (row) => `
          <strong>${escapeHtml(row.displayName)}</strong>
          ${teamBadge(row.team)}
          <span class="table-subline">${row.accountCount} account${row.accountCount === 1 ? "" : "s"}</span>
        `
      },
      { label: "Start", render: (row) => format(row.killsStart, 0) },
      { label: "End", render: (row) => format(row.killsEnd, 0) },
      { label: "Gained", render: (row) => `<strong class="gain-positive">+${format(row.kills, 0)}</strong>` },
      { label: "% Gained", render: (row) => row.percentGained == null ? "n/a" : `<span class="gain-pill">+ ${format(row.percentGained, 1)}%</span>` }
    ],
    tableRows,
    `gained-table ${options.className || ""}`
  );
}

export function progressBar(value, label) {
  const percent = Math.max(0, Math.min(value * 100, 100));
  return `
    <div class="progress-wrap" aria-label="${escapeHtml(label)}">
      <div class="progress-track"><span style="width: ${percent}%"></span></div>
      <strong>${format(percent, 1)}%</strong>
    </div>
  `;
}

export function miniStat({ label, value, meta = "" }) {
  return `
    <div class="metric-block">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      ${meta ? `<small>${escapeHtml(meta)}</small>` : ""}
    </div>
  `;
}
