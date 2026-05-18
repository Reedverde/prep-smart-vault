// /pi3 — low-CPU kiosk for Raspberry Pi 3. Static layout, no animations,
// no SVG charts. Single coordinated 60s data wave via usePi3Data, which
// consumes the shared pure fetchers in src/lib/dataSources.ts (same source
// of truth as /pi and the main dashboard). The clock is the only live element.

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import "@/styles/pi3.css";
import { Pi3Tile, type Pi3Severity } from "@/components/Pi3Tile";
import { usePi3Data } from "@/hooks/usePi3Data";

const LOCATION = {
  name: "NEW CASTLE PA",
  lat: 41.0034,
  lng: -80.347,
  timezone: "America/New_York",
};

const Pi3 = () => {
  // Clock — only live element.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { document.title = "PrepPi · Pi3 Terminal"; }, []);

  // Scale-to-fit: same approach as /pi but with a 1024×600 design size.
  const stageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const DESIGN_W = 1024;
    const DESIGN_H = 600;
    const apply = () => {
      const el = stageRef.current;
      if (!el) return;
      const s = Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);
      el.style.transform = `translate(-50%, -50%) scale(${s})`;
    };
    apply();
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    return () => {
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
    };
  }, []);

  const { data, errors } = usePi3Data(LOCATION.lat, LOCATION.lng);

  const has = (k: keyof typeof data) => data[k] !== undefined;
  const failed = (k: keyof typeof errors) => errors[k] === true;
  const nd = (k: keyof typeof data) => !has(k) || failed(k);

  // ============ Derived values (numeric/text only, no SVG) ============

  // 01 Weather
  const w: any = data.weather;
  const tempF = w?.observed?.temperatureF ?? w?.period?.temperature ?? null;
  const cond = (w?.observed?.shortForecast || w?.period?.shortForecast || "").toLowerCase();

  // 02 Local alerts
  const la: any = data.localAlerts;
  const activeAlerts = la?.active ?? [];
  const alertsCount = activeAlerts.length;
  let sevSevere = 0, sevModerate = 0;
  activeAlerts.forEach((a: any) => {
    const s = (a.properties?.severity || "").toLowerCase();
    if (s === "extreme" || s === "severe") sevSevere++;
    else if (s === "moderate") sevModerate++;
  });
  const alertsSev: Pi3Severity = sevSevere > 0 ? "red" : sevModerate > 0 ? "yellow" : "green";

  // 03 Air quality
  const obs = Array.isArray(data.air) ? (data.air as any[]) : null;
  const maxAqi = obs ? obs.reduce((m: number, o: any) => Math.max(m, o.AQI ?? 0), 0) : null;
  const aqiSev: Pi3Severity = maxAqi == null ? "green" : maxAqi <= 50 ? "green" : maxAqi <= 100 ? "yellow" : "red";

  // 04 Severe radar — derived from national NWS alerts
  const severeRe = /^(Tornado Warning|Severe Thunderstorm Warning|Flash Flood Warning)$/i;
  const natFeatures: any[] = (data.natAlerts as any[]) ?? [];
  const severeAlerts = natFeatures.filter((a: any) => severeRe.test(a?.properties?.event || ""));
  const severeCount = severeAlerts.length;
  const hasTornado = severeAlerts.some((a: any) => /Tornado/i.test(a?.properties?.event || ""));
  const severeSev: Pi3Severity = hasTornado ? "red" : severeCount > 0 ? "yellow" : "green";

  // 05 HWO
  const hwoData: any = data.hwo;
  const hwoRisk: string | null = hwoData?.dayOne?.risk ?? null;
  const hwoSev: Pi3Severity = hwoRisk === "high" ? "red" : hwoRisk === "elevated" || hwoRisk === "watch" ? "yellow" : "green";

  // 06 Fuel
  const fuelData: any = data.fuel;
  const gas = fuelData?.gasoline;
  const fuelLatest: number | null = gas?.latest ?? null;
  const fuelWow: number | null = gas?.wow ?? null;
  const fuelSev: Pi3Severity = fuelWow == null ? "green" : fuelWow > 0.25 ? "red" : fuelWow > 0.1 ? "yellow" : "green";

  // 07 Financial stress
  const fredData: any = data.stress;
  const stlfsi: number | null = fredData?.stlfsi?.latest ?? null;
  const stressLevel: string | null = fredData?.stlfsi?.level ?? null;
  const stressSev: Pi3Severity = stlfsi == null ? "purple" : stlfsi > 1 ? "red" : stlfsi > 0 ? "yellow" : "purple";
  const stressLabel = stressLevel
    ? stressLevel.toUpperCase()
    : stlfsi == null ? "—"
    : stlfsi > 1 ? "ELEVATED" : stlfsi > 0 ? "NORMAL" : "LOW";

  // 08 National alerts
  const natCount = natFeatures.length;
  const natByState: Record<string, number> = {};
  natFeatures.forEach((f: any) => {
    const codes = (f.properties?.geocode?.SAME || []).map((c: string) => c.slice(0, 2));
    const seen = new Set<string>();
    codes.forEach((c: string) => { if (!seen.has(c)) { natByState[c] = (natByState[c] || 0) + 1; seen.add(c); } });
  });
  const natStateCount = Object.keys(natByState).length;
  const natSev: Pi3Severity = natCount === 0 ? "green" : natCount < 100 ? "green" : natCount < 500 ? "yellow" : "red";

  // 09 PJM grid load
  const gridData: any = data.grid;
  const gridDemand: number | null = gridData?.currentDemand ?? null;
  const gridPeak: number | null = gridData?.peak7d || gridData?.peakToday || null;
  const gridPct = gridDemand && gridPeak ? (gridDemand / gridPeak) * 100 : null;
  const gridSev: Pi3Severity = gridPct == null ? "green" : gridPct > 92 ? "red" : gridPct > 80 ? "yellow" : "green";

  // 10 Outages
  const outageData: any = data.outages;
  const outageUnavail = outageData?.status === "unavailable" || nd("outages");
  const outageCust: number = outageData?.lawrence?.customersOut ?? 0;
  const outageSeverity = outageData?.severity;
  const outageSev: Pi3Severity = outageUnavail ? "yellow"
    : outageSeverity === "widespread" ? "red"
    : outageSeverity === "localized" ? "yellow"
    : "green";

  // 11 Conflict pulse
  const conflictData: any = data.conflict;
  const conflictCount = conflictData?.count ?? null;
  const conflictLabel = conflictCount == null ? "—" : conflictCount > 200 ? "HIGH" : conflictCount > 100 ? "ELEVATED" : "LOW";
  const conflictSev: Pi3Severity = conflictCount == null ? "green" : conflictCount > 200 ? "red" : conflictCount > 100 ? "yellow" : "green";

  // 12 Quakes
  const quakesArr: any[] = (data.quakes as any[]) || [];
  const largest = quakesArr.reduce((m: any, e: any) => ((e.properties?.mag ?? 0) > (m?.properties?.mag ?? 0) ? e : m), null as any);
  const largestMag: number | null = largest?.properties?.mag ?? null;
  const quakeSev: Pi3Severity = largestMag == null ? "green" : largestMag >= 6 ? "red" : largestMag >= 4 ? "yellow" : "green";

  // 13 Headlines
  const headlinesData: any = data.headlines;
  const headlineCount: number = headlinesData?.items?.length ?? 0;

  // 14 Internet
  const internetData: any = data.internet;
  const internetUnconfigured = internetData?.notConfigured;
  const trafficDelta: number | null = internetData?.trafficDeltaPct ?? null;
  const internetSev: Pi3Severity = internetUnconfigured ? "green"
    : trafficDelta == null ? "green"
    : Math.abs(trafficDelta) > 15 ? "yellow" : "green";
  const internetLabel = internetUnconfigured ? "—"
    : trafficDelta == null ? "OK"
    : Math.abs(trafficDelta) > 15 ? "DEGRADED" : "OK";

  // 15 Disasters
  const gdacsArr: any[] = (data.gdacs as any[]) || [];
  const redCount = gdacsArr.filter((e: any) => (e.properties?.alertlevel || "").toLowerCase() === "red").length;
  const orangeCount = gdacsArr.filter((e: any) => (e.properties?.alertlevel || "").toLowerCase() === "orange").length;
  const disasterSev: Pi3Severity = redCount > 0 ? "red" : orangeCount > 0 ? "orange" : "green";

  // 16 Kp
  const kpArr: any[] = (data.kp as any[]) || [];
  const latestKp: number | null = kpArr.length > 0 ? kpArr[kpArr.length - 1].kp : null;
  const kpSev: Pi3Severity = latestKp == null ? "blue" : latestKp >= 7 ? "red" : latestKp >= 5 ? "yellow" : "blue";
  const kpLabel = latestKp == null ? "—" : latestKp < 3 ? "QUIET" : latestKp < 5 ? "UNSETTLED" : latestKp < 7 ? "STORM" : "SEVERE";

  // 17 Clock — only live tile
  const clockStr = format(now, "HH:mm:ss");
  const dateStr = format(now, "dd-MMM-yyyy").toUpperCase();
  const tzAbbr = new Intl.DateTimeFormat("en-US", {
    timeZone: LOCATION.timezone, timeZoneName: "short",
  }).formatToParts(now).find((p) => p.type === "timeZoneName")?.value ?? "";

  const errCount = Object.keys(errors).length;

  // Static ticker headline — first available headline title, no scroll.
  const tickerLine: string = (() => {
    const items = headlinesData?.items as any[] | undefined;
    if (items && items.length > 0) {
      return items.slice(0, 5).map((i) => i?.title || i?.name || "").filter(Boolean).join("  ::  ");
    }
    return `PREPPI STATIC FEED · ${errCount === 0 ? "ALL FEEDS NOMINAL" : `${errCount} FEED${errCount === 1 ? "" : "S"} DOWN`}`;
  })();

  return (
    <div className="pi3-root">
      <div className="pi3-stage" ref={stageRef}>
        <div className="pi3-frame">
          <span className="pi3-corner-bl" />
          <span className="pi3-corner-br" />

          <div className="pi3-topstrip">
            <span style={{ display: "inline-flex", alignItems: "center" }}>
              <span className="pi3-glyph"><span className="pi3-glyph-dot" /></span>
              <span className="pi3-brand">PREPPI</span>
              <span style={{ marginLeft: 10, color: "var(--dim)" }}>:: PI3 TERMINAL</span>
            </span>
            <div className="pi3-meta">
              <span className="pi3-live"><span className="pi3-live-dot" /> LIVE</span>
              <span>NODE 001</span>
              <span>{LOCATION.name}</span>
              <span className="pi3-clocknow">{dateStr} {clockStr} {tzAbbr}</span>
            </div>
          </div>

          <div className="pi3-grid">
          {/* Row 1 */}
          <Pi3Tile label="WEATHER" num="01" sev="green" noData={nd("weather")}
            value={tempF != null ? `${Math.round(tempF)}°F` : "—"}
            footer={cond || "—"} />
          <Pi3Tile label="ALERTS · LOCAL" num="02" sev={alertsSev} noData={nd("localAlerts")}
            value={alertsCount}
            footer={alertsCount === 0 ? "no active warnings" : `${sevSevere} sev · ${sevModerate} mod`} />
          <Pi3Tile label="AIR QUALITY" num="03" sev={aqiSev} noData={nd("air")}
            value={maxAqi != null ? `AQI ${maxAqi}` : "—"}
            footer="airnow · pm2.5" />
          <Pi3Tile label="SEVERE RADAR" num="04" sev={severeSev} noData={nd("natAlerts")}
            value={severeCount === 0 ? "CLEAR" : severeCount}
            footer={`${severeCount} warning${severeCount === 1 ? "" : "s"} · nws`} />
          <Pi3Tile label="HAZARD OUT · 7D" num="05" sev={hwoSev} noData={nd("hwo")}
            value={hwoRisk ? hwoRisk.toUpperCase() : "—"}
            footer="nws · 7d outlook" />

          {/* Row 2 */}
          <Pi3Tile label="FUEL · MID-ATL" num="06" sev={fuelSev} noData={nd("fuel")}
            value={fuelLatest != null ? `$${fuelLatest.toFixed(2)}` : "—"}
            footer={fuelWow != null ? `${fuelWow >= 0 ? "+" : "−"}$${Math.abs(fuelWow).toFixed(2)} wow` : "padd 1b · weekly"} />
          <Pi3Tile label="FIN STRESS" num="07" sev={stressSev} noData={nd("stress")}
            value={stressLabel}
            footer={stlfsi != null ? `stlfsi ${stlfsi.toFixed(2)}` : "fred · weekly"} />
          <Pi3Tile label="NAT'L ALERTS · US" num="08" sev={natSev} noData={nd("natAlerts")}
            value={natCount.toLocaleString()}
            footer={`${natStateCount} states`} />
          <Pi3Tile label="PJM GRID LOAD" num="09" sev={gridSev} noData={nd("grid")}
            value={gridDemand ? `${(gridDemand / 1000).toFixed(1)}k MW` : "—"}
            footer={gridPct != null ? `${gridPct.toFixed(0)}% peak · pjm` : "pjm"} />
          <Pi3Tile label="OUTAGES · PA" num="10" sev={outageSev} noData={outageUnavail}
            value={outageUnavail ? "—" : outageCust.toLocaleString()}
            footer={outageUnavail ? "feed unavailable" : `${outageSeverity || "all clear"} · firstenergy`} />

          {/* Row 3 */}
          <Pi3Tile label="CONFLICT PULSE · 7D" num="11" wide sev={conflictSev} noData={nd("conflict")}
            value={conflictLabel}
            footer={`gdelt 7d · ${conflictCount?.toLocaleString() ?? "—"} articles`} />
          <Pi3Tile label="QUAKES · 7D MAX" num="12" sev={quakeSev} noData={nd("quakes")}
            value={largestMag != null ? `M${largestMag.toFixed(1)}` : "—"}
            footer={`${quakesArr.length} events · usgs`} />
          <Pi3Tile label="HEADLINES · 6H" num="13" sev="green" noData={nd("headlines")}
            value={headlineCount || "—"}
            footer="last 6h · gdelt" />
          <Pi3Tile label="INTERNET HEALTH" num="14" sev={internetSev} noData={nd("internet")}
            value={internetLabel}
            footer={`cloudflare · ${trafficDelta != null ? `${trafficDelta > 0 ? "+" : ""}${trafficDelta.toFixed(1)}%` : "no anomaly"}`} />

          {/* Row 4 */}
          <Pi3Tile label="GLOBAL DIS" num="15" sev={disasterSev} noData={nd("gdacs")}
            value={gdacsArr.length}
            footer={`${redCount} red · ${orangeCount} orange · gdacs`} />
          <Pi3Tile label="SPACE WX · KP" num="16" sev={kpSev} noData={nd("kp")}
            value={latestKp != null ? latestKp.toFixed(1) : "—"}
            footer={`${kpLabel.toLowerCase()} · noaa swpc`} />
          <Pi3Tile label="SYSTEM :: CLOCK" num="17" wide sev="green"
            value={clockStr}
            footer={`${dateStr} · ${errCount === 0 ? "all feeds ok" : `${errCount} feeds down`}`} />
        </div>
      </div>
    </div>
  );
};

export default Pi3;
