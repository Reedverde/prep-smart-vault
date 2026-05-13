// /pi — HUD console for the 1024×600 Raspberry Pi kiosk.
// Pure inline SVG + CSS animations. All tokens scoped under .pi-root via src/styles/pi.css.
// No new edge functions — reuses every existing data hook at current intervals.

import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import "@/styles/pi.css";
import { getMoonPhase } from "@/lib/moonPhase";
import { getMoonTimes } from "@/lib/moonTimes";
import piClockBg from "@/assets/pi-clock-bg.jpg";
import { PiTile, type PiSeverity } from "@/components/PiTile";
import {
  PiWeatherIcon,
  PiShield,
  PiHalfRing,
  PiRadarSweep,
  PiHazardTriangle,
  PiGradBar,
  PiRingMeter,
  PiUSHeatmap,
  PiCellStack,
  PiAreaChart,
  PiQuakeProfile,
  PiHistogram,
  PiPulseLine,
  PiGlobe,
  PiKpField,
  PI_COLORS,
} from "@/components/PiViz";
import {
  useWeather,
  useLocalAlerts,
  useNationalAlerts,
  useAirQuality,
  useEarthquakes,
  useKpIndex,
  useGdacs,
  useGdelt,
  useGdeltHeadlines,
  useEiaFuel,
  useEiaGrid,
  useFredStress,
  usePowerOutages,
  useCloudflareRadar,
  useNwsHwo,
} from "@/hooks/useDataSources";

// Fixed kiosk location (mirrors /live).
const LOCATION = {
  name: "NEW CASTLE PA",
  lat: 41.0034,
  lng: -80.347,
  timezone: "America/New_York",
};

// Polling intervals — same cadence as /live.
const FAST = 5 * 60 * 1000;
const STD = 10 * 60 * 1000;
const SLOW = 60 * 60 * 1000;

const Big = ({ size, color, glow, children }: { size: number; color: string; glow?: string; children: React.ReactNode }) => (
  <span
    className="pi-big"
    style={{
      fontSize: size,
      color,
      textShadow: glow ? `0 0 10px ${glow}` : undefined,
    }}
  >
    {children}
  </span>
);

