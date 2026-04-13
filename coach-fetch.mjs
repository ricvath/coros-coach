/**
 * Coros Coach Fetch — pulls recent training data and emits a coaching summary.
 *
 * Used by an AI agent (heartbeat/cron) to assess training progress and send
 * coaching nudges. Can also be run manually: node coach-fetch.mjs
 *
 * Setup:
 *   1. Copy coros.config.json.example → coros.config.json and fill in credentials
 *   2. npm install
 *   3. node coach-fetch.mjs
 */
import { CorosApi, STSConfigs } from 'coros-connect';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'https://teamapi.coros.com';
const TOKEN_FILE = join(__dirname, '.coros-token', 'token.txt');
const TOKEN_DIR = join(__dirname, '.coros-token');

// Load credentials from coros.config.json (gitignored — never commit credentials)
let EMAIL, PASS;
try {
  const config = JSON.parse(readFileSync(join(__dirname, 'coros.config.json'), 'utf8'));
  EMAIL = config.email;
  PASS = config.password;
} catch {
  console.error('❌ Missing coros.config.json — copy coros.config.json.example and fill in your credentials.');
  process.exit(1);
}

const SPORT_LABELS = {
  100: 'Outdoor Run', 101: 'Indoor Run', 102: 'Trail Run',
  200: 'Outdoor Ride', 201: 'Indoor Ride',
  300: 'Open Water Swim', 301: 'Pool Swim',
  400: 'Gym Cardio', 402: 'Strength',
  500: 'Ski', 501: 'Snowboard',
  900: 'Walk', 901: 'Hike',
};

function paceStr(seconds) {
  if (!seconds || seconds <= 0) return '-';
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}/km`;
}
function distKm(m) { return (m / 1000).toFixed(2) + 'km'; }
function durStr(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}m` : `${m}m`;
}

async function api(path, token, opts = {}) {
  const { method = 'GET', params, body, extraHeaders = {} } = opts;
  let url = `${BASE}/${path}`;
  if (params) url += '?' + new URLSearchParams(params).toString();
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: { accessToken: token, 'Content-Type': 'application/json', ...extraHeaders },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (e) {
    console.error('\n❌ Network error — are you connected to the internet?');
    console.error('   Detail:', e.message);
    process.exit(1);
  }
  if (res.status === 429) {
    console.error('\n⚠️ COROS is rate limiting — too many requests. Try again in a few minutes.');
    process.exit(1);
  }
  return res.json();
}

