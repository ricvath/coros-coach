/**
 * fetch-data.mjs — Quick sanity check / manual data fetch.
 *
 * Logs in, fetches your profile and latest 5 activities, prints raw JSON.
 * Useful for debugging or exploring the API response shape.
 *
 * Usage: node fetch-data.mjs
 */
import { CorosApi, STSConfigs } from 'coros-connect';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let EMAIL, PASS;
try {
  const config = JSON.parse(readFileSync(join(__dirname, 'coros.config.json'), 'utf8'));
  EMAIL = config.email;
  PASS = config.password;
} catch {
  console.error('❌ Missing coros.config.json — copy coros.config.json.example and fill in your credentials.');
  process.exit(1);
}

async function run() {
  const coros = new CorosApi({ email: EMAIL, password: PASS });
  coros.config({ stsConfig: STSConfigs.EU });

  console.log('Logging in...');
  const user = await coros.login(EMAIL, PASS);
  console.log('User:', JSON.stringify(user, null, 2));

  console.log('\nFetching activities...');
  const activities = await coros.getActivitiesList({ size: 5, page: 1 });
  console.log('Activities:', JSON.stringify(activities, null, 2));
}

run().catch(console.error);
