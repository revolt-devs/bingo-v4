import * as components from "./components.js";
import { detailFormat, escapeHtml, format, numberFormat, slugify } from "./utils.js";

const appBaseUrl = new URL(".", import.meta.url);
const appBasePath = appBaseUrl.pathname.replace(/\/$/, "");

const paths = {
  eventResults: new URL("../data/wrapped/event-results.json", appBaseUrl).toString()
};

const viewRoutes = {
  overview: "/",
  teams: "/teams",
  players: "/players",
  board: "/board",
  bosses: "/bosses",
  data: "/source"
};

const hardcodedTeamTileScores = new Map([
  ["Team Backs", 49],
  ["Team Bill", 48],
  ["Team Helbrass", 40],
  ["Team Don", 17]
]);

const defaultTeamRosterSort = "tileScore";

const state = {
  data: null,
  selectedTileId: null,
  selectedPlayerId: null,
  selectedBossSlug: null,
  collapsedTeamIds: new Set(),
  teamRosterSorts: new Map(),
  playersSortKey: defaultTeamRosterSort,
  playerBossSorts: new Map(),
  expandedTileKcIds: new Set()
};

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Unable to load ${path}: ${response.status}`);
  return response.json();
}

function qs(selector) {
  return document.querySelector(selector);
}

function qsa(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

function withBasePath(route) {
  const normalized = route.startsWith("/") ? route : `/${route}`;
  if (normalized === "/") return appBasePath ? `${appBasePath}/` : "/";
  return `${appBasePath}${normalized}`;
}

function teamById(teamId) {
  return state.data.teamsById.get(teamId);
}

function playerById(playerId) {
  return state.data.playersById.get(playerId);
}

function tileById(tileId) {
  return state.data.tilesById.get(tileId);
}

function bossBySlug(slug) {
  return state.data.bossesBySlug.get(slug);
}

function teamFor(row) {
  return {
    id: row.teamId,
    name: row.teamName,
    shortName: row.teamShortName || row.shortName,
    color: row.teamColor || row.color
  };
}

function teamBadge(row) {
  return components.teamBadge(teamFor(row));
}

function playerPath(playerId) {
  return withBasePath(`/players/${playerId}`);
}

function tileSlug(tile) {
  return slugify(tile?.pointLabel || tile?.label || tile?.id);
}

function tilePath(tileId) {
  return withBasePath(`/board/${tileSlug(tileById(tileId))}`);
}

function tileIdForSlug(slug) {
  return state.data.tiles.find((tile) => tileSlug(tile) === slug)?.id || null;
}

function bossPath(bossSlug) {
  return withBasePath(`/bosses/${bossSlug}`);
}

function medalClass(rank) {
  if (rank === 1) return "medal-1";
  if (rank === 2) return "medal-2";
  if (rank === 3) return "medal-3";
  return "";
}

function formatHours(value) {
  return `${format(value, 2)}h`;
}

function renderBadge(label) {
  return `<span class="award-badge">${escapeHtml(label)}</span>`;
}

function renderScoreCard(team) {
  return `
    <article class="score-card ${medalClass(team.rank)}" style="--team-color: ${escapeHtml(team.color)}">
      <div class="score-card-header">
        <div class="rank-badge">${team.rank}</div>
        <div>
          <h3>${escapeHtml(team.shortName)}</h3>
          ${components.teamBadge(team)}
        </div>
      </div>
      <strong>${format(team.tileScore, 2)}</strong>
      <span>tile score</span>
    </article>
  `;
}

function renderAwardCard(award) {
  const winner = award.winnerPlayerId ? playerById(award.winnerPlayerId) : null;
  const winnerName = award.winner || winner?.displayName || "Unknown";
  const winnerMarkup = winner
    ? `<a href="${playerPath(winner.id)}">${escapeHtml(winnerName)}</a>`
    : escapeHtml(winnerName);

  return `
    <article class="award-card">
      <div class="award-card-top">
        <span class="award-icon" aria-hidden="true">${escapeHtml(award.icon || "*")}</span>
        <span>${escapeHtml(award.criteria || "award")}</span>
      </div>
      <h3>${escapeHtml(award.label)}</h3>
      <p>${escapeHtml(award.description)}</p>
      <div class="award-winner">
        <span>Winner</span>
        <strong>${winnerMarkup}</strong>
        <small>${escapeHtml(award.value || "")}</small>
      </div>
    </article>
  `;
}

function renderAwards() {
  const awards = state.data.awards || [];
  if (!awards.length) return "";

  return `
    <section>
      <div class="section-header">
        <div>
          <p class="eyebrow">Community awards</p>
          <h2>Special Honors</h2>
        </div>
      </div>
      <div class="award-grid">
        ${awards.map(renderAwardCard).join("")}
      </div>
    </section>
  `;
}

function renderOverview() {
  qs("#overview-content").innerHTML = `
    <div class="section-stack">
      <section>
        <div class="section-header">
          <div>
            <p class="eyebrow">Final bingo score</p>
            <h2 id="overview-title">Final Standings</h2>
          </div>
        </div>
        <div class="score-grid">
          ${state.data.teams.map(renderScoreCard).join("")}
        </div>
      </section>
      ${renderAwards()}
      <div class="action-grid">
        <a class="nav-card" href="${routeForView("board")}" data-view-jump="board">
          <span class="eyebrow">Explore</span>
          <strong>Board</strong>
        </a>
        <a class="nav-card" href="${routeForView("teams")}" data-view-jump="teams">
          <span class="eyebrow">Explore</span>
          <strong>Teams</strong>
        </a>
        <a class="nav-card" href="${routeForView("players")}" data-view-jump="players">
          <span class="eyebrow">Explore</span>
          <strong>Players</strong>
        </a>
        <a class="nav-card" href="${routeForView("bosses")}" data-view-jump="bosses">
          <span class="eyebrow">Explore</span>
          <strong>Bosses</strong>
        </a>
      </div>
    </div>
  `;
}

function renderTeamMetrics(team) {
  return `
    <div class="resource-stats">
      ${components.miniStat({ label: "EHB", value: formatHours(team.ehb) })}
      ${components.miniStat({ label: "EHP", value: formatHours(team.ehp) })}
      ${components.miniStat({ label: "Total Player Time", value: formatHours(team.totalTime) })}
      ${components.miniStat({ label: "Tile Score", value: format(team.tileScore, 2), meta: `${team.tileCount} credited tile touches` })}
    </div>
  `;
}

function teamRosterSortKey(teamId) {
  return state.teamRosterSorts.get(teamId) || defaultTeamRosterSort;
}

function compareDescending(aValue, bValue) {
  if (typeof aValue === "string" || typeof bValue === "string") {
    return String(bValue || "").localeCompare(String(aValue || ""));
  }

  return (bValue || 0) - (aValue || 0);
}

function compareAscending(aValue, bValue) {
  if (typeof aValue === "string" || typeof bValue === "string") {
    return String(aValue || "").localeCompare(String(bValue || ""));
  }

  return (aValue || 0) - (bValue || 0);
}

function rosterSortHeader(column, { team, activeSortKey }) {
  const isActive = column.sortKey === activeSortKey;

  return `
    <button
      class="sort-header ${isActive ? "is-active" : ""}"
      type="button"
      data-team-roster-sort="${escapeHtml(team.id)}"
      data-sort-key="${escapeHtml(column.sortKey)}"
      aria-label="Sort ${escapeHtml(team.name)} roster by ${escapeHtml(column.label)} descending"
      aria-pressed="${isActive ? "true" : "false"}"
    >
      <span>${escapeHtml(column.label)}</span>
      <span aria-hidden="true">v</span>
    </button>
  `;
}

function renderTeamRoster(team) {
  const activeSortKey = teamRosterSortKey(team.id);
  const players = team.roster.map(playerById).filter(Boolean);
  const rows = players
    .map((player) => ({
      ...player,
      isMvp: player.id === team.mvpPlayerId,
      isGrinder: player.id === team.grinderPlayerId
    }))
    .sort((a, b) => compareDescending(a[activeSortKey], b[activeSortKey]) || a.displayName.localeCompare(b.displayName));

  return components.table(
    [
      {
        label: "Player",
        sortKey: "displayName",
        header: rosterSortHeader,
        render: (player) => `
          <button class="link-button" type="button" data-player-id="${escapeHtml(player.id)}">
            <strong>${escapeHtml(player.displayName)}</strong>
          </button>
          <span class="badge-row">
            ${player.isMvp ? renderBadge("MVP") : ""}
            ${player.isGrinder ? renderBadge("Grinder") : ""}
          </span>
        `
      },
      { label: "Tile Score", sortKey: "tileScore", header: rosterSortHeader, render: (player) => format(player.tileScore, 2) },
      { label: "EHP", sortKey: "ehp", header: rosterSortHeader, render: (player) => formatHours(player.ehp) },
      { label: "EHB", sortKey: "ehb", header: rosterSortHeader, render: (player) => formatHours(player.ehb) },
      { label: "Total", sortKey: "totalTime", header: rosterSortHeader, render: (player) => formatHours(player.totalTime) },
      { label: "Unique tiles contributed to", sortKey: "tileCount", header: rosterSortHeader, render: (player) => format(player.tileCount, 0) }
    ],
    rows,
    "roster-table",
    { team, activeSortKey }
  );
}

function renderTeamPanel(team) {
  const isCollapsed = state.collapsedTeamIds.has(team.id);

  return `
    <article class="glass-panel team-panel ${isCollapsed ? "is-collapsed" : ""}" style="--team-color: ${escapeHtml(team.color)}">
      <button
        class="panel-header team-panel-toggle"
        type="button"
        data-team-toggle="${escapeHtml(team.id)}"
        aria-expanded="${isCollapsed ? "false" : "true"}"
        aria-controls="team-panel-body-${escapeHtml(team.id)}"
      >
        <div>
          <p class="eyebrow">Rank ${team.rank}</p>
          <h3>${escapeHtml(team.name)}</h3>
        </div>
        <span class="team-panel-toggle-icon" aria-hidden="true">v</span>
      </button>
      <div class="team-panel-body-shell" id="team-panel-body-${escapeHtml(team.id)}">
        <div class="team-panel-body">
          ${renderTeamMetrics(team)}
          ${renderTeamRoster(team)}
        </div>
      </div>
    </article>
  `;
}

function renderTeams() {
  qs("#teams-content").innerHTML = `
    <div class="team-stack">
      ${state.data.teams
        .map(renderTeamPanel)
        .join("")}
    </div>
  `;
}

function playersSortHeader(column, { activeSortKey }) {
  const isActive = column.sortKey === activeSortKey;

  return `
    <button
      class="sort-header ${isActive ? "is-active" : ""}"
      type="button"
      data-players-sort="${escapeHtml(column.sortKey)}"
      aria-label="Sort players by ${escapeHtml(column.label)} descending"
      aria-pressed="${isActive ? "true" : "false"}"
    >
      <span>${escapeHtml(column.label)}</span>
      <span aria-hidden="true">v</span>
    </button>
  `;
}

function renderPlayersMetrics(players) {
  const totals = players.reduce(
    (memo, player) => ({
      ehb: memo.ehb + (player.ehb || 0),
      ehp: memo.ehp + (player.ehp || 0),
      totalTime: memo.totalTime + (player.totalTime || 0),
      tileScore: memo.tileScore + (player.tileScore || 0)
    }),
    { ehb: 0, ehp: 0, totalTime: 0, tileScore: 0 }
  );

  return `
    <div class="resource-stats">
      ${components.miniStat({ label: "Players", value: format(players.length, 0) })}
      ${components.miniStat({ label: "EHB", value: formatHours(totals.ehb) })}
      ${components.miniStat({ label: "EHP", value: formatHours(totals.ehp) })}
      ${components.miniStat({ label: "Total Player Time", value: formatHours(totals.totalTime) })}
      ${components.miniStat({ label: "Tile Score", value: format(totals.tileScore, 2) })}
    </div>
  `;
}

function renderPlayersTable() {
  const activeSortKey = state.playersSortKey || defaultTeamRosterSort;
  const rows = state.data.players
    .map((player) => ({
      ...player,
      teamSortName: player.teamName || player.teamShortName || "Unknown"
    }))
    .sort((a, b) => compareDescending(a[activeSortKey], b[activeSortKey]) || a.displayName.localeCompare(b.displayName));

  return components.table(
    [
      {
        label: "Player",
        sortKey: "displayName",
        header: playersSortHeader,
        render: (player) => `
          <button class="link-button" type="button" data-player-id="${escapeHtml(player.id)}">
            <strong>${escapeHtml(player.displayName)}</strong>
          </button>
          <span class="badge-row">
            ${(player.badges || []).map(renderBadge).join("")}
          </span>
        `
      },
      { label: "Team", sortKey: "teamSortName", header: playersSortHeader, render: (player) => teamBadge(player) },
      { label: "Tile Score", sortKey: "tileScore", header: playersSortHeader, render: (player) => format(player.tileScore, 2) },
      { label: "EHP", sortKey: "ehp", header: playersSortHeader, render: (player) => formatHours(player.ehp) },
      { label: "EHB", sortKey: "ehb", header: playersSortHeader, render: (player) => formatHours(player.ehb) },
      { label: "Total", sortKey: "totalTime", header: playersSortHeader, render: (player) => formatHours(player.totalTime) },
      { label: "Unique tiles contributed to", sortKey: "tileCount", header: playersSortHeader, render: (player) => format(player.tileCount, 0) }
    ],
    rows,
    "roster-table players-table",
    { activeSortKey }
  );
}

function renderPlayers() {
  const players = state.data.players;

  qs("#players-content").innerHTML = `
    <article class="glass-panel players-panel">
      <div class="team-panel-body">
        ${renderPlayersMetrics(players)}
        ${renderPlayersTable()}
      </div>
    </article>
  `;
}

function renderBoard() {
  qs("#tile-board").innerHTML = state.data.tiles
    .map((tile) => {
      const progress = `${format(tile.total, 2)}/${format(tile.needed, 0)}`;
      return `
        <button class="tile-card ${tile.isComplete ? "is-complete" : "is-open"}" type="button" data-board-tile-id="${escapeHtml(tile.id)}">
          <img src="${escapeHtml(tile.imageUrl)}" alt="" loading="lazy" />
          <span class="tile-number">${tile.position}</span>
          <span class="tile-scrim">
            <strong>${escapeHtml(tile.label)}</strong>
            <small>${progress}</small>
          </span>
        </button>
      `;
    })
    .join("");
}

function renderTileTeamSummary(tile) {
  if (!tile.teamScores.length) return `<div class="tile-wom-summary empty-state">No team score yet.</div>`;

  return `
    <div class="tile-wom-summary" aria-label="Team score">
      ${tile.teamScores
        .map(
          (row) => `
            <div class="tile-wom-row" style="--team-color: ${escapeHtml(row.teamColor || "rgba(255, 255, 255, 0.45)")};">
              <span class="tile-wom-team">${escapeHtml(row.teamName)}</span>
              <strong class="gain-positive">+${format(row.score, 2)}</strong>
              <span>tile score</span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function tiedMaxRows(rows, valueKey) {
  const positiveRows = rows.filter((row) => row[valueKey] > 0);
  if (!positiveRows.length) return [];

  const maxValue = Math.max(...positiveRows.map((row) => row[valueKey]));
  return positiveRows
    .filter((row) => Math.abs(row[valueKey] - maxValue) < 0.00001)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

function tileRelevantSlugs(tile) {
  return new Set((tile.relevantCategories || []).filter(isMappedCategory).map(slugify));
}

function rowMatchesRelevant(row, relevantSlugs, keys) {
  return keys.some((key) => relevantSlugs.has(slugify(row[key])));
}

function playerRelevantRowsForTile(player, tile) {
  const relevantSlugs = tileRelevantSlugs(tile);
  if (!relevantSlugs.size) return [];

  const bossRows = player.bossRows
    .filter((row) => (row.ehb > 0 || row.kills > 0) && rowMatchesRelevant(row, relevantSlugs, ["category", "boss"]))
    .map((row) => ({
      type: "boss",
      source: row.boss,
      category: row.category,
      gained: row.kills || 0,
      gainedLabel: "KC",
      time: row.ehb || 0,
      timeLabel: "EHB"
    }));

  const activityRows = player.activityRows
    .filter(
      (row) =>
        row.activity &&
        row.activity !== "Overall" &&
        (row.exp > 0 || row.ehp > 0) &&
        rowMatchesRelevant(row, relevantSlugs, ["category", "activity"])
    )
    .map((row) => ({
      type: "activity",
      source: row.activity,
      category: row.category,
      gained: row.exp || 0,
      gainedLabel: "XP",
      time: row.ehp || 0,
      timeLabel: "EHP"
    }));

  return [...bossRows, ...activityRows];
}

function tileTimeLeaderRows(tile) {
  const rowsByPlayer = new Map();
  state.data.players.forEach((player) => {
    playerRelevantRowsForTile(player, tile).forEach((row) => {
      const existing = rowsByPlayer.get(player.id) || {
        playerId: player.id,
        displayName: player.displayName,
        teamShortName: player.teamShortName,
        teamName: player.teamName,
        teamColor: player.teamColor,
        time: 0,
        kills: 0
      };
      existing.time += row.time || 0;
      existing.kills += row.gained || 0;
      rowsByPlayer.set(player.id, existing);
    });
  });

  return tiedMaxRows([...rowsByPlayer.values()], "time");
}

function tileShareLeaderRows(tile) {
  return tiedMaxRows(tile.contributors || [], "amount");
}

function renderLeaderButtons(rows) {
  return `
    <div class="tile-leader-list">
      ${rows
        .map(
          (row) => `
            <button class="link-button tile-leader-name" type="button" data-player-id="${escapeHtml(row.playerId)}">
              <strong>${escapeHtml(row.displayName)}</strong>
              ${teamBadge(row)}
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderTileLeaders(tile) {
  const timeLeaders = tileTimeLeaderRows(tile);
  const shareLeaders = tileShareLeaderRows(tile);
  const total = tile.contributors.reduce((sum, row) => sum + row.amount, 0);
  const shareValue = shareLeaders[0] && total > 0 ? `${format((shareLeaders[0].amount / total) * 100, 1)}%` : "No share";

  return `
    <div class="tile-leader-grid">
      <section class="tile-leader-card">
        <span>Most time</span>
        ${timeLeaders.length ? renderLeaderButtons(timeLeaders) : `<p>No mapped time yet.</p>`}
        <small>${timeLeaders.length ? `${formatHours(timeLeaders[0].time)} across ${escapeHtml((tile.relevantCategories || []).join(", "))}` : "No mapped time for this tile."}</small>
      </section>
      <section class="tile-leader-card">
        <span>Most tile share</span>
        ${shareLeaders.length ? renderLeaderButtons(shareLeaders) : `<p>No contribution share yet.</p>`}
        <small>${shareLeaders.length ? `${shareValue} of recorded tile contributions` : "No contributors recorded for this tile."}</small>
      </section>
    </div>
  `;
}

function renderTileContributors(tile) {
  const total = tile.contributors.reduce((sum, row) => sum + row.amount, 0);
  return components.table(
    [
      {
        label: "Contributor",
        render: (row) => `
          <button class="link-button" type="button" data-player-id="${escapeHtml(row.playerId)}">
            <strong>${escapeHtml(row.displayName)}</strong>
          </button>
        `
      },
      { label: "Team", render: (row) => teamBadge(row) },
      { label: "Score", render: (row) => format(row.amount, 2) },
      { label: "Share", render: (row) => (total > 0 ? `${format((row.amount / total) * 100, 1)}%` : "0%") }
    ],
    tile.contributors,
    "compact-table"
  );
}

function playerRelevantRowsForTilePage(tile) {
  return state.data.players
    .flatMap((player) =>
      playerRelevantRowsForTile(player, tile).map((row) => ({
        ...row,
        playerId: player.id,
        displayName: player.displayName,
        teamShortName: player.teamShortName,
        teamName: player.teamName,
        teamColor: player.teamColor
      }))
    )
    .sort((a, b) => b.time - a.time || b.gained - a.gained || a.displayName.localeCompare(b.displayName));
}

function renderTileRelevantRows(tile) {
  const allRows = playerRelevantRowsForTilePage(tile);
  const isExpanded = state.expandedTileKcIds.has(tile.id);
  const rows = isExpanded ? allRows : allRows.slice(0, 10);
  if (!rows.length) return `<div class="empty-state">No relevant rows for this tile.</div>`;

  return `
    ${components.table(
      [
        { label: "Player", render: (row) => `<strong>${escapeHtml(row.displayName)}</strong> ${teamBadge(row)}` },
        {
          label: "Source",
          render: (row) => `<strong>${escapeHtml(row.source)}</strong><span class="table-subline">${escapeHtml(row.category)}</span>`
        },
        { label: "Gained", render: (row) => `${format(row.gained, 0)} ${escapeHtml(row.gainedLabel)}` },
        { label: "Time", render: (row) => `${formatHours(row.time)} ${escapeHtml(row.timeLabel)}` }
      ],
      rows,
      "compact-table"
    )}
    ${
      allRows.length > 10
        ? `
          <div class="table-action-row">
            <button class="secondary-action inline-action" type="button" data-toggle-tile-kc="${escapeHtml(tile.id)}">
              ${isExpanded ? "Show top 10" : `Show all ${format(allRows.length, 0)}`}
            </button>
          </div>
        `
        : ""
    }
  `;
}

function buildTileDetail(tileId) {
  const tile = tileById(tileId);
  if (!tile) return `<div class="empty-state">Tile not found.</div>`;

  return `
    <article class="resource-card">
      <div class="resource-media">
        <img src="${escapeHtml(tile.imageUrl)}" alt="${escapeHtml(tile.label)}" />
      </div>
      <div class="resource-body">
        <p class="eyebrow">Tile ${tile.position} - ${tile.isComplete ? "complete" : "open"}</p>
        <div class="resource-title-row">
          <h2>${escapeHtml(tile.label)}</h2>
          <button class="secondary-action inline-action" type="button" data-view-jump="board">Back to Board</button>
        </div>
        ${renderTileTeamSummary(tile)}
        ${renderTileLeaders(tile)}
      </div>
    </article>
    <div class="detail-grid">
      ${components.panel({
        title: "Tile Contributions",
        eyebrow: tile.pointLabel || "tile",
        body: `
          <div class="interlay-stack">
            ${renderTileContributors(tile)}
            <section class="split-boss-section">
              <header class="mini-section-header">
                <h4>Relevant gains</h4>
                <span class="metric-chip">${escapeHtml((tile.relevantCategories || []).join(" / ") || "unmapped")}</span>
              </header>
              ${renderTileRelevantRows(tile)}
            </section>
          </div>
        `
      })}
    </div>
  `;
}

function renderTilePage() {
  qs("#tile-page").innerHTML = buildTileDetail(state.selectedTileId);
}

function bossAsset(boss) {
  return boss.relatedTiles[0]?.imageUrl || "";
}

function renderBossRelatedTiles(boss) {
  if (!boss.relatedTiles.length) return `<div class="empty-state">No mapped board tiles for this boss category.</div>`;

  return `
    <div class="related-tile-grid">
      ${boss.relatedTiles
        .map(
          (tile) => `
            <button class="related-tile-card" type="button" data-board-tile-id="${escapeHtml(tile.id)}">
              <img src="${escapeHtml(tile.imageUrl)}" alt="" loading="lazy" />
              <span>
                <strong>${escapeHtml(tile.pointLabel || tile.label)}</strong>
                <small>Tile ${tile.position} - ${format(tile.total, 2)}/${format(tile.needed, 0)}</small>
              </span>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderBossCard(boss) {
  const imageUrl = bossAsset(boss);
  const categories = boss.categories.join(" / ") || "unmapped";

  return `
    <button class="boss-card" type="button" data-boss-slug="${escapeHtml(boss.slug)}">
      ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="" loading="lazy" />` : ""}
      <span class="boss-card-scrim">
        <strong>${escapeHtml(boss.name)}</strong>
        <small>${escapeHtml(categories)}</small>
      </span>
      <span class="boss-card-stats">
        <span>${format(boss.totalKills, 0)} KC</span>
        <span>${formatHours(boss.totalEhb)}</span>
        <span>${boss.playerRows.length} players</span>
      </span>
    </button>
  `;
}

function renderBosses() {
  qs("#bosses-content").innerHTML = `
    <div class="boss-index-grid">
      ${state.data.bosses.map(renderBossCard).join("")}
    </div>
  `;
}

function renderBossTeamTable(boss) {
  return components.table(
    [
      { label: "Team", render: (row) => teamBadge(row) || `<strong>${escapeHtml(row.teamName || "Unknown")}</strong>` },
      { label: "Players", render: (row) => format(row.playerCount, 0) },
      { label: "KC", render: (row) => format(row.kills, 0) },
      { label: "EHB", render: (row) => formatHours(row.ehb) }
    ],
    boss.teamRows,
    "compact-table"
  );
}

function renderBossPlayerTable(boss) {
  return components.table(
    [
      {
        label: "Player",
        render: (row) => `
          <button class="link-button" type="button" data-player-id="${escapeHtml(row.playerId)}">
            <strong>${escapeHtml(row.displayName)}</strong>
          </button>
          ${teamBadge(row)}
        `
      },
      { label: "KC", render: (row) => format(row.kills, 0) },
      { label: "EHB", render: (row) => formatHours(row.ehb) }
    ],
    boss.playerRows
  );
}

function renderBossPage() {
  const boss = bossBySlug(state.selectedBossSlug);
  if (!boss) {
    qs("#boss-page").innerHTML = `<div class="empty-state">Boss not found.</div>`;
    return;
  }

  const imageUrl = bossAsset(boss);

  qs("#boss-page").innerHTML = `
    <article class="resource-card boss-hero">
      <div class="resource-media">
        ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="" />` : ""}
      </div>
      <div class="resource-body">
        <p class="eyebrow">Boss</p>
        <div class="resource-title-row">
          <div>
            <h2>${escapeHtml(boss.name)}</h2>
            <span class="table-subline">${escapeHtml(boss.categories.join(" / ") || "unmapped")}</span>
          </div>
          <button class="secondary-action inline-action" type="button" data-view-jump="bosses">Back to Bosses</button>
        </div>
        <div class="resource-stats">
          ${components.miniStat({ label: "Total KC", value: format(boss.totalKills, 0) })}
          ${components.miniStat({ label: "Total EHB", value: formatHours(boss.totalEhb) })}
          ${components.miniStat({ label: "Contributors", value: boss.playerRows.length, meta: `${boss.teamRows.length} teams` })}
        </div>
        <section class="boss-related-section">
          <header class="mini-section-header">
            <h4>Related Tiles</h4>
            <span class="metric-chip">${boss.relatedTiles.length ? `${boss.relatedTiles.length} mapped` : "unmapped"}</span>
          </header>
          ${renderBossRelatedTiles(boss)}
        </section>
      </div>
    </article>
    <div class="detail-grid boss-detail-grid">
      ${components.panel({
        title: "Top Players",
        eyebrow: "boss KC and EHB",
        body: renderBossPlayerTable(boss)
      })}
      ${components.panel({
        title: "Team Breakdown",
        eyebrow: "summed rows",
        body: renderBossTeamTable(boss)
      })}
    </div>
  `;
}

function topBossForPlayer(player) {
  return player.bossRows.find((row) => row.ehb > 0 || row.kills > 0) || null;
}

function imageForBossCategory(category) {
  return state.data.tiles.find((tile) => (tile.relevantCategories || []).includes(category))?.imageUrl || "";
}

function playerTileAttributionRows(player) {
  return (player.tileContributions || [])
    .map((contribution) => {
      const tile = tileById(contribution.tileId);
      const contributors = tile?.contributors || [];
      const teamContributors = contributors.filter(
        (row) =>
          (player.teamId && row.teamId === player.teamId) ||
          (player.teamName && row.teamName === player.teamName) ||
          (player.teamShortName && row.teamShortName === player.teamShortName)
      );
      const teamTotal = teamContributors.reduce((sum, row) => sum + (row.amount || 0), 0);
      const total = teamTotal || contributors.reduce((sum, row) => sum + (row.amount || 0), 0);
      return {
        ...contribution,
        tile,
        total,
        share: total > 0 ? (contribution.amount || 0) / total : 0
      };
    })
    .sort((a, b) => b.share - a.share || b.amount - a.amount || (a.pointLabel || a.label).localeCompare(b.pointLabel || b.label));
}

function renderPlayerTileAttributionTiles(player) {
  const rows = playerTileAttributionRows(player);
  if (!rows.length) return "";

  return `
    <section class="player-tile-strip" aria-label="Tile attributions">
      ${rows
        .map((row) => {
          const tile = row.tile;
          const label = row.pointLabel || row.label || tile?.pointLabel || tile?.label || "Tile";
          const tileNumber = tile ? `Tile ${format(tile.position, 0)}` : "Tile";
          const content = `
            ${tile?.imageUrl ? `<img src="${escapeHtml(tile.imageUrl)}" alt="" loading="lazy" />` : ""}
            <span class="player-tile-percent">${format(row.share * 100, 1)}%</span>
            <span class="player-tile-label">${escapeHtml(label)}</span>
            <span class="player-tile-meta">${escapeHtml(tileNumber)}</span>
          `;

          return tile
            ? `<button class="player-tile-chip" type="button" data-board-tile-id="${escapeHtml(tile.id)}">${content}</button>`
            : `<span class="player-tile-chip">${content}</span>`;
        })
        .join("")}
    </section>
  `;
}

function playerBossSortKey(playerId) {
  return state.playerBossSorts.get(playerId) || "kills";
}

function playerBossSortHeader(column, { player, activeSortKey }) {
  const isActive = column.sortKey === activeSortKey;

  return `
    <button
      class="sort-header ${isActive ? "is-active" : ""}"
      type="button"
      data-player-boss-sort="${escapeHtml(player.id)}"
      data-sort-key="${escapeHtml(column.sortKey)}"
      aria-label="Sort ${escapeHtml(player.displayName)} boss rows by ${escapeHtml(column.label)}"
      aria-pressed="${isActive ? "true" : "false"}"
    >
      <span>${escapeHtml(column.label)}</span>
      <span aria-hidden="true">v</span>
    </button>
  `;
}

function sortedPlayerBossRows(player) {
  const activeSortKey = playerBossSortKey(player.id);
  const rows = player.bossRows.filter((row) => (row.kills || 0) > 0 || (row.ehb || 0) > 0);

  return rows.sort((a, b) => {
    if (activeSortKey === "boss") return compareAscending(a.boss, b.boss);
    return compareDescending(a[activeSortKey], b[activeSortKey]) || compareAscending(a.boss, b.boss);
  });
}

function renderPlayerHeader(player) {
  const topBoss = topBossForPlayer(player);
  const topBossImage = topBoss ? imageForBossCategory(topBoss.category) : "";

  return `
    <article class="player-hero" style="--team-color: ${escapeHtml(player.teamColor || "rgba(255,255,255,.4)")};">
      ${topBossImage ? `<img src="${escapeHtml(topBossImage)}" alt="" />` : ""}
      <div class="player-hero-body">
        <p class="eyebrow">Player</p>
        <div class="resource-title-row">
          <div>
            <h2>${escapeHtml(player.displayName)}</h2>
            ${teamBadge(player)}
          </div>
          <span class="badge-row">${player.badges.map(renderBadge).join("")}</span>
        </div>
        <div class="resource-stats">
          ${components.miniStat({ label: "EHB", value: formatHours(player.ehb) })}
          ${components.miniStat({ label: "EHP", value: formatHours(player.ehp) })}
          ${components.miniStat({ label: "Total Player Time", value: formatHours(player.totalTime) })}
          ${components.miniStat({ label: "Tile Score", value: format(player.tileScore, 2), meta: `${player.tileCount} tiles touched` })}
        </div>
        ${
          topBoss
            ? `
              <div class="top-boss-strip">
                <span>Most time spent at</span>
                <strong>${escapeHtml(topBoss.boss)}</strong>
                <small>${formatHours(topBoss.ehb)} EHB, ${format(topBoss.kills, 0)} KC</small>
              </div>
            `
            : ""
        }
        ${renderPlayerTileAttributionTiles(player)}
      </div>
    </article>
  `;
}

function renderPlayerBossTable(player) {
  const activeSortKey = playerBossSortKey(player.id);

  return components.table(
    [
      {
        label: "Boss",
        sortKey: "boss",
        header: playerBossSortHeader,
        render: (row) => `<strong>${escapeHtml(row.boss)}</strong><span class="table-subline">${escapeHtml(row.category)}</span>`
      },
      { label: "KC", sortKey: "kills", header: playerBossSortHeader, render: (row) => format(row.kills, 0) },
      { label: "EHB", sortKey: "ehb", header: playerBossSortHeader, render: (row) => formatHours(row.ehb) }
    ],
    sortedPlayerBossRows(player),
    "",
    { player, activeSortKey }
  );
}

function renderPlayerActivityTable(player) {
  const rows = player.activityRows.filter((row) => row.activity && row.activity !== "Overall" && (row.exp || 0) > 0);
  return components.table(
    [
      { label: "Activity", render: (row) => `<strong>${escapeHtml(row.activity)}</strong><span class="table-subline">${escapeHtml(row.category)}</span>` },
      { label: "XP", render: (row) => format(row.exp, 0) },
      { label: "Levels", render: (row) => format(row.levels, 0) },
      { label: "EHP", render: (row) => formatHours(row.ehp) }
    ],
    rows
  );
}

function renderPlayerPage() {
  const player = playerById(state.selectedPlayerId);
  if (!player) {
    qs("#player-page").innerHTML = `<div class="empty-state">Player not found.</div>`;
    return;
  }

  qs("#player-page").innerHTML = `
    ${renderPlayerHeader(player)}
    <div class="detail-grid">
      ${components.panel({
        title: "Boss KC and EHB",
        eyebrow: "positive boss rows",
        body: renderPlayerBossTable(player)
      })}
      ${components.panel({
        title: "Activity XP and EHP",
        eyebrow: "positive skill rows",
        body: renderPlayerActivityTable(player)
      })}
    </div>
  `;
}

function bindDelegatedActions() {
  document.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view-jump]");
    if (viewButton) {
      event.preventDefault();
      navigateToView(viewButton.dataset.viewJump);
      return;
    }

    const teamToggle = event.target.closest("[data-team-toggle]");
    if (teamToggle) {
      const teamId = teamToggle.dataset.teamToggle;
      const panel = teamToggle.closest(".team-panel");
      const shouldExpand = state.collapsedTeamIds.has(teamId);

      if (shouldExpand) {
        state.collapsedTeamIds.delete(teamId);
      } else {
        state.collapsedTeamIds.add(teamId);
      }

      panel?.classList.toggle("is-collapsed", !shouldExpand);
      teamToggle.setAttribute("aria-expanded", shouldExpand ? "true" : "false");
      return;
    }

    const playerButton = event.target.closest("[data-player-id]");
    if (playerButton) {
      navigateToPlayer(playerButton.dataset.playerId);
      return;
    }

    const rosterSortButton = event.target.closest("[data-team-roster-sort]");
    if (rosterSortButton) {
      const teamId = rosterSortButton.dataset.teamRosterSort;
      state.teamRosterSorts.set(teamId, rosterSortButton.dataset.sortKey);
      renderTeams();
      return;
    }

    const playersSortButton = event.target.closest("[data-players-sort]");
    if (playersSortButton) {
      state.playersSortKey = playersSortButton.dataset.playersSort;
      renderPlayers();
      return;
    }

    const playerBossSortButton = event.target.closest("[data-player-boss-sort]");
    if (playerBossSortButton) {
      state.playerBossSorts.set(playerBossSortButton.dataset.playerBossSort, playerBossSortButton.dataset.sortKey);
      renderPlayerPage();
      return;
    }

    const tileKcToggle = event.target.closest("[data-toggle-tile-kc]");
    if (tileKcToggle) {
      const tileId = tileKcToggle.dataset.toggleTileKc;
      if (state.expandedTileKcIds.has(tileId)) {
        state.expandedTileKcIds.delete(tileId);
      } else {
        state.expandedTileKcIds.add(tileId);
      }
      renderTilePage();
      return;
    }

    const bossButton = event.target.closest("[data-boss-slug]");
    if (bossButton) {
      navigateToBoss(bossButton.dataset.bossSlug);
      return;
    }

    const tileButton = event.target.closest("[data-board-tile-id]");
    if (tileButton) {
      navigateToTile(tileButton.dataset.boardTileId);
    }
  });
}

function normalizePath() {
  const currentPath = window.location.pathname.replace(/\/index\.html$/, "");
  const path =
    appBasePath && currentPath.startsWith(appBasePath)
      ? currentPath.slice(appBasePath.length) || "/"
      : currentPath.replace(/^\/wrapped(?=\/|$)/, "") || "/";
  return path.length > 1 ? path.replace(/\/$/, "") : path;
}

function restoreGitHubPagesRedirect() {
  const params = new URLSearchParams(window.location.search);
  const redirectPath = params.get("redirect");
  if (!redirectPath || !redirectPath.startsWith("/")) return;

  const redirectUrl = new URL(redirectPath, window.location.origin);
  history.replaceState({}, "", `${withBasePath(redirectUrl.pathname)}${redirectUrl.search}${redirectUrl.hash}`);
}

function routeForView(viewName) {
  return withBasePath(viewRoutes[viewName] || "/");
}

function routeToState() {
  const path = normalizePath();

  if (path.startsWith("/players/")) {
    state.selectedPlayerId = path.replace(/^\/players\//, "");
    renderPlayerPage();
    activateView("player-page", { updateRoute: false });
    return;
  }

  if (path.startsWith("/bosses/")) {
    state.selectedBossSlug = path.replace(/^\/bosses\//, "");
    renderBossPage();
    activateView("boss-page", { updateRoute: false });
    return;
  }

  if (path.startsWith("/board/")) {
    const tileId = tileIdForSlug(path.replace(/^\/board\//, ""));
    if (tileId) {
      state.selectedTileId = tileId;
      renderTilePage();
      activateView("tile-page", { updateRoute: false });
      return;
    }
  }

  const viewName = Object.entries(viewRoutes).find(([, route]) => route === path)?.[0];
  if (viewName) {
    activateView(viewName, { updateRoute: false });
    return;
  }

  if (path === "/tiles") {
    activateView("board", { updateRoute: false });
    return;
  }

  activateView("overview", { updateRoute: false });
}

function navigateToView(viewName) {
  history.pushState({}, "", routeForView(viewName));
  activateView(viewName, { updateRoute: false });
}

function navigateToPlayer(playerId) {
  state.selectedPlayerId = playerId;
  history.pushState({}, "", playerPath(playerId));
  renderPlayerPage();
  activateView("player-page", { updateRoute: false });
}

function navigateToTile(tileId) {
  state.selectedTileId = tileId;
  history.pushState({}, "", tilePath(tileId));
  renderTilePage();
  activateView("tile-page", { updateRoute: false });
}

function navigateToBoss(bossSlug) {
  state.selectedBossSlug = bossSlug;
  history.pushState({}, "", bossPath(bossSlug));
  renderBossPage();
  activateView("boss-page", { updateRoute: false });
}

function activateView(viewName, options = {}) {
  if (options.updateRoute !== false && viewName !== "tile-page" && viewName !== "player-page" && viewName !== "boss-page") {
    history.pushState({}, "", routeForView(viewName));
  }

  const activeTabView =
    viewName === "tile-page" ? "board" : viewName === "player-page" ? "players" : viewName === "boss-page" ? "bosses" : viewName;
  qsa("[data-view]").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.view === activeTabView));
  qsa(".view").forEach((view) => view.classList.remove("is-active"));
  qs(`#${viewName}-view`)?.classList.add("is-active");
}

function bindTabs() {
  qsa("[data-view]").forEach((button) => {
    button.addEventListener("click", () => navigateToView(button.dataset.view));
  });

  window.addEventListener("popstate", routeToState);
}

function renderAll() {
  renderOverview();
  renderTeams();
  renderPlayers();
  renderBoard();
  renderBosses();
  bindTabs();
  bindDelegatedActions();
  restoreGitHubPagesRedirect();
  routeToState();
}

function hasBossValue(row) {
  return Boolean(row?.boss) && ((row.kills || 0) > 0 || (row.ehb || 0) > 0);
}

function isMappedCategory(category) {
  const slug = slugify(category);
  return Boolean(slug) && slug !== "none" && slug !== "unmapped";
}

function relatedTilesForBoss(boss, tiles) {
  const categorySlugs = new Set(boss.categories.filter(isMappedCategory).map(slugify));
  const bossNameSlug = slugify(boss.name);

  return tiles
    .filter((tile) => {
      const tileCategories = (tile.relevantCategories || []).filter(isMappedCategory);
      const hasCategoryMatch = tileCategories.some((category) => categorySlugs.has(slugify(category)) || slugify(category) === bossNameSlug);
      const hasLabelMatch = [tile.label, tile.pointLabel].some((label) => slugify(label) === bossNameSlug);
      return hasCategoryMatch || hasLabelMatch;
    })
    .sort((a, b) => a.position - b.position || (a.pointLabel || a.label).localeCompare(b.pointLabel || b.label));
}

function buildBossSummaries(eventResults) {
  const bossesByName = new Map();
  const usedSlugs = new Set();

  function bossRecord(name) {
    if (bossesByName.has(name)) return bossesByName.get(name);

    const baseSlug = slugify(name);
    let slug = baseSlug;
    let suffix = 2;
    while (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
    usedSlugs.add(slug);

    const boss = {
      name,
      slug,
      categories: new Set(),
      totalKills: 0,
      totalEhb: 0,
      playerRowsById: new Map(),
      teamRowsById: new Map()
    };
    bossesByName.set(name, boss);
    return boss;
  }

  for (const player of eventResults.players) {
    for (const row of player.bossRows || []) {
      if (!hasBossValue(row)) continue;

      const boss = bossRecord(row.boss);
      const kills = row.kills || 0;
      const ehb = row.ehb || 0;
      const category = row.category || "Unmapped";

      boss.categories.add(category);
      boss.totalKills += kills;
      boss.totalEhb += ehb;

      const playerRow = boss.playerRowsById.get(player.id) || {
        playerId: player.id,
        displayName: player.displayName,
        teamId: player.teamId,
        teamName: player.teamName,
        teamShortName: player.teamShortName,
        teamColor: player.teamColor,
        kills: 0,
        ehb: 0,
        bestRank: -1
      };
      playerRow.kills += kills;
      playerRow.ehb += ehb;
      if (row.rank > 0 && (playerRow.bestRank < 0 || row.rank < playerRow.bestRank)) {
        playerRow.bestRank = row.rank;
      }
      boss.playerRowsById.set(player.id, playerRow);

      const teamId = player.teamId || player.teamName || "unknown";
      const teamRow = boss.teamRowsById.get(teamId) || {
        teamId: player.teamId,
        teamName: player.teamName || "Unknown",
        teamShortName: player.teamShortName || player.teamName || "Unknown",
        teamColor: player.teamColor,
        playerIds: new Set(),
        kills: 0,
        ehb: 0
      };
      teamRow.playerIds.add(player.id);
      teamRow.kills += kills;
      teamRow.ehb += ehb;
      boss.teamRowsById.set(teamId, teamRow);
    }
  }

  const bosses = [...bossesByName.values()]
    .map((boss) => {
      const playerRows = [...boss.playerRowsById.values()]
        .map((row) => ({ ...row, ehb: Number(row.ehb.toFixed(2)) }))
        .sort((a, b) => b.ehb - a.ehb || b.kills - a.kills || a.displayName.localeCompare(b.displayName));
      const teamRows = [...boss.teamRowsById.values()]
        .map((row) => ({
          ...row,
          playerCount: row.playerIds.size,
          ehb: Number(row.ehb.toFixed(2))
        }))
        .sort((a, b) => b.ehb - a.ehb || b.kills - a.kills || a.teamName.localeCompare(b.teamName));

      return {
        name: boss.name,
        slug: boss.slug,
        categories: [...boss.categories].sort((a, b) => a.localeCompare(b)),
        totalKills: Math.round(boss.totalKills),
        totalEhb: Number(boss.totalEhb.toFixed(2)),
        playerRows,
        teamRows,
        relatedTiles: relatedTilesForBoss(
          {
            name: boss.name,
            categories: [...boss.categories]
          },
          eventResults.tiles
        )
      };
    })
    .filter((boss) => boss.relatedTiles.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    bosses,
    bossesBySlug: new Map(bosses.map((boss) => [boss.slug, boss]))
  };
}

function topTeamPlayer(players, primaryKey, secondaryKey) {
  return players
    .filter((player) => (player[primaryKey] || 0) > 0)
    .toSorted(
      (a, b) =>
        (b[primaryKey] || 0) - (a[primaryKey] || 0) ||
        (b[secondaryKey] || 0) - (a[secondaryKey] || 0) ||
        a.displayName.localeCompare(b.displayName)
    )[0];
}

function normalizeEventResults(eventResults) {
  const tileCategoryOverrides = {
    "Pet": [],
    "Big Fish": ["Fishing"],
    "Rev Totem": [],
    "1m Clue": [],
    "DHW": [],
    "Jar": [
      "Kraken",
      "Zulrah",
      "Kalphite Queen",
      "Cerberus",
      "Abyssal Sire",
      "Skotizo",
      "Grotesque Guardians",
      "Vorkath",
      "Alchemical Hydra",
      "Sarachnis",
      "Nightmare",
      "Corporeal Beast",
      "Thermonuclear Smoke Devil",
      "Araxxor"
    ],
    "Champ Scroll": [],
    "BA Gambles": [],
    "Tomes": ["Wintertodt", "Tempoross", "Huey"],
    "Bottled Storm": ["Sailing"],
    "Dragon Limbs": [],
    "Cudgel": ["Sarachnis", "Kalphite Queen", "Thermonuclear Smoke Devil"]
  };

  const players = eventResults.players.map((player) => ({
    ...player,
    badges: (player.badges || []).filter((badge) => badge !== "MVP" && badge !== "Grinder")
  }));
  const playersById = new Map(players.map((player) => [player.id, player]));
  const tiles = eventResults.tiles.map((tile) => ({
    ...tile,
    relevantCategories: tileCategoryOverrides[tile.pointLabel] ?? (tile.relevantCategories || []).filter(isMappedCategory)
  }));

  const teams = eventResults.teams
    .map((team) => ({
      ...team,
      tileScore: hardcodedTeamTileScores.get(team.name) ?? team.tileScore
    }))
    .map((team) => {
      const teamPlayers = team.roster.map((playerId) => playersById.get(playerId)).filter(Boolean);
      const mvp = topTeamPlayer(teamPlayers, "tileScore", "tileCount");
      const grinder = topTeamPlayer(teamPlayers, "totalTime", "tileScore");

      if (mvp && !mvp.badges.includes("MVP")) mvp.badges.push("MVP");
      if (grinder && !grinder.badges.includes("Grinder")) grinder.badges.push("Grinder");

      return {
        ...team,
        mvpPlayerId: mvp?.id || team.mvpPlayerId,
        grinderPlayerId: grinder?.id || team.grinderPlayerId
      };
    })
    .sort((a, b) => b.tileScore - a.tileScore || a.name.localeCompare(b.name))
    .map((team, index) => ({ ...team, rank: index + 1 }));

  return {
    ...eventResults,
    players,
    tiles,
    teams,
    summary: {
      ...eventResults.summary,
      teamsByTileScore: teams
    }
  };
}

async function init() {
  try {
    const eventResults = normalizeEventResults(await loadJson(paths.eventResults));
    const bossSummaries = buildBossSummaries(eventResults);

    state.data = {
      ...eventResults,
      ...bossSummaries,
      teamsById: new Map(eventResults.teams.map((team) => [team.id, team])),
      playersById: new Map(eventResults.players.map((player) => [player.id, player])),
      tilesById: new Map(eventResults.tiles.map((tile) => [tile.id, tile]))
    };
    state.selectedTileId = eventResults.tiles[0]?.id || null;

    renderAll();
  } catch (error) {
    document.body.innerHTML = `<main class="app-shell"><article class="glass-panel"><div class="empty-state">${escapeHtml(error.message)}</div></article></main>`;
  }
}

init();