async function login() {
  const pwd = createHash('md5').update(PASS).digest('hex');
  let res;
  try {
    res = await fetch(`${BASE}/account/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: EMAIL, accountType: 2, pwd }),
    });
  } catch (e) {
    console.error('\n❌ Network error — are you connected to the internet?');
    console.error('   Detail:', e.message);
    process.exit(1);
  }
  if (res.status === 429) {
    console.error('\n⚠️ COROS is rate limiting — too many requests. Try again in a few minutes.');
    process.exit(1);
  }
  const j = await res.json();
  if (j.result !== '0000') {
    console.error('\n❌ Login failed — check your email and password in coros.config.json');
    console.error('   COROS said:', j.message);
    process.exit(1);
  }
  return j.data;
}

async function run() {
  // Token management — reuse if valid, refresh on 1019
  let token, profile;

  if (existsSync(TOKEN_FILE)) {
    token = readFileSync(TOKEN_FILE, 'utf8').trim();
    const check = await api('account/query', token);
    if (check.result === '0000') {
      profile = check.data;
    } else {
      // Token expired (e.g. you logged into the COROS app/website) — re-login silently
      profile = await login();
      token = profile.accessToken;
      mkdirSync(TOKEN_DIR, { recursive: true });
      writeFileSync(TOKEN_FILE, token);
    }
  } else {
    profile = await login();
    token = profile.accessToken;
    mkdirSync(TOKEN_DIR, { recursive: true });
    writeFileSync(TOKEN_FILE, token);
  }

  if (!profile || !profile.userId) {
    console.error('\n❌ Could not load your COROS profile. Try deleting .coros-token/ and running again.');
    process.exit(1);
  }

  const userId = profile.userId;

  // Fetch activities and EvoLab in parallel
  let activitiesRes, evoLabRes;
  try {
    [activitiesRes, evoLabRes] = await Promise.all([
      api('activity/query', token, { params: { size: 20, pageNumber: 1 } }),
      fetch(`${BASE}/analyse/query`, {
        headers: { accesstoken: token, yfheader: JSON.stringify({ userId }) },
      }).then(r => r.json()).catch(() => null),
    ]);
  } catch (e) {
    console.error('\n❌ Failed to fetch training data from COROS.');
    console.error('   Detail:', e.message);
    process.exit(1);
  }

  const list = activitiesRes?.data?.dataList || [];

  if (list.length === 0) {
    console.log('⚠️ No activities found. Make sure your COROS watch has synced recently.');
  }
  const evoLab = evoLabRes?.data ?? null;

  // Categorize last 7 days
  const now = Date.now() / 1000;
  const week = list.filter(a => (now - a.startTime) < 7 * 86400);
  const runs = list.filter(a => [100, 101, 102].includes(a.sportType));
  const recentRuns = runs.slice(0, 5);
  const weekLoad = week.reduce((sum, a) => sum + (a.trainingLoad || 0), 0);

  // EvoLab health metrics
  const dayList = evoLab?.dayList || [];
  const recentDays = dayList.slice(-14);
  const latestWithHrv = [...dayList].reverse().find(d => d.avgSleepHrv);
  const latestWithVo2 = [...dayList].reverse().find(d => d.vo2max);
  const latestWithStamina = [...dayList].reverse().find(d => d.staminaLevel);

  console.log('=== COROS COACHING REPORT ===');
  console.log(`Date: ${new Date().toISOString().split('T')[0]}`);
  console.log(`Athlete: ${profile.nickname} | ${profile.stature}cm | ${profile.weight?.toFixed(1)}kg`);
  console.log(`Max HR: ${profile.maxHr} | RHR: ${profile.rhr}`);

  console.log(`\n--- LAST 7 DAYS (${week.length} activities, load: ${weekLoad}) ---`);
  week.forEach(a => {
    const label = SPORT_LABELS[a.sportType] || `Sport${a.sportType}`;
    const pace = [100, 101, 102].includes(a.sportType) ? ` @ ${paceStr(a.adjustedPace || a.avg5x10s)}` : '';
    console.log(`  [${a.date}] ${label}: ${distKm(a.distance)} in ${durStr(a.totalTime)} | HR avg ${a.avgHr}${pace} | load ${a.trainingLoad}`);
  });

  console.log(`\n--- RECENT RUNS (last 5) ---`);
  if (recentRuns.length === 0) {
    console.log('  No runs found. ⚠️ Running frequency is low.');
  } else {
    for (const a of recentRuns) {
      console.log(`  [${a.date}] ${distKm(a.distance)} in ${durStr(a.totalTime)} | pace ${paceStr(a.avg5x10s)} | HR ${a.avgHr} | load ${a.trainingLoad}`);
      try {
        const detail = await api('activity/detail/query', token, {
          method: 'POST',
          params: { labelId: a.labelId, sportType: a.sportType },
        });
        const laps = detail.data?.lapList?.[0]?.lapItemList || [];
        if (laps.length > 1) {
          const intervals = laps.filter(l => l.mode === 2);
          if (intervals.length > 0) {
            console.log(`    ⚡ INTERVAL BREAKDOWN (${intervals.length} reps):`);
            intervals.forEach((l, i) => {
              const repDist = l.distance >= 10000 ? distKm(l.distance / 100) : distKm(l.distance);
              console.log(`      Rep ${i + 1}: pace ${paceStr(l.adjustedPace)} | HR avg ${l.avgHr} / max ${l.maxHr} | cadence ${l.avgCadence} | dist ${repDist}`);
            });
          } else {
            console.log(`    📏 KM SPLITS (${laps.length} laps):`);
            laps.forEach((l, i) => {
              console.log(`      Lap ${i + 1}: pace ${paceStr(l.adjustedPace)} | HR avg ${l.avgHr} / max ${l.maxHr} | cadence ${l.avgCadence}`);
            });
          }
        }
      } catch { /* skip if detail fetch fails */ }
    }
  }

  if (latestWithHrv || latestWithVo2 || latestWithStamina) {
    console.log(`\n--- HEALTH METRICS (EvoLab) ---`);
    if (latestWithVo2) console.log(`  VO2max: ${latestWithVo2.vo2max} ml/kg/min (as of ${latestWithVo2.happenDay})`);
    if (latestWithStamina) console.log(`  Aerobic Stamina: ${latestWithStamina.staminaLevel} | 7d target: ${latestWithStamina.staminaLevel7d}%`);
    if (latestWithHrv) {
      const hrv = latestWithHrv;
      const status = hrv.avgSleepHrv >= hrv.sleepHrvBase ? '✅ above baseline'
        : hrv.avgSleepHrv >= hrv.sleepHrvBase * 0.9 ? '⚠️ slightly below baseline'
        : '🔴 well below baseline';
      console.log(`  Sleep HRV: ${hrv.avgSleepHrv}ms avg | baseline: ${hrv.sleepHrvBase}ms → ${status}`);
    }
    const recentHrv = recentDays.filter(d => d.avgSleepHrv && d.tib > 0);
    if (recentHrv.length >= 3) {
      console.log(`  HRV trend (${recentHrv.length} nights): ` + recentHrv.map(d => `${d.happenDay}: ${d.avgSleepHrv}ms`).join(' | '));
    }
    const recentRhr = recentDays.filter(d => d.rhr > 0);
    if (recentRhr.length) {
      const avgRhr = Math.round(recentRhr.reduce((s, d) => s + d.rhr, 0) / recentRhr.length);
      console.log(`  RHR avg (${recentRhr.length} days): ${avgRhr}bpm`);
    }
  }

  console.log(`\n--- ZONES ---`);
  const zones = profile.zoneData;
  if (zones) {
    console.log(`  LTHR: ${zones.lthr} | LT pace: ${paceStr(zones.ltsp)}`);
    console.log(`  FTP (cycling): ${zones.ftp}W`);
  }

  console.log(`\n--- COACHING NOTES ---`);
  const runCount7d = week.filter(a => [100, 101, 102].includes(a.sportType)).length;
  if (runCount7d === 0) {
    console.log('  ⚠️ ZERO runs this week. VO2max improvement requires running stimulus. Target: 3-4 runs/week minimum.');
  } else if (runCount7d < 3) {
    console.log(`  ⚠️ Only ${runCount7d} run(s) this week. Aim for 3-4 to drive VO2max adaptations.`);
  } else {
    console.log(`  ✅ ${runCount7d} runs this week — good frequency.`);
  }
  if (weekLoad < 100) {
    console.log('  ⚠️ Training load is low. Consider adding aerobic volume (easy Zone 2 runs).');
  } else if (weekLoad > 400) {
    console.log('  ⚠️ High training load — ensure adequate recovery days.');
  } else {
    console.log(`  ✅ Training load in healthy range (${weekLoad}).`);
  }
  if (latestWithHrv) {
    const hrv = latestWithHrv;
    if (hrv.avgSleepHrv < hrv.sleepHrvBase * 0.9) {
      console.log(`  🔴 HRV well below baseline (${hrv.avgSleepHrv} vs ${hrv.sleepHrvBase}ms) — consider easy/recovery session today.`);
    } else if (hrv.avgSleepHrv >= hrv.sleepHrvBase) {
      console.log(`  ✅ HRV above baseline — body is ready for quality training.`);
    }
  }
  if (latestWithVo2) {
    console.log(`  📊 VO2max: ${latestWithVo2.vo2max} ml/kg/min (COROS estimate, last updated ${latestWithVo2.happenDay})`);
  } else if (zones?.ltsp) {
    const speedMS = 1000 / zones.ltsp;
    console.log(`  📊 LT pace ${paceStr(zones.ltsp)} → estimated VO2max ~${(speedMS * 3.5 * 60 / 1000 * 100).toFixed(0)} (approximation)`);
  }

  return { profile, week, recentRuns, weekLoad };
}

run().catch(console.error);
