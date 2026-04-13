# Coros Coach

A Node.js toolkit for pulling your COROS training data and using it with an AI agent — for coaching summaries, training load analysis, lap/split breakdowns, and proactive nudges.

---

## Before you start — requirements

### 1. 🏃 A COROS smartwatch

You need an active COROS account with training data synced to it. If you don't own one yet, the [Pace 3](https://www.coros.com/pace3), [Pace 4](https://www.coros.com/pace4), and [Pace Pro](https://www.coros.com/pacepro) are the best value options for runners.

### 2. 🤖 OpenClaw installed

This toolkit is designed to be used with an OpenClaw AI agent. If you haven't set that up yet — **[do that first](https://github.com/openclaw/openclaw)**. Everything below assumes you have a working OpenClaw agent.

### 3. ✨ Let your agent set it up for you

Once OpenClaw is running, the easiest way to get started is to paste this into your agent:

> *"Set up the coros-coach skill from https://github.com/ricvath/coros-api-mcp — clone the repo, install it, add my credentials, wire up the heartbeat, and run a test coaching report."*

Your agent will handle the rest.

---

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

--- HEALTH METRICS (EvoLab) ---
  VO2max: 49 ml/kg/min (as of 20260412)
  Aerobic Stamina: 75.4 | 7d target: 98%
  Sleep HRV: 46ms avg | baseline: 47ms → ⚠️ slightly below baseline
  HRV trend (4 nights): 20260409: 45ms | 20260410: 43ms | 20260411: 44ms | 20260412: 46ms
  RHR avg (7 days): 49bpm

--- ZONES ---
  LTHR: 171 | LT pace: 5:01/km
  FTP (cycling): 180W

--- COACHING NOTES ---
  ⚠️ Only 2 run(s) this week. Aim for 3-4 to drive VO2max adaptations.
  ✅ Training load in healthy range (287).
  ✅ HRV above baseline — body is ready for quality training.
  📊 VO2max: 49 ml/kg/min (COROS estimate, last updated 20260412)
```

---

## EvoLab data (HRV, VO2max, training load, fatigue, stamina)

This repo includes a reverse-engineered `/analyse/query` endpoint that exposes COROS's EvoLab metrics — rich health and readiness data not available in the standard activity list.

### What's in there (per day, ~84 days of history)

| Field | Description |
|---|---|
| `rhr` | Resting heart rate (bpm) |
| `tib` | Time in bed (hours; negative = data anomaly, treat as 0) |
| `avgSleepHrv` | Average overnight HRV (ms) |
| `sleepHrvBase` | 30-day rolling HRV baseline (ms) |
| `sleepHrvIntervalList` | HRV zone boundaries `[low, mid, high, max]` |
| `vo2max` | VO2max estimate (ml/kg/min) — present on fitness test days |
| `staminaLevel` | Aerobic stamina score (0–100) |
| `staminaLevel7d` | 7-day stamina vs target (%) |
| `trainingLoad` | Daily training load |
| `tiredRateNew` | Fatigue index (negative = fresh, positive = fatigued) |
| `tiredRateStateNew` | Fatigue state (1=very fresh → 5=overreaching) |
| `trainingLoadRatio` | Load ratio vs chronic load (optimal ~0.8–1.5) |
| `lthr` | Lactate threshold HR — present after a fitness test |
| `ltsp` | Lactate threshold pace (s/km) — present after a fitness test |

> **Note on `tib`:** Negative values appear for some days due to timezone handling in the COROS backend. Ignore negative `tib` values (use `d.tib > 0` to filter).

### HRV interpretation

COROS stores 30-day HRV baseline in `sleepHrvBase`. Compare `avgSleepHrv` to it:
- `avgSleepHrv >= sleepHrvBase` → recovered, ready for hard training
- `avgSleepHrv >= sleepHrvBase * 0.9` → slightly suppressed, moderate training OK
- `avgSleepHrv < sleepHrvBase * 0.9` → well below baseline, prioritise recovery

The `sleepHrvIntervalList` is a 4-element array of HRV zone boundaries used by the COROS app UI.

```typescript
import { CorosApi } from 'coros-connect';

const coros = new CorosApi();
await coros.login();

const evoLab = await coros.getEvoLabData();
// evoLab.dayList       — daily health + training metrics (~84 days)
// evoLab.weekList      — weekly load summaries
// evoLab.sportStatistic — per-sport breakdown

// Example: last 14 days of HRV
const recentHrv = evoLab.dayList
  .slice(-14)
  .filter(d => d.avgSleepHrv && d.tib > 0)
  .map(d => ({ date: d.happenDay, hrv: d.avgSleepHrv, baseline: d.sleepHrvBase, rhr: d.rhr }));

console.log(recentHrv);
```

### What's NOT available via web API

Despite being visible in the COROS mobile app, the following are **not exposed through the web API** (`teamapi.coros.com`):

- SpO2 (blood oxygen) — mobile app only
- Detailed sleep stages (deep/light/REM breakdown) — mobile app only
- Step count / daily activity (calories, steps) — mobile app only
- Continuous HR monitoring data — mobile app only

These endpoints return HTTP 500 from the web gateway regardless of parameters. If you want this data, you'd need to proxy the COROS mobile app (see `revers-eng-api.md` for the approach).

See `src/CorosApi.ts` and `src/types/index.ts` for the full typed implementation.

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
