

# Plan — Fix Current Weather: real-time temp + humidity + dewpoint

## Root cause

The Current Weather panel uses NWS `/forecast` (12-hour periods like "Today" / "Tonight"). Two problems with that endpoint:

1. **Temperature doesn't update during the day.** `periods[0].temperature` is the *forecast high/low for that 12-hour block*, not the current observed temperature. So at 2pm and 4pm you see the same number — it's the day's predicted high, not "now."
2. **Humidity, dewpoint, and precip chance render blank.** The 12-hour `/forecast` endpoint omits these fields most of the time. They live on `/forecast/hourly` (and observed humidity/dewpoint live on the nearest station's latest observation).

The panel reads `data.period.relativeHumidity` and `data.period.dewpoint` — those keys are simply `undefined` on the daily forecast response, hence the em-dashes.

## Fix

Update `useWeather` in `src/hooks/useDataSources.ts` to fetch three NWS endpoints in parallel and merge them:

1. **`/points/{lat,lng}`** (already used) — to discover URLs for the other endpoints
2. **`/stations/{nearest}/observations/latest`** — gives **real observed** temperature, humidity, dewpoint, wind, updated every ~hour. This is what the local airport/ASOS station is actually measuring right now.
3. **`/forecast/hourly`** — gives precip chance for the next hour and the multi-period upcoming forecast
4. **`/forecast`** (already used) — keep for the "Today / Tonight / Wednesday" upcoming-period strip and the detailed narrative

Return shape becomes:

```ts
{
  observed: {
    temperatureC, temperatureF, humidity, dewpointC, dewpointF,
    windSpeedKph, windDirection, shortForecast (icon-derived),
    timestamp, stationName,
  },
  period: fc.properties.periods[0],          // for "Today" name + detailed narrative
  hourlyPrecipChance: number | null,         // next hour's PoP
  upcoming: fc.properties.periods.slice(1,5),
  forecastUrl, stationsUrl,
}
```

Stations endpoint discovery: `point.properties.observationStations` returns a stations list URL → fetch first station → use its `stationIdentifier` to hit `/stations/{id}/observations/latest`. Cache the station ID inside the query so we only resolve it once per location.

## Panel updates

`src/components/panels/WeatherPanel.tsx`:

- **Big temp** now reads `data.observed.temperatureF` (or C based on user prefs) — actually changes through the day
- **Humidity stat** reads `data.observed.humidity` (already a percentage, no unit conversion)
- **Dewpoint stat** reads `data.observed.dewpointF` / `dewpointC`
- **Wind stat** reads `data.observed.windSpeedKph` converted to mph + `windDirection` (degrees → compass: N/NE/E/SE/...)
- **Precip stat** reads `data.hourlyPrecipChance` (next-hour chance from hourly forecast); falls back to `data.period.probabilityOfPrecipitation` if hourly missing
- **Condition text** under the big temp reads `data.observed.shortForecast` (e.g. "Cloudy", "Light Rain") — derived from observation `textDescription`
- **"Updated"** small text shows observation timestamp (e.g. "obs 23 min ago"), not query time, so user knows how fresh the *measurement* is
- Upcoming forecast strip + detailed narrative — unchanged, still uses `period`

## Resilience

- If the nearest station observation is null/stale (>3h old), fall back to the next station in the list (NWS station data goes offline occasionally)
- If all stations fail, render observed-section em-dashes but keep the forecast strip working (graceful degrade — the panel still shows tonight + tomorrow)
- Wrap station resolution + observation fetch in a single try; on failure, return `observed: null` instead of throwing the whole query

## Files touched

- `src/hooks/useDataSources.ts` — rewrite `useWeather` to fetch points + stations + hourly + forecast and merge
- `src/components/panels/WeatherPanel.tsx` — read from `data.observed.*` and `data.hourlyPrecipChance`, add C→F conversion helper, degrees→compass helper, "obs N min ago" label

## Acceptance

- [ ] Big temperature changes through the day as the station reports new observations (no longer stuck on the day's forecast high)
- [ ] Humidity shows a real percentage (e.g. "62%")
- [ ] Dewpoint shows a real temperature (e.g. "54°F")
- [ ] Wind shows real observed speed + compass direction
- [ ] Precip chance shows next-hour probability
- [ ] "Updated" label reflects the observation timestamp, not the React Query fetch time
- [ ] If the nearest station has no recent obs, panel falls back to the next station gracefully
- [ ] Upcoming forecast strip (Today / Tonight / Wednesday) still renders unchanged
- [ ] No console errors

## Out of scope

Hourly temperature sparkline · weather icons per period · radar tile · alerting on rapid pressure drops

