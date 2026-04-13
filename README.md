# coros-api-mcp

A Node.js toolkit for pulling your COROS training data and using it with an AI agent — for coaching summaries, training load analysis, lap/split breakdowns, and proactive nudges.

> ⚠️ This uses the **non-public COROS API** (reverse-engineered from the [COROS Training Hub](https://t.coros.com/) web app). It could break at any time if COROS changes their backend. Use accordingly.

Built on top of the excellent [coros-connect](https://github.com/jmn8718/coros-connect) library.

---

## What's in here

| File | Purpose |
|---|---|
| `coach-fetch.mjs` | Main coaching script — pulls activities, lap splits, training load, zones, and prints a coaching report |
| `fetch-data.mjs` | Quick debug script — login + raw JSON dump of your latest activities |
| `fetch.sh` | Shell wrapper for `coach-fetch.mjs` (useful for cron/heartbeat) |
| `src/` | Extended library source (EvoLab/analyse endpoint) |

---

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Add your credentials

```bash
cp coros.config.json.example coros.config.json
# Edit coros.config.json with your COROS email + password
```

> `coros.config.json` is gitignored — your credentials stay local.

### 3. Run the coaching report

```bash
node coach-fetch.mjs
```

Example output:
```
=== COROS COACHING REPORT ===
Date: 2026-04-13
Athlete: Rich | 186cm | 80.4kg
Max HR: 194 | RHR: 49

--- LAST 7 DAYS (4 activities, load: 287) ---
  [20260411] Outdoor Run: 8.50km in 52m | HR avg 148 @ 6:08/km | load 89
  [20260410] Strength: 0.00km in 45m | HR avg 112 | load 41
  ...

--- RECENT RUNS (last 5) ---
  [20260411] 8.50km in 52m | pace 6:08/km | HR 148 | load 89
    📏 KM SPLITS (9 laps):
      Lap 1: pace 6:22/km | HR avg 138 / max 155 | cadence 172
      Lap 2: pace 6:05/km | HR avg 151 / max 161 | cadence 175
      ...
  [20260408] 6.20km in 38m | pace 6:09/km | HR 152 | load 71
    ⚡ INTERVAL BREAKDOWN (6 reps):
      Rep 1: pace 4:55/km | HR avg 168 / max 178 | cadence 182 | dist 1.00km
      ...

--- ZONES ---
  LTHR: 171 | LT pace: 5:01/km
  FTP (cycling): 180W

--- COACHING NOTES ---
  ⚠️ Only 2 run(s) this week. Aim for 3-4 to drive VO2max adaptations.
  ✅ Training load in healthy range (287).
  📊 LT pace 5:01/km → estimated VO2max ~47
```

---

## EvoLab data (training load, HRV, fatigue)

This repo also includes a reverse-engineered `/analyse/query` endpoint that exposes COROS's EvoLab metrics — data not available through the standard activity list:

- Daily training load, fatigue rate, workload ratio
- Resting heart rate trends
- Sleep HRV and HRV baseline
- Sport-by-sport weekly breakdowns
- Recommended weekly load ranges

```typescript
import { CorosApi } from 'coros-connect';

const coros = new CorosApi();
await coros.login();

const evoLab = await coros.getEvoLabData();
// evoLab.dayList    — daily metrics (84 days)
// evoLab.weekList   — weekly summaries
// evoLab.sportStatistic — per-sport breakdown
```

See `src/CorosApi.ts` and `src/types/index.ts` for the full implementation.

---

## AI Agent Integration

This is where it gets interesting. The coaching script was built to be consumed by an AI agent — either on a schedule or triggered by a heartbeat. Here's how to wire it up.

### How it works

1. A cron job or heartbeat periodically runs `fetch.sh` (which calls `coach-fetch.mjs`)
2. The script outputs a structured coaching report to stdout
3. The AI agent reads the output, interprets it, and sends a coaching message to the user

### Agent prompt (HEARTBEAT.md)

If you're using [OpenClaw](https://openclaw.ai) or a similar agent framework that supports heartbeats, add this to your `HEARTBEAT.md`:

```markdown
## Coros Training Check (every 2 days)
- Run: /path/to/coros-api-mcp/fetch.sh
- Compare to last check in memory/coaching-state.json
- If new activities since last check → send athlete a coaching update
- If no runs in 3+ days → nudge athlete to get a run in
- Track last check timestamp in memory/coaching-state.json
- ANTI-SPAM: Check `lastNudgeSent`. If it equals today's date (YYYY-MM-DD), skip. One nudge per day max.
```

### Coaching state tracking

Keep a `coaching-state.json` to avoid duplicate nudges:

```json
{
  "lastChecked": "2026-04-13",
  "lastActivityId": "abc123",
  "lastNudgeSent": "2026-04-12",
  "activitiesSeen": []
}
```

### System prompt for the agent

To make the AI act as a real coach (not just a data reader), give it context like this:

```
You are a running and triathlon coach. You have access to the athlete's COROS training data.

Athlete profile:
- Goals: sub-3h half marathon, 70.3 Ironman
- Current level: recreational runner, building base
- Key metrics: LTHR 171, LT pace ~5:01/km, FTP 180W, Max HR 194, RHR 49
- VO2max target: improve from ~42 to 50+

When reviewing training data:
1. Check running frequency first (target: 3-4 runs/week)
2. Flag if weekly load is too low (<100) or unsustainable (>500)
3. For interval sessions, assess whether paces are on target
4. For easy runs, check if HR stayed below LTHR (aerobic base building)
5. Give one clear, actionable recommendation per check-in
6. Keep messages short and direct — athletes don't want essays

Tone: coach who cares but doesn't sugarcoat. Brief. Specific. Encouraging when earned.
```

### OpenClaw cron example

If you're using OpenClaw with an isolated agent session:

```json
{
  "schedule": { "kind": "every", "everyMs": 172800000 },
  "payload": {
    "kind": "agentTurn",
    "message": "Run /path/to/coros-api-mcp/fetch.sh and interpret the coaching report. Send a brief coaching update to [your channel]. Check coaching-state.json first — skip if already nudged today."
  },
  "sessionTarget": "isolated"
}
```

---

## Token reuse

The COROS API rate-limits logins aggressively. `coach-fetch.mjs` automatically caches your access token in `.coros-token/` and reuses it on subsequent runs. The folder is gitignored.

If you get 401 errors, delete `.coros-token/` and let it re-authenticate.

---

## Reverse engineering notes

See `revers-eng-api.md` for notes on how the EvoLab endpoint was discovered (browser DevTools + network inspection). If you want to extend this to health endpoints (sleep, HRV, SpO2), that doc explains the approach.

---

## Inspired by

- [garmin-connect](https://github.com/Pythe1337N/garmin-connect)
- [coros-api](https://github.com/xalloy/coros-api)
- [coros-connect](https://github.com/jmn8718/coros-connect) — the underlying library this builds on

---

## License

MIT
