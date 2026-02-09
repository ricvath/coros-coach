# Session: 2026-02-08

## What we did

### 1. Mapped the codebase

Ran `/gsd:map-codebase` with 4 parallel agents to produce structured analysis documents in `.planning/codebase/`:

- STACK.md — TypeScript/Node.js library using ky, axios, AWS SDK, JSZip
- ARCHITECTURE.md — Single-class SDK wrapping COROS Training Hub API
- STRUCTURE.md — Flat `src/` layout with utils, types, config
- CONVENTIONS.md — Biome formatting, error patterns, naming conventions
- TESTING.md — No tests exist (identified as gap)
- INTEGRATIONS.md — COROS API, AWS S3 for file uploads, STS credentials
- CONCERNS.md — Tech debt including date filter bug, mixed HTTP clients, hardcoded API keys

### 2. Reverse-engineered the EvoLab endpoint

Discovered `/analyse/query` by inspecting the COROS web app's Network tab.

Key findings:
- It's a **GET** request (not POST like most other endpoints)
- Requires `accesstoken` header (lowercase) and a `yfheader` JSON header containing `{ userId }`
- Returns 84 days of training/health metrics including:
  - Daily training load, fatigue rate, workload ratio
  - Resting heart rate
  - Sleep HRV and HRV baseline
  - Sport-by-sport breakdown (type, count, duration, load)
  - Weekly summaries with recommended load ranges

### 3. Added `getEvoLabData()` to the library

Added a proper method to the `CorosApi` class:

**Files changed:**
- `src/CorosApi.ts` — Added `_userId` field, stored on login/getAccount, added `getEvoLabData()` method
- `src/types/index.ts` — Added `AnalyseData`, `AnalyseDayData`, `AnalyseSportStatistic`, `AnalyseWeekData`, `AnalyseResponse` types

**Usage:**
```typescript
const coros = new CorosApi();
await coros.login();
const evoLab = await coros.getEvoLabData();
// evoLab.dayList — daily metrics (RHR, HRV, training load, fatigue)
// evoLab.sportStatistic — per-sport breakdown
// evoLab.weekList — weekly load summaries
```

**Tested and confirmed working** — returns real data.

## Next steps

- **Discover more health endpoints** (sleep details, SpO2, daily health) using phone proxy (mitmproxy/Charles) since these may not be exposed in the web app
- **Build MCP server** around coros-connect so Claude Desktop can query training/health data on demand
- **Implement local cache layer** to avoid session invalidation and rate limits — sync periodically, serve from cache
- **Commit the library changes** once endpoint exploration is complete
