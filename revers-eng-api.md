The existing coros-connect library was built exactly this way — by watching what the COROS web app
  does and replicating it. Here's how you'd do the same for health metrics:

  1. Browser DevTools (easiest starting point)

  1. Open https://t.coros.com and log in
  2. Open DevTools → Network tab
  3. Filter by Fetch/XHR
  4. Navigate to the pages that show health data (sleep, HRV, daily stats)
  5. Watch the API calls appear

  What to look for:                                                                                    - The URL path (e.g., /health/sleep/query, /health/hrv/query)
  - Request method (GET/POST)
  - Headers — especially accessToken
  - Request body or query parameters (date ranges, user ID)
  - Response structure

  Pro tip: Right-click any request → Copy as cURL — gives you a ready-to-test command you can run in
  terminal.

  2. Read the web app's JavaScript

  The COROS web app bundles its API calls in JavaScript files. The existing library already found
  endpoints this way (the stsUpload.js reference in the code).

  1. In DevTools → Sources tab
  2. Look for JS bundles (often under assets/ or static/js/)                                           3. Use the Search across all sources (Cmd+Shift+F) for strings like:
    - "/health"
    - "/sleep"
    - "/hrv"
    - "apiUrl" or "baseUrl"
    - "accessToken"                                                                                    4. The bundled JS is minified but still readable — look for URL path strings near fetch/axios calls

  3. Intercept the mobile app (richest data)
  The COROS mobile app likely has more health endpoints than the web app. To capture them:
  Using a proxy like mitmproxy or Charles Proxy:
  1. Install https://mitmproxy.org/ (brew install mitmproxy)                                           2. Run mitmweb — starts a proxy on port 8080 with a web UI
  3. On your phone, set HTTP proxy to your Mac's IP:8080                                               4. Install the mitmproxy CA certificate on your phone (visit mitm.it)
  5. Open the COROS app, browse your health data                                                       6. Watch every API call appear in the mitmweb dashboard
                                                                                                       What you'll likely find:
  - Daily metrics endpoint (steps, calories, resting HR)                                               - Sleep data (stages, duration, score)
  - HRV data (overnight readings, trends)                                                              - SpO2 readings
  - Stress/body battery equivalent                                                                     - Training load / recovery metrics
                                                                                                       Note: Some apps use certificate pinning which blocks proxying. If the COROS app does this, you'd
  need a rooted/jailbroken device or use Frida to bypass it — the web app is easier in that case.
  4. Practical workflow

  Once you find a new endpoint:

  # Test it with curl using your existing token
  curl -s 'https://teamapi.coros.com/health/sleep/query' \
    -H 'accessToken: YOUR_TOKEN_HERE' \
    -H 'Content-Type: application/json' \
    -d '{"startDay":"20260201","endDay":"20260208"}' | jq .

  Then you know the request/response shape and can add it to coros-connect as a new method.

  What to expect

  Based on similar fitness platforms, the health endpoints probably follow the same pattern as the
  existing activity endpoints — POST with date ranges, accessToken header, response with result:
  "0000" on success. The data structures will be different but the auth and conventions will be the
  same.