# Bingo Wrapped Spinoff Workspace

This directory is an independent workspace for the stat-and-impact focused
bingo wrapped site.

## Contents

- `docs/`: copied planning documents for the spinoff.
- `data/source/`: stable source data copied from the current tracker.
- `data/contribution-matrices/`: team-filled tile contribution sheets.
- `data/wom/`: Wise Old Man group builder outputs and roster context.
- `data/wrapped/`: target location for generated wrapped-site JSON.
- `wrapped/`: browser POC for inspecting generated wrapped data.
- `assets/reference/`: visual references for the design system.
- `assets/game/`: local reuse/cache area for existing bingo site game assets.

## Browser POC

Start a local static server from this workspace root:

```powershell
node scripts\serve-static.mjs 4174
```

Then open:

```text
http://127.0.0.1:4174/wrapped/
```

The current POC loads the generated Team Bill contribution metrics, the
Oathplate, Nightmare/PNM, and Doom tile classifications, and Team Bill WOM boss
gains for June 11, 2026 9:30 PM to June 20, 2026 noon in America/Denver.

Optional multi-account POC assignments live in
`data/wom/poc-account-assignments.json`. Add an enabled assignment there, then
rerun:

```powershell
node scripts\fetch-wom-boss-snapshot.mjs --team "Team Bill" --all --out data\wrapped\poc-team-bill-boss-snapshot.json
```

The generated snapshot rolls all accounts into the same participant row.

## Working Backlog

The canonical project todolist lives in `docs/PROJECT_TODOLIST.md`. It tracks
completed POC work, remaining production work, supporting artifacts, and items
that require user/manual action.

## Initial Build Direction

Phase 1 should focus on resource-style stat pages:

- `/`
- `/teams`
- `/teams/:teamId`
- `/players`
- `/players/:playerId`
- `/participants`
- `/participants/:participantId`
- `/bosses`
- `/bosses/:bossId`
- `/activities`
- `/activities/:activityId`
- `/skills`
- `/skills/:skillId`
- `/tiles`
- `/tiles/:tileId`
- `/awards`

The story experience is deferred to `/story`; see `docs/STORY_PLAN.md`.

## First Action Items

1. Fill out Team Backs, Team Don, and Team Helbrass contribution matrices using
   `data/contribution-matrices/team-bill.csv` as the model.
2. Reconcile contribution-matrix participant names against `data/wom/participants.json`.
3. Create `data/wrapped/tile-classification.json`.
4. Create `data/wrapped/asset-manifest.json`.
5. Add import/generator scripts once the data contracts settle.