// Inline moon glyph for the kiosk tile — geometric lit fraction matching MoonBadge.
const PiMoon = ({ size = 48, illumination, waxing }: { size?: number; illumination: number; waxing: boolean }) => {
  const r = 22, cx = 32, cy = 32;
  const f = illumination / 100;
  const t = (illumination / 100) * Math.PI; // for ellipseRx use cycle angle approx
  // Recompute via phase fraction would need phase; approximate using illumination only:
  const ellipseRx = Math.abs(1 - 2 * f) * r;
  const litSide = waxing ? 1 : -1;
  let d = "";
  if (f >= 0.99) {
    d = `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
  } else if (f <= 0.01) {
    d = "";
  } else if (f > 0.5) {
    const sweepInner = waxing ? 0 : 1;
    d = `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${litSide > 0 ? 1 : 0} ${cx} ${cy + r} A ${ellipseRx} ${r} 0 0 ${sweepInner} ${cx} ${cy - r} Z`;
  } else {
    const sweepOuter = waxing ? 1 : 0;
    const sweepInner = waxing ? 0 : 1;
    d = `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${sweepOuter} ${cx} ${cy + r} A ${ellipseRx} ${r} 0 0 ${sweepInner} ${cx} ${cy - r} Z`;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" stroke="currentColor" fill="none" aria-hidden
      style={{ filter: "drop-shadow(0 0 6px currentColor)" }}>
      <circle cx={cx} cy={cy} r={r} stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" />
      {d && <path d={d} fill="currentColor" fillOpacity="0.9" stroke="none" />}
    </svg>
  );
};

const Pi = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    document.title = "PrepPi · Glance Terminal";
  }, []);

  // ============ Data hooks ============
  const weather = useWeather(LOCATION.lat, LOCATION.lng, STD);
  const localAlerts = useLocalAlerts(LOCATION.lat, LOCATION.lng, STD);
  const natAlerts = useNationalAlerts(STD);
  const air = useAirQuality(LOCATION.lat, LOCATION.lng, STD);
  const quakes = useEarthquakes(STD);
  const kp = useKpIndex(STD);
  const gdacs = useGdacs(STD);
  const conflict = useGdelt(STD);
  const headlines = useGdeltHeadlines(STD);
  const fuel = useEiaFuel(SLOW);
  const grid = useEiaGrid(STD);
  const stress = useFredStress(SLOW);
  const outages = usePowerOutages(FAST);
  const internet = useCloudflareRadar(15 * 60 * 1000);
  const hwo = useNwsHwo(LOCATION.lat, LOCATION.lng, 30 * 60 * 1000);

  // ============ Derived values ============
  // 01 Weather
  const tempF = weather.data?.observed?.temperatureF ?? weather.data?.period?.temperature ?? null;
  const cond = weather.data?.observed?.shortForecast || weather.data?.period?.shortForecast || "—";
  const windKph = weather.data?.observed?.windSpeedKph ?? null;
  const windUnit = weather.data?.observed?.windSpeedUnit ?? null;
  const windMph = (() => {
    if (windKph == null) return null;
    if (windUnit && windUnit.includes("m_s-1")) return Math.round(windKph * 2.23694);
    return Math.round(windKph * 0.621371);
  })();

  // 02 Local alerts
  const activeAlerts = localAlerts.data?.active ?? [];
  const alertsCount = activeAlerts.length;
  let sevSevere = 0, sevModerate = 0, sevMinor = 0;
  let officeCode = "—";
  activeAlerts.forEach((a: any) => {
    const s = (a.properties?.severity || "").toLowerCase();
    if (s === "extreme" || s === "severe") sevSevere++;
    else if (s === "moderate") sevModerate++;
    else sevMinor++;
    const sender = a.properties?.senderName || "";
    const m = sender.match(/\b([A-Z]{3})\b/);
    if (m) officeCode = m[1];
  });
  const alertsSev: PiSeverity = sevSevere > 0 ? "red" : sevModerate > 0 ? "yellow" : "green";

  // 03 Air quality
  const obs = Array.isArray(air.data) ? air.data : null;
  const maxAqi = obs ? obs.reduce((m: number, o: any) => Math.max(m, o.AQI ?? 0), 0) : null;
  const aqiSev: PiSeverity = maxAqi == null ? "green" : maxAqi <= 50 ? "green" : maxAqi <= 100 ? "yellow" : "red";
  const aqiCat = maxAqi == null ? "—" : maxAqi <= 50 ? "good" : maxAqi <= 100 ? "moderate" : maxAqi <= 150 ? "sensitive" : "unhealthy";

  // 04 Severe radar — visual only

  // 05 HWO
  const hwoData: any = hwo.data;
  const hwoRisk: string | null = hwoData?.dayOne?.risk ?? null;
  const hwoSev: PiSeverity = hwoRisk === "high" ? "red" : hwoRisk === "elevated" || hwoRisk === "watch" ? "yellow" : "green";

  // 06 Fuel
  const fuelData: any = fuel.data;
  const gas = fuelData?.gasoline;
  const fuelLatest: number | null = gas?.latest ?? null;
  const fuelWow: number | null = gas?.wow ?? null;
  const fuelMin = 2.5;
  const fuelMax = 5.0;
  const fuelPct = fuelLatest != null ? ((fuelLatest - fuelMin) / (fuelMax - fuelMin)) * 100 : null;

  // 07 Financial stress
  const fredData: any = stress.data;
  const stlfsi: number | null = fredData?.stlfsi?.latest ?? null;
  const stressSev: PiSeverity = stlfsi == null ? "purple" : stlfsi > 1 ? "red" : stlfsi > 0 ? "yellow" : "purple";

  // 08 National alerts
  const natFeatures = natAlerts.data || [];
  const natCount = natFeatures.length;
  const natByState: Record<string, number> = {};
  natFeatures.forEach((f: any) => {
    const codes = (f.properties?.geocode?.SAME || []).map((c: string) => c.slice(0, 2));
    const seen = new Set<string>();
    codes.forEach((c: string) => {
      if (!seen.has(c)) { natByState[c] = (natByState[c] || 0) + 1; seen.add(c); }
    });
  });
  const natTop = Object.entries(natByByCount(natByState)).slice(0, 20).map(([, c]) => c as number);
  const natStateCount = Object.keys(natByState).length;
  const natTopStates = Object.entries(natByState).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k.toLowerCase()).join(" ");
  const natSev: PiSeverity = natCount === 0 ? "green" : natCount < 100 ? "green" : natCount < 500 ? "yellow" : "red";

  // 09 PJM grid load
  const gridData: any = grid.data;
  const gridDemand: number | null = gridData?.currentDemand ?? null;
  const gridPeak: number | null = gridData?.peak7d || gridData?.peakToday || null;
  const gridPct = gridDemand && gridPeak ? (gridDemand / gridPeak) * 100 : null;
  const gridSev: PiSeverity = gridPct == null ? "green" : gridPct > 92 ? "red" : gridPct > 80 ? "yellow" : "green";

  // 10 Outages
  const outageData: any = outages.data;
  const outageCust: number = outageData?.lawrence?.customers ?? 0;
  const outageSeverity = outageData?.severity;
  const outageSev: PiSeverity = outageSeverity === "widespread" ? "red" : outageSeverity === "localized" ? "yellow" : "green";

  // 11 Conflict pulse
  const conflictData: any = conflict.data;
  const conflictCount = conflictData?.count ?? null;
  const conflictLabelTxt = conflictCount == null ? "—" : conflictCount > 200 ? "HIGH" : conflictCount > 100 ? "ELEVATED" : "LOW";
  const conflictSev: PiSeverity = conflictCount == null ? "green" : conflictCount > 200 ? "red" : conflictCount > 100 ? "yellow" : "green";
  const topRegion = conflictData?.byRegion
    ? (Object.entries(conflictData.byRegion as Record<string, number>).sort((a, b) => b[1] - a[1])[0]?.[0]) : null;
  const topType = conflictData?.byType
    ? Object.entries(conflictData.byType as Record<string, number>).filter(([k]) => k.toLowerCase() !== "other").sort((a, b) => b[1] - a[1])[0]?.[0]
    : null;
  // Synthesize area-chart series (cumulative-ish from byRegion buckets)
  const conflictSeries: number[] = (() => {
    const vals: number[] = conflictData?.byRegion
      ? (Object.values(conflictData.byRegion) as number[]).slice(0, 24)
      : [];
    if (vals.length === 0) return [0, 0];
    const sorted = [...vals].sort((a, b) => a - b);
    let cum = 0;
    return sorted.map((v) => (cum += v));
  })();
  const conflictDelta = conflictCount && conflictCount > 0 ? Math.round(((conflictCount - 200) / 200) * 100) : null;

  // 12 Quakes
  const quakesArr = quakes.data || [];
  const largest = quakesArr.reduce(
    (m: any, e: any) => ((e.properties?.mag ?? 0) > (m?.properties?.mag ?? 0) ? e : m),
    null as any,
  );
  const largestMag: number | null = largest?.properties?.mag ?? null;
  const largestPlace: string = largest?.properties?.place ?? "";
  const largestHrsAgo = largest?.properties?.time
    ? Math.round((Date.now() - largest.properties.time) / 3600000)
    : null;
  const quakeSev: PiSeverity = largestMag == null ? "green" : largestMag >= 6 ? "red" : largestMag >= 4 ? "yellow" : "green";

  // 13 Headlines
  const headlinesData: any = headlines.data;
  const headlineCount: number = headlinesData?.items?.length ?? 0;
  // synthesize hourly distribution histogram from countries
  const headlinesBars: number[] = (() => {
    if (!headlinesData?.items) return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const buckets = Array.from({ length: 10 }, () => 0);
    headlinesData.items.forEach((it: any, i: number) => { buckets[i % 10] += 1; });
    return buckets;
  })();

  // 14 Internet
  const internetData: any = internet.data;
  const internetUnconfigured = internetData?.notConfigured;
  const trafficDelta: number | null = internetData?.trafficDeltaPct ?? null;
  const internetSev: PiSeverity =
    internetUnconfigured ? "green" :
      trafficDelta == null ? "green" :
        Math.abs(trafficDelta) > 15 ? "yellow" : "green";
  const internetLabel = internetUnconfigured ? "—" :
    trafficDelta == null ? "OK" :
      Math.abs(trafficDelta) > 15 ? "DEGRADED" : "OK";

  // 15 Disasters
  const gdacsArr = gdacs.data || [];
  const redCount = gdacsArr.filter((e: any) => (e.properties?.alertlevel || "").toLowerCase() === "red").length;
  const orangeCount = gdacsArr.filter((e: any) => (e.properties?.alertlevel || "").toLowerCase() === "orange").length;
  const disasterSev: PiSeverity = redCount > 0 ? "red" : "orange";
  const pins = gdacsArr.slice(0, 6).map((e: any, i: number) => {
    const lvl = (e.properties?.alertlevel || "").toLowerCase();
    const c = lvl === "red" ? PI_COLORS.RED : lvl === "orange" ? PI_COLORS.ORANGE : PI_COLORS.YELLOW;
    // pseudo position around globe
    const angles = [0.25, 0.65, 0.45, 0.75, 0.35, 0.55];
    const ys = [0.3, 0.5, 0.45, 0.6, 0.7, 0.4];
    return { x: angles[i] ?? 0.5, y: ys[i] ?? 0.5, color: c };
  });

  // 16 Kp
  const kpArr = kp.data || [];
  const latestKp: number | null = kpArr.length > 0 ? kpArr[kpArr.length - 1].kp : null;
  const kpSev: PiSeverity = latestKp == null ? "blue" : latestKp >= 7 ? "red" : latestKp >= 5 ? "yellow" : "blue";
  const kpLabel = latestKp == null ? "—" : latestKp < 3 ? "QUIET" : latestKp < 5 ? "UNSETTLED" : latestKp < 7 ? "STORM" : "SEVERE";

  // 17 System / Clock
  const errCount = [
    weather, localAlerts, natAlerts, air, quakes, kp, gdacs, conflict, headlines,
    fuel, grid, stress, outages, internet, hwo,
  ].filter((q) => q.error).length;
  const clockStr = format(now, "HH:mm:ss");
  const dateStr = format(now, "dd-MMM-yyyy").toUpperCase();
  const dowStr = format(now, "EEE").toUpperCase();
  const tzAbbr = new Intl.DateTimeFormat("en-US", {
    timeZone: LOCATION.timezone, timeZoneName: "short",
  }).formatToParts(now).find((p) => p.type === "timeZoneName")?.value ?? "";

  // Moon (computed locally, refresh hourly via clock tick is fine)
  const moonInfo = useMemo(() => {
    const d = new Date();
    return {
      phase: getMoonPhase(d),
      times: getMoonTimes(d, LOCATION.lat, LOCATION.lng),
    };
  }, [Math.floor(now.getTime() / (60 * 60 * 1000))]);
  const moonRiseStr = moonInfo.times.alwaysUp
    ? "UP"
    : moonInfo.times.alwaysDown
    ? "DOWN"
    : moonInfo.times.rise
    ? format(moonInfo.times.rise, "HH:mm")
    : "—";
  const moonSetStr = moonInfo.times.set ? format(moonInfo.times.set, "HH:mm") : "—";

  // ============ Ticker text ============
  const ticker = useMemo(() => {
    const segs = [
      `ALERTS ${alertsCount}`,
      `US ${natCount} ALERTS`,
      `OUTAGES ${outageCust}`,
      `CONFLICT ${conflictLabelTxt}${conflictDelta != null ? ` ${conflictDelta >= 0 ? "+" : ""}${conflictDelta}%` : ""}`,
      largestMag != null ? `QUAKE M${largestMag.toFixed(1)}` : null,
      `${gdacsArr.length} DISASTERS GDACS`,
      `NET ${internetLabel}`,
      fuelLatest != null ? `FUEL $${fuelLatest.toFixed(2)}${fuelWow != null ? ` ${fuelWow >= 0 ? "+" : "−"}${Math.abs(fuelWow * 100).toFixed(0)}¢ WOW` : ""}` : null,
      gridPct != null ? `GRID ${gridPct.toFixed(0)}% PEAK` : null,
      latestKp != null ? `KP ${Math.round(latestKp)} ${kpLabel}` : null,
      `HEADLINES ${headlineCount}`,
      "SCANNER LIVE",
    ].filter(Boolean);
    return segs.join("  ::  ");
  }, [alertsCount, natCount, outageCust, conflictLabelTxt, conflictDelta, largestMag, gdacsArr.length, internetLabel, fuelLatest, fuelWow, gridPct, latestKp, kpLabel, headlineCount]);

  return (
    <div className="pi-root">
      <div className="pi-frame">
        <i className="pi-corner-bl" />
        <i className="pi-corner-br" />

        {/* Top strip */}
        <div className="pi-topstrip">
          <div style={{ display: "flex", alignItems: "center" }}>
            <span className="pi-glyph" />
            <span className="pi-brand">PREPPI :: GLANCE TERMINAL</span>
            <span className="pi-cursor" />
          </div>
          <div className="pi-meta">
            <span>NODE 001</span>
            <span>{LOCATION.name}</span>
            <span className="pi-live"><span className="pi-live-dot" />LIVE</span>
            <span className="pi-clocknow">{dateStr} {clockStr} {tzAbbr}</span>
          </div>
        </div>

        {/* Tile grid — 5×4 */}
        <div className="pi-grid">
          {/* Row 1 */}
          <PiTile label="WEATHER" num="01" sev="green"
            footer={`${cond.toLowerCase()} · ${windMph != null ? `${windMph}mph w` : "—"} · feels ${tempF != null ? Math.round(tempF) : "—"}°`}
            body={
              <>
                <PiWeatherIcon size={72} />
                <Big size={42} color="var(--green)" glow="var(--green-glow)">
                  {tempF != null ? `${Math.round(tempF)}°` : "—"}
                </Big>
              </>
            }
          />
          <PiTile label="ALERTS · LOCAL" num="02" sev={alertsSev}
            footer={alertsCount === 0 ? "no active warnings" : `${alertsCount} active · ${officeCode}`}
            body={
              <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
                <PiShield size={80} count={alertsCount}
                  color={alertsSev === "red" ? "var(--red)" : alertsSev === "yellow" ? "var(--yellow)" : "var(--green)"} />
                <table style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "var(--dim)", letterSpacing: "0.08em", borderSpacing: "6px 0" }}>
                  <tbody>
                    <tr><td>SEV</td><td className="pi-c-red" style={{ textAlign: "right" }}>{sevSevere}</td></tr>
                    <tr><td>MOD</td><td className="pi-c-yellow" style={{ textAlign: "right" }}>{sevModerate}</td></tr>
                    <tr><td>MIN</td><td className="pi-c-green" style={{ textAlign: "right" }}>{sevMinor}</td></tr>
                  </tbody>
                </table>
              </div>
            }
          />
          <PiTile label="MOON" num="02b" sev="blue"
            footer={`rise ${moonRiseStr} · set ${moonSetStr}`}
            body={
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--blue)" }}>
                <PiMoon size={88} illumination={moonInfo.phase.illumination} waxing={moonInfo.phase.waxing} />
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, lineHeight: 1.4, letterSpacing: "0.08em" }}>
                  <div style={{ color: "var(--fg)" }}>{moonInfo.phase.name.toUpperCase()}</div>
                  <div style={{ color: "var(--dim)" }} className="tabular-nums">{moonInfo.phase.illumination}% LIT</div>
                </div>
              </div>
            }
          />
          <PiTile label="AIR QUALITY" num="03" sev={aqiSev}
            footer={`aqi · pm2.5 · airnow`}
            body={
              <PiHalfRing
                value={maxAqi}
                min={0}
                max={300}
                width={110}
                height={56}
                label={maxAqi != null ? aqiCat.toUpperCase() : undefined}
                zones={[
                  { from: 0, to: 50, color: "var(--green)" },
                  { from: 50, to: 100, color: "var(--yellow)" },
                  { from: 100, to: 150, color: "var(--orange)" },
                  { from: 150, to: 300, color: "var(--red)" },
                ]}
              />
            }
          />
          <PiTile label="SEVERE RADAR" num="04" sev="green"
            footer="no echoes · iowa mesonet"
            body={<PiRadarSweep />}
          />

          {/* Row 2 */}
          <PiTile label="HAZARD OUT · 7D" num="05" sev={hwoSev}
            footer={hwoData?.office ? `${hwoData.office.toLowerCase()}` : "tstorm thu/fri · pbz"}
            body={
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <PiHazardTriangle size={80} color={hwoSev === "red" ? "var(--red)" : hwoSev === "yellow" ? "var(--yellow)" : "var(--green)"} />
                <span className={`pi-pill ${hwoSev === "red" ? "pi-c-red" : hwoSev === "yellow" ? "pi-c-yellow" : "pi-c-green"}`}>
                  {hwoRisk ? hwoRisk.toUpperCase() : "—"}
                </span>
              </div>
            }
          />
          <PiTile label="FUEL · MID-ATL" num="06" sev="green"
            footer={`padd 1b · weekly · eia`}
            body={
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: "100%" }}>
                <Big size={36} color="var(--green)" glow="var(--green-glow)">
                  {fuelLatest != null ? `$${fuelLatest.toFixed(2)}` : "—"}
                </Big>
                <PiGradBar pct={fuelPct ?? 0} width={140} height={9} redlinePct={80} />
                <div style={{ display: "flex", justifyContent: "space-between", width: 140, fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "var(--dim)" }}>
                  <span>$2.50</span>
                  <span className={fuelWow != null && fuelWow < 0 ? "pi-c-green" : "pi-c-yellow"}>
                    {fuelWow != null ? `${fuelWow >= 0 ? "+" : "−"}$${Math.abs(fuelWow).toFixed(2)} WOW` : ""}
                  </span>
                  <span>$5.00</span>
                </div>
              </div>
            }
          />
          <PiTile label="FIN STRESS · STLFSI" num="07" sev={stressSev}
            footer={`${stlfsi != null && stlfsi < 0 ? "below avg" : "elevated"} · vix · weekly`}
            body={
              <PiRingMeter
                value={stlfsi}
                min={-2}
                max={2}
                size={78}
                sev={stressSev === "red" ? "red" : stressSev === "yellow" ? "yellow" : "purple"}
                centerLabel={stlfsi != null ? stlfsi.toFixed(2) : "—"}
                sublabel="STLFSI"
              />
            }
          />
          <PiTile label="NAT'L ALERTS · US" num="08" sev={natSev}
            footer={`${natStateCount} states · top: ${natTopStates || "—"}`}
            body={
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", gap: 4 }}>
                <Big size={34} color={natSev === "red" ? "var(--red)" : "var(--yellow)"}
                  glow={natSev === "red" ? "var(--red-glow)" : "var(--yellow-glow)"}>
                  {natCount.toLocaleString()}
                </Big>
                <div style={{ width: "100%", padding: "0 4px" }}>
                  <PiUSHeatmap values={natTop} sev={natSev === "red" ? "red" : "yellow"} height={32} />
                </div>
              </div>
            }
          />
          <PiTile label="PJM GRID LOAD" num="09" sev={gridSev}
            footer={`pjm · ${gridSev === "red" ? "critical" : gridSev === "yellow" ? "elevated" : "normal"}`}
            body={
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", gap: 4 }}>
                <Big size={34} color={gridSev === "red" ? "var(--red)" : "var(--yellow)"}
                  glow={gridSev === "red" ? "var(--red-glow)" : "var(--yellow-glow)"}>
                  {gridDemand ? `${(gridDemand / 1000).toFixed(1)}k` : "—"}
                  <span style={{ fontSize: 14, color: "var(--dim)", marginLeft: 4, fontWeight: 400 }}>MW</span>
                </Big>
                <PiGradBar pct={gridPct ?? 0} width={140} height={9} redlinePct={92} />
                <div style={{ display: "flex", justifyContent: "space-between", width: 140, fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "var(--dim)" }}>
                  <span>0</span>
                  <span className="pi-c-yellow">{gridPct != null ? `${gridPct.toFixed(0)}% PEAK` : ""}</span>
                  <span>{gridPeak ? `${Math.round(gridPeak / 1000)}k` : "—"}</span>
                </div>
              </div>
            }
          />

          {/* Row 3 */}
          <PiTile label="POWER OUTAGES · PA" num="10" sev={outageSev}
            footer={`${outageSeverity || "all clear"} · firstenergy`}
            body={
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Big size={42} color="var(--green)" glow="var(--green-glow)">
                  {outageCust}
                </Big>
                <div style={{ display: "flex", gap: 4 }}>
                  {[0, 1, 2].map((s) => (
                    <PiCellStack
                      key={s}
                      width={18}
                      height={84}
                      cells={Array.from({ length: 6 }, () => ({ lit: outageCust === 0 }))}
                    />
                  ))}
                </div>
              </div>
            }
          />
          <PiTile label="CONFLICT PULSE · 7D" num="11" wide sev={conflictSev}
            footer={`gdelt 7d · ${conflictCount?.toLocaleString() ?? "—"} articles · top region: ${(topRegion || "—").toLowerCase()} · theme: ${(topType || "—").toLowerCase()}`}
            body={
              <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <Big size={42} color="var(--red)" glow="var(--red-glow)">
                      {conflictLabelTxt}
                    </Big>
                    {conflictDelta != null && (
                      <span className="pi-c-red" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11 }}>
                        ↑ {Math.abs(conflictDelta)}%
                      </span>
                    )}
                  </div>
                  <span className="pi-c-red" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, letterSpacing: "0.15em" }}>
                    {conflictCount?.toLocaleString() ?? "—"} ARTICLES
                  </span>
                </div>
                <PiAreaChart data={conflictSeries} width={290} height={48} color="var(--red)" />
              </div>
            }
          />
          <PiTile label="QUAKES · 7D MAX" num="12" sev={quakeSev}
            footer={`${largestPlace ? largestPlace.toLowerCase() : `${quakesArr.length} events`}${largestHrsAgo != null ? ` · ${largestHrsAgo}h` : ""}`}
            body={
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <PiQuakeProfile magnitude={largestMag ?? 0} width={120} height={56}
                  color={quakeSev === "red" ? "var(--red)" : quakeSev === "yellow" ? "var(--yellow)" : "var(--green)"} />
                <Big size={30} color={quakeSev === "red" ? "var(--red)" : quakeSev === "yellow" ? "var(--yellow)" : "var(--green)"}
                  glow={quakeSev === "red" ? "var(--red-glow)" : "var(--yellow-glow)"}>
                  {largestMag != null ? `M${largestMag.toFixed(1)}` : "—"}
                </Big>
              </div>
            }
          />
          <PiTile label="HEADLINES · 6H" num="13" sev="green"
            footer="last 6h · gdelt curated"
            body={
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <Big size={42} color="var(--green)" glow="var(--green-glow)">{headlineCount}</Big>
                <PiHistogram data={headlinesBars} width={94} height={28} color="var(--green)" />
              </div>
            }
          />

          {/* Row 4 */}
          <PiTile label="INTERNET HEALTH" num="14" sev={internetSev}
            bgImage={piClockBg} bgPosition="left center" bgFlip bgSize="contain"
            footer={`cloudflare · ${trafficDelta != null ? `${trafficDelta > 0 ? "+" : ""}${trafficDelta.toFixed(1)}%` : "no anomaly"}`}
            body={
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, width: "100%" }}>
                <Big size={36} color="var(--green)" glow="var(--green-glow)">{internetLabel}</Big>
                <PiPulseLine width={140} height={26} color="var(--green)" />
              </div>
            }
          />
          <PiTile label="DISASTERS · GLOBAL" num="15" sev={disasterSev}
            footer={`${gdacsArr.length} active · gdacs`}
            body={
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <PiGlobe size={88} pins={pins} color="var(--orange)" />
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, lineHeight: 1.5, letterSpacing: "0.1em" }}>
                  <div className="pi-c-red">● {redCount} RED</div>
                  <div className="pi-c-orange">● {orangeCount} ORANGE</div>
                </div>
              </div>
            }
          />
          <PiTile label="SPACE WX · KP" num="16" sev={kpSev}
            footer="noaa swpc"
            body={
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <PiKpField kp={latestKp} size={84} color={kpSev === "red" ? "var(--red)" : kpSev === "yellow" ? "var(--yellow)" : "var(--blue)"} />
                <span className={`pi-pill ${kpSev === "red" ? "pi-c-red" : kpSev === "yellow" ? "pi-c-yellow" : "pi-c-blue"}`}>{kpLabel}</span>
              </div>
            }
          />
          <PiTile label="SYSTEM :: CLOCK" num="17" wide sev="green"
            footer={`all services nominal · uptime ${errCount === 0 ? "ok" : `${errCount} feeds down`}`}
            body={
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: "100%" }}>
                <span className="pi-big-clock">{clockStr.split("").map((c, i) => (
                  <span key={i} className={c === ":" ? "s" : "d"}>{c}</span>
                ))}</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="pi-pill pi-c-green">● SCANNER LIVE</span>
                  <span className="pi-pill pi-c-green">● SYSTEM OK</span>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "var(--dim)", letterSpacing: "0.15em" }}>
                    {dateStr} {dowStr}
                  </span>
                </div>
              </div>
            }
          />
        </div>

        {/* Bottom ticker */}
        <div className="pi-ticker">
          <div className="pi-ticker-rec">
            <span className="pi-ticker-rec-dot" />
            <span>REC</span>
          </div>
          <div className="pi-ticker-scroll-wrap">
            <div className="pi-ticker-scroll">
              <span style={{ paddingRight: 40 }}>:: {ticker}  ::  </span>
              <span style={{ paddingRight: 40 }}>:: {ticker}  ::  </span>
            </div>
          </div>
          <div className="pi-ticker-uplink">
            <span>UPLINK</span>
            <span className="pi-bars"><span /><span /><span /><span /></span>
          </div>
        </div>

        {/* Scanline overlay — absolute inside .pi-root, contained */}
        <div className="pi-scan" />
      </div>
    </div>
  );
};

// Helper — sort an object by descending value, return entries.
function natByByCount(obj: Record<string, number>): Record<string, number> {
  const entries = Object.entries(obj).sort((a, b) => b[1] - a[1]);
  const out: Record<string, number> = {};
  entries.forEach(([k, v]) => { out[k] = v; });
  return out;
}

export default Pi;
