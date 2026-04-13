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
import { CorosApi, STSConfigs, isDirectory } from 'coros-connect';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

const TOKEN_FOLDER = join(__dirname, '.coros-token');

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

async function run() {
  const coros = new CorosApi({ email: EMAIL, password: PASS });
  coros.config({ stsConfig: STSConfigs.EU });

  // Reuse stored token if available (avoids 429s from frequent logins)
  try {
    if (isDirectory && isDirectory(TOKEN_FOLDER)) {
      coros.loadTokenByFile(TOKEN_FOLDER);
    } else {
      await coros.login(EMAIL, PASS);
      coros.exportTokenToFile(TOKEN_FOLDER);
    }
  } catch {
    await coros.login(EMAIL, PASS);
  }

  const profile = await coros.getAccount();
  const activities = await coros.getActivitiesList({ size: 20, page: 1 });

  const list = activities.dataList || [];

  // Categorize last 7 days
  const now = Date.now() / 1000;
  const week = list.filter(a => (now - a.startTime) < 7 * 86400);
  const runs = list.filter(a => [100, 101, 102].includes(a.sportType));
  const recentRuns = runs.slice(0, 5);

  // Training load sum last 7 days
  const weekLoad = week.reduce((sum, a) => sum + (a.trainingLoad || 0), 0);

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
    console.log('  No runs found in recent activities. ⚠️ Running frequency is low.');
  } else {
    for (const a of recentRuns) {
      console.log(`  [${a.date}] ${distKm(a.distance)} in ${durStr(a.totalTime)} | pace ${paceStr(a.avg5x10s)} | HR ${a.avgHr} | load ${a.trainingLoad}`);

      // Fetch lap/split details for each run
      try {
        const detail = await coros.getActivityDetails(a.labelId);
        const laps = detail?.lapList?.[0]?.lapItemList || [];
        if (laps.length > 1) {
          const intervals = laps.filter(l => l.mode === 2);   // interval reps
          // mode=3: recovery, mode=4: warmup/cooldown

          if (intervals.length > 0) {
            console.log(`    ⚡ INTERVAL BREAKDOWN (${intervals.length} reps):`);
            intervals.forEach((l, i) => {
              // lap distance is in cm when >= 10000 (i.e. >= 100m stored as cm)
              const repDist = l.distance >= 10000 ? distKm(l.distance / 100) : distKm(l.distance);
              console.log(`      Rep ${i + 1}: pace ${paceStr(l.adjustedPace)} | HR avg ${l.avgHr} / max ${l.maxHr} | cadence ${l.avgCadence} | dist ${repDist}`);
            });
          } else {
            // Regular km splits
            console.log(`    📏 KM SPLITS (${laps.length} laps):`);
            laps.forEach((l, i) => {
              console.log(`      Lap ${i + 1}: pace ${paceStr(l.adjustedPace)} | HR avg ${l.avgHr} / max ${l.maxHr} | cadence ${l.avgCadence}`);
            });
          }
        }
      } catch {
        // silently skip if detail fetch fails (token expiry, rate limit, etc.)
      }
    }
  }

  console.log(`\n--- ZONES ---`);
  const zones = profile.zoneData;
  if (zones) {
    console.log(`  LTHR: ${zones.lthr} | LT pace: ${paceStr(zones.ltsp)}`);
    console.log(`  FTP (cycling): ${zones.ftp}W`);
  }

  // Coaching analysis
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

  // VO2max proxy estimate from LT pace (Jack Daniels approximation)
  const ltsp = zones?.ltsp;
  if (ltsp) {
    const speedMS = 1000 / ltsp;
    console.log(`  📊 LT pace ${paceStr(ltsp)} → estimated VO2max ~${(speedMS * 3.5 * 60 / 1000 * 100).toFixed(0)} (use watch reading for accuracy)`);
  }

  return { profile, week, recentRuns, weekLoad };
}

run().catch(console.error);
