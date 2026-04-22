

# Plan — Power Outages: try the new FirstEnergy/Kubra portal

## What changes

**One file:** `supabase/functions/power-outages/index.ts`. No UI changes.

## Approach

Replace the dead PowerOutage.us probe with a multi-step fetch against the Kubra Storm Center API that powers `outages-pa.firstenergycorp.com`:

1. **Step 1 — currentState (confirmed 200, no auth):**
   `GET https://kubra.io/stormcenter/api/v1/stormcenters/6c715f0e-bbec-465f-98cc-0b81623744be/views/8587e451-e258-4692-b5e8-28010506d51a/currentState`
   Parse `data.interval_generation_data` to get the live deployment id (currently `63484357-9311-4887-9fe9-0e591c498cae`, but it rotates).

2. **Step 2 — try a fan-out of known Kubra summary paths** against that deployment id. Real-world Kubra deployments use one of a small set of conventions; we'll try them in order and keep the first 2xx JSON body:
   - `/data/{INST}/public/{DEP}/summary-1/data.json`
   - `/data/{INST}/public/{DEP}/report.json`
   - `/data/{INST}/public/{DEP}/thematic-1/data.json`
   - `/data/{INST}/{DEP}/summary-1/data.json`

3. **Step 3 — parse if found.** Kubra summary JSON typically contains `total_cust_a_out` (customers out), `n_out` (outage count), and a `file_data` array with county rows including `area_name` and `cust_a`. Map "Lawrence" → `lawrence.{customers, outages}`, sum PA total → `paTotal`, and take top 5 counties → `topCounties`.

4. **Step 4 — graceful fallback.** If every step 2 path returns 404 (the Kubra config endpoint that holds the real `summaryFilePath` is auth-gated, so this is plausible), keep the existing `status:'unavailable'` payload. Log the deployment id + the response code from each attempt so we can iterate later from real data.

5. **Caching:** keep 5-min cache. Cache successful payloads only — don't cache transient failures for 5 minutes.

6. **Logging:** structured one-line log per request: `{ deployment, attempts: [{path, code}], result: 'ok'|'unavailable' }`. This lets us see exactly which path worked or that none did.

## Honest expectation

Step 1 is verified working. Step 2 is **best-effort guessing** — I checked 8+ patterns externally and none of them return data, because Kubra's SPA reads the actual `summaryFilePath` from an authenticated `/configuration` endpoint. There's a reasonable chance step 2 also returns 404s, in which case the panel stays in its "unavailable" state — but with proper logs we'll see *exactly* the deployment id and status codes, which is what we need to either find the right pattern next time or formally call this "needs a browser-based scrape from the Pi tier."

This is a **low-risk attempt** worth making because: (a) the URL you found is the current real portal, (b) the currentState endpoint really is open, and (c) the failure mode is identical to today's behavior.

## Out of scope

PowerOutage.us, Pennsylvania PUC scraping, headless-browser scraping. If this attempt fails I'll report back with exact response codes before proposing the next direction.

