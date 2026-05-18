// /pi3 — pixel-exact visual clone of /pi for the Raspberry Pi 3 kiosk.
// Reuses the SAME PiTile + PiViz components and pi.css as /pi by mounting
// under `.pi-root`. Adds `.pi3-static` to nullify every animation/transition
// via src/styles/pi3-static.css. Data comes from usePi3Data (single 60s wave,
// shared fetchers in src/lib/dataSources.ts). Clock is isolated so its 1s tick
// does NOT cause grid tiles to re-render; each tile body is memoized on its
// own derived values, so a tile repaints only when its data actually changes.

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import "@/styles/pi.css";
import "@/styles/pi3-static.css";
import { getMoonPhase } from "@/lib/moonPhase";
import { getMoonTimes } from "@/lib/moonTimes";
import piClockBg from "@/assets/pi-pipboy-bg.png";
import { PiTile, type PiSeverity, type PiTileStatus } from "@/components/PiTile";
import { iconForForecast } from "@/components/WeatherIcon";
import { Big, PiMoon } from "@/components/PiHelpers";
import {
  PiWeatherIcon, PiShield, PiRadarSweep, PiHazardTriangle, PiGradBar,
  PiUSHeatmap, PiHDrainBar, PiAreaChart, PiQuakeProfile, PiHistogram,
  PiPulseLine, PiGlobe, PiKpField, PiAqiArcGauge, PiStressHud, PI_COLORS,
} from "@/components/PiViz";
import { usePi3Data } from "@/hooks/usePi3Data";

const LOCATION = {
  name: "NEW CASTLE PA",
  lat: 41.0034,
  lng: -80.347,
  timezone: "America/New_York",
};

const MAX_OUTAGES = 2500;

// Helper — sort an object by descending value, return entries (mirror of Pi.tsx).
function natByByCount(obj: Record<string, number>): Record<string, number> {
  const entries = Object.entries(obj).sort((a, b) => b[1] - a[1]);
  const out: Record<string, number> = {};
  entries.forEach(([k, v]) => { out[k] = v; });
  return out;
}

// Status from usePi3Data's {data, errors} shape — mirrors /pi's tileStatus().
const statusFor = (k: string, data: any, errors: any): PiTileStatus => {
  const has = data[k] !== undefined;
  const errored = errors[k] === true;
  if (errored && !has) return "nodata";
  if (errored && has) return "stale";
  if (!has) return "loading";
  return "ok";
};

// Isolated clock: only this component subscribes to the 1s tick.
// Tiles up the tree see no `now` prop, so they don't re-render every second.
const Pi3Clock = ({ tzAbbr }: { tzAbbr: string }) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const clockStr = format(now, "HH:mm:ss");
  const dateStr = format(now, "dd-MMM-yyyy").toUpperCase();
  return (
    <span className="pi-clocknow">{dateStr} {clockStr} {tzAbbr}</span>
  );
};

// Big clock that lives inside the SYSTEM::CLOCK tile body.
const Pi3BigClock = ({ dateStr, dowStr }: { dateStr: string; dowStr: string }) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const clockStr = format(now, "HH:mm:ss");
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, width: "100%" }}>
      <span className="pi-big-clock">{clockStr.split("").map((c, i) => (
        <span key={i} className={c === ":" ? "s" : "d"}>{c}</span>
      ))}</span>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "nowrap" }}>
        <span className="pi-pill pi-c-green">● SCANNER</span>
        <span className="pi-pill pi-c-green">● SYS OK</span>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, color: "var(--dim)", letterSpacing: "0.15em", whiteSpace: "nowrap" }}>
          {dateStr} {dowStr}
        </span>
      </div>
    </div>
  );
};

const Pi3 = () => {
  useEffect(() => { document.title = "PrepPi · Pi3 Terminal"; }, []);

  // Scale 1600×900 design stage to viewport (same approach as /pi for pixel parity).
  const stageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const DESIGN_W = 1600;
    const DESIGN_H = 900;
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

  // Pre-compute current date strings for the static (non-clock) slots.
  // These only change when the page is open across midnight — rare and acceptable.
  const today = new Date();
  const tzAbbr = new Intl.DateTimeFormat("en-US", {
    timeZone: LOCATION.timezone, timeZoneName: "short",
  }).formatToParts(today).find((p) => p.type === "timeZoneName")?.value ?? "";
  const dateStr = format(today, "dd-MMM-yyyy").toUpperCase();
  const dowStr = format(today, "EEE").toUpperCase();

  // ============ Per-tile derivations, each memoized on its specific data ============

  // 01 Weather
  const weatherTile = useMemo(() => {
    const w: any = data.weather;
    const tempF = w?.observed?.temperatureF ?? w?.period?.temperature ?? null;
    const cond = w?.observed?.shortForecast || w?.period?.shortForecast || "—";
    const windKph = w?.observed?.windSpeedKph ?? null;
    const windUnit = w?.observed?.windSpeedUnit ?? null;
    const windMph = (() => {
      if (windKph == null) return null;
      if (windUnit && windUnit.includes("m_s-1")) return Math.round(windKph * 2.23694);
      return Math.round(windKph * 0.621371);
    })();
    const isDay = (() => {
      const p = w?.period?.isDaytime;
      if (typeof p === "boolean") return p;
      const h = new Date().getHours();
      return h >= 6 && h < 19;
    })();
    const wxVariant = iconForForecast(cond, isDay);
    const status = statusFor("weather", data, errors);
    return (
      <PiTile status={status} label="WEATHER" num="01" sev="green"
        footer={`${cond.toLowerCase()} · ${windMph != null ? `${windMph}mph w` : "—"} · feels ${tempF != null ? Math.round(tempF) : "—"}°`}
        body={
          <>
            <PiWeatherIcon size={68} variant={wxVariant} />
            <Big size={92} color="var(--green)" glow="var(--green-glow)">
              {tempF != null ? `${Math.round(tempF)}°` : "—"}
            </Big>
          </>
        }
      />
    );
  }, [data.weather, errors.weather]);

  // 02 Local alerts
  const localAlertsTile = useMemo(() => {
    const la: any = data.localAlerts;
    const activeAlerts = la?.active ?? [];
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
    const status = statusFor("localAlerts", data, errors);
    return (
      <PiTile status={status} label="ALERTS · LOCAL" num="02" sev={alertsSev}
        footer={alertsCount === 0 ? "no active warnings" : `${alertsCount} active · ${officeCode}`}
        body={
          <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
            <PiShield size={78} count={alertsCount}
              color={alertsSev === "red" ? "var(--red)" : alertsSev === "yellow" ? "var(--yellow)" : "var(--green)"} />
            <table style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 20, color: "var(--dim)", letterSpacing: "0.08em", borderSpacing: "12px 0" }}>
              <tbody>
                <tr><td>SEV</td><td className="pi-c-red" style={{ textAlign: "right" }}>{sevSevere}</td></tr>
                <tr><td>MOD</td><td className="pi-c-yellow" style={{ textAlign: "right" }}>{sevModerate}</td></tr>
                <tr><td>MIN</td><td className="pi-c-green" style={{ textAlign: "right" }}>{sevMinor}</td></tr>
              </tbody>
            </table>
          </div>
        }
      />
    );
  }, [data.localAlerts, errors.localAlerts]);

  // Moon — derived from local time, recompute hourly (matches /pi useMemo key).
  const moonTile = useMemo(() => {
    const d = new Date();
    const phase = getMoonPhase(d);
    const times = getMoonTimes(d, LOCATION.lat, LOCATION.lng);
    const moonRiseStr = times.alwaysUp ? "UP"
      : times.alwaysDown ? "DOWN"
      : times.rise ? format(times.rise, "HH:mm") : "—";
    const moonSetStr = times.set ? format(times.set, "HH:mm") : "—";
    return (
      <PiTile label="MOON" num="02b" sev="blue"
        footer={`rise ${moonRiseStr} · set ${moonSetStr}`}
        body={
          <div style={{ display: "flex", alignItems: "center", gap: 14, color: "var(--blue)" }}>
            <PiMoon size={86} illumination={phase.illumination} waxing={phase.waxing} />
            <div style={{ fontFamily: "JetBrains Mono, monospace", lineHeight: 1.1, letterSpacing: "0.08em" }}>
              <div style={{ color: "var(--fg)", fontSize: 30, fontWeight: 600 }}>
                {phase.illumination >= 99 ? "FULL"
                  : phase.illumination <= 1 ? "NEW"
                  : phase.waxing ? "WAXING" : "WANING"}
              </div>
              <div style={{ color: "var(--blue)", fontSize: 36, marginTop: 4 }} className="tabular-nums">{phase.illumination}%</div>
            </div>
          </div>
        }
      />
    );
  // Hour-bucketed — recompute when the hour changes (page-open re-render is fine).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.floor(Date.now() / (60 * 60 * 1000))]);

  // 03 Air quality
  const airTile = useMemo(() => {
    const obs = Array.isArray(data.air) ? (data.air as any[]) : null;
    const maxAqi = obs ? obs.reduce((m: number, o: any) => Math.max(m, o.AQI ?? 0), 0) : null;
    const aqiSev: PiSeverity = maxAqi == null ? "green" : maxAqi <= 50 ? "green" : maxAqi <= 100 ? "yellow" : "red";
    const status = statusFor("air", data, errors);
    return (
      <PiTile status={status} label="AIR QUALITY" num="03" sev={aqiSev}
        footer={`aqi · pm2.5 · airnow`}
        body={<PiAqiArcGauge value={maxAqi} max={300} width={180} height={110} ticks={26} />}
      />
    );
  }, [data.air, errors.air]);

  // 04 Severe radar — derived from national NWS alerts
  const severeRadarTile = useMemo(() => {
    const severeRe = /^(Tornado Warning|Severe Thunderstorm Warning|Flash Flood Warning)$/i;
    const natFeatures: any[] = (data.natAlerts as any[]) ?? [];
    const severeAlerts = natFeatures.filter((a: any) => severeRe.test(a?.properties?.event || ""));
    const severeCount = severeAlerts.length;
    const hasTornado = severeAlerts.some((a: any) => /Tornado/i.test(a?.properties?.event || ""));
    const severeSev: PiSeverity = hasTornado ? "red" : severeCount > 0 ? "yellow" : "green";
    const severePins = severeAlerts.slice(0, 10).map((a: any) => {
      const id: string = String(a?.id || a?.properties?.id || a?.properties?.event || "x");
      let h = 0;
      for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
      const angle = (h % 360);
      const radius = 0.25 + ((h >>> 8) % 70) / 100;
      const color = /Tornado/i.test(a?.properties?.event || "") ? "var(--red)"
        : /Flash Flood/i.test(a?.properties?.event || "") ? "var(--blue)"
        : "var(--yellow)";
      return { angle, radius, color };
    });
    const status = statusFor("natAlerts", data, errors);
    return (
      <PiTile status={status} label="SEVERE RADAR" num="04" sev={severeSev}
        footer={`${severeCount} active warning${severeCount === 1 ? "" : "s"} · nws`}
        body={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <PiRadarSweep pins={severePins} />
            <Big size={64}
              color={severeSev === "red" ? "var(--red)" : severeSev === "yellow" ? "var(--yellow)" : "var(--green)"}
              glow={severeSev === "red" ? "var(--red-glow)" : severeSev === "yellow" ? "var(--yellow-glow)" : "var(--green-glow)"}>
              {severeCount === 0 ? "CLEAR" : severeCount}
            </Big>
          </div>
        }
      />
    );
  }, [data.natAlerts, errors.natAlerts]);

  // 05 HWO
  const hwoTile = useMemo(() => {
    const hwoData: any = data.hwo;
    const hwoRisk: string | null = hwoData?.dayOne?.risk ?? null;
    const hwoSev: PiSeverity = hwoRisk === "high" ? "red" : hwoRisk === "elevated" || hwoRisk === "watch" ? "yellow" : "green";
    const status = statusFor("hwo", data, errors);
    return (
      <PiTile status={status} label="HAZARD OUT · 7D" num="05" sev={hwoSev}
        footer={hwoData?.office ? `${hwoData.office.toLowerCase()}` : "nws · 7d outlook"}
        body={
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <PiHazardTriangle size={78} color={hwoSev === "red" ? "var(--red)" : hwoSev === "yellow" ? "var(--yellow)" : "var(--green)"} />
            <span className={`pi-pill ${hwoSev === "red" ? "pi-c-red" : hwoSev === "yellow" ? "pi-c-yellow" : "pi-c-green"}`}>
              {hwoRisk ? hwoRisk.toUpperCase() : "—"}
            </span>
          </div>
        }
      />
    );
  }, [data.hwo, errors.hwo]);

  // 06 Fuel
  const fuelTile = useMemo(() => {
    const fuelData: any = data.fuel;
    const gas = fuelData?.gasoline;
    const fuelLatest: number | null = gas?.latest ?? null;
    const fuelWow: number | null = gas?.wow ?? null;
    const fuelMin = 2.5, fuelMax = 5.0;
    const fuelPct = fuelLatest != null ? ((fuelLatest - fuelMin) / (fuelMax - fuelMin)) * 100 : null;
    const fuelSev: PiSeverity =
      fuelWow == null ? "green" : fuelWow > 0.1 ? "yellow" : fuelWow > 0.25 ? "red" : "green";
    const status = statusFor("fuel", data, errors);
    return (
      <PiTile status={status} label="FUEL · MID-ATL" num="06" sev={fuelSev}
        footer={`padd 1b · weekly · eia${fuelWow != null ? ` · ${fuelWow >= 0 ? "+" : "−"}$${Math.abs(fuelWow).toFixed(2)} wow` : ""}`}
        body={
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: "100%" }}>
            <Big
              size={78}
              color={fuelSev === "red" ? "var(--red)" : fuelSev === "yellow" ? "var(--yellow)" : "var(--green)"}
              glow={fuelSev === "red" ? "var(--red-glow)" : fuelSev === "yellow" ? "var(--yellow-glow)" : "var(--green-glow)"}
            >
              {fuelLatest != null ? `$${fuelLatest.toFixed(2)}` : "—"}
            </Big>
            <PiGradBar pct={fuelPct ?? 0} width={180} height={10} redlinePct={80} />
            <div style={{ display: "flex", justifyContent: "space-between", width: 160, fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "var(--dim)" }}>
              <span>$2.50</span>
              <span className={fuelWow != null && fuelWow < 0 ? "pi-c-green" : "pi-c-yellow"}>
                {fuelWow != null ? `${fuelWow >= 0 ? "+" : "−"}$${Math.abs(fuelWow).toFixed(2)} WOW` : ""}
              </span>
              <span>$5.00</span>
            </div>
          </div>
        }
      />
    );
  }, [data.fuel, errors.fuel]);

  // 07 Financial stress
  const stressTile = useMemo(() => {
    const fredData: any = data.stress;
    const stlfsi: number | null = fredData?.stlfsi?.latest ?? null;
    const stressLevel: string | null = fredData?.stlfsi?.level ?? null;
    const stressSev: PiSeverity = stlfsi == null ? "purple" : stlfsi > 1 ? "red" : stlfsi > 0 ? "yellow" : "purple";
    const stressLevelLabel: string =
      stressLevel === "high" ? "HIGH"
        : stressLevel === "elevated" ? "ELEVATED"
        : stressLevel === "normal" ? "NORMAL"
        : stressLevel === "below" ? "BELOW AVG"
        : stressLevel === "low" ? "LOW"
        : stlfsi == null ? "—"
        : stlfsi > 2 ? "HIGH"
        : stlfsi > 1 ? "ELEVATED"
        : stlfsi > 0 ? "NORMAL"
        : stlfsi > -1 ? "BELOW AVG"
        : "LOW";
    const status = statusFor("stress", data, errors);
    return (
      <PiTile status={status} label="FIN STRESS" num="07" sev={stressSev}
        footer={`${stressLevelLabel.toLowerCase()} · vix · weekly`}
        body={
          <PiStressHud
            value={stlfsi}
            min={-2}
            max={3}
            sev={stressSev === "red" ? "red" : stressSev === "yellow" ? "yellow" : "purple"}
            ringSize={96}
            barWidth={90}
            segments={11}
            levelLabel={stressLevelLabel}
          />
        }
      />
    );
  }, [data.stress, errors.stress]);

  // 08 National alerts
  const natTile = useMemo(() => {
    const natFeatures: any[] = (data.natAlerts as any[]) ?? [];
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
    const status = statusFor("natAlerts", data, errors);
    return (
      <PiTile status={status} label="NAT'L ALERTS · US" num="08" sev={natSev}
        footer={`${natStateCount} states · top: ${natTopStates || "—"}`}
        body={
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", gap: 4 }}>
            <Big size={78} color={natSev === "red" ? "var(--red)" : "var(--yellow)"}
              glow={natSev === "red" ? "var(--red-glow)" : "var(--yellow-glow)"}>
              {natCount.toLocaleString()}
            </Big>
            <div style={{ width: "100%", padding: "0 4px" }}>
              <PiUSHeatmap values={natTop} sev={natSev === "red" ? "red" : "yellow"} height={32} />
            </div>
          </div>
        }
      />
    );
  }, [data.natAlerts, errors.natAlerts]);

  // 09 PJM grid load
  const gridTile = useMemo(() => {
    const gridData: any = data.grid;
    const gridDemand: number | null = gridData?.currentDemand ?? null;
    const gridPeak: number | null = gridData?.peak7d || gridData?.peakToday || null;
    const gridPct = gridDemand && gridPeak ? (gridDemand / gridPeak) * 100 : null;
    const gridSev: PiSeverity = gridPct == null ? "green" : gridPct > 92 ? "red" : gridPct > 80 ? "yellow" : "green";
    const status = statusFor("grid", data, errors);
    return (
      <PiTile status={status} label="PJM GRID LOAD" num="09" sev={gridSev}
        footer={`pjm · ${gridSev === "red" ? "critical" : gridSev === "yellow" ? "elevated" : "normal"}`}
        body={
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", gap: 4 }}>
            <Big size={72} color={gridSev === "red" ? "var(--red)" : "var(--yellow)"}
              glow={gridSev === "red" ? "var(--red-glow)" : "var(--yellow-glow)"}>
              {gridDemand ? `${(gridDemand / 1000).toFixed(1)}k` : "—"}
              <span style={{ fontSize: 20, color: "var(--dim)", marginLeft: 4, fontWeight: 400 }}>MW</span>
            </Big>
            <PiGradBar pct={gridPct ?? 0} width={180} height={10} redlinePct={92} />
            <div style={{ display: "flex", justifyContent: "space-between", width: 160, fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "var(--dim)" }}>
              <span>0</span>
              <span className="pi-c-yellow">{gridPct != null ? `${gridPct.toFixed(0)}% PEAK` : ""}</span>
              <span>{gridPeak ? `${Math.round(gridPeak / 1000)}k` : "—"}</span>
            </div>
          </div>
        }
      />
    );
  }, [data.grid, errors.grid]);

  // 10 Outages
  const outagesTile = useMemo(() => {
    const outageData: any = data.outages;
    const outagesStatus = statusFor("outages", data, errors);
    const outageUnavail = outageData?.status === "unavailable" || outagesStatus !== "ok";
    const outageCust: number = outageData?.lawrence?.customersOut ?? 0;
    const outageSeverity = outageData?.severity;
    const outageSev: PiSeverity = outageUnavail
      ? "yellow"
      : outageSeverity === "widespread" ? "red"
      : outageSeverity === "localized" ? "yellow"
      : "green";
    const outageColorVar =
      outageSev === "red" ? "var(--red)" : outageSev === "yellow" ? "var(--yellow)" : "var(--green)";
    const outageGlowVar =
      outageSev === "red" ? "var(--red-glow)" : outageSev === "yellow" ? "var(--yellow-glow)" : "var(--green-glow)";
    return (
      <PiTile status={outagesStatus} label="OUTAGES · PA" num="10" sev={outageSev}
        footer={outageUnavail ? "feed unavailable · firstenergy" : `${outageSeverity || "all clear"} · firstenergy`}
        body={
          <div style={{ display: "flex", alignItems: "center", gap: 14, width: "100%" }}>
            <Big size={92} color={outageColorVar} glow={outageGlowVar}>
              {outageUnavail ? "—" : outageCust.toLocaleString()}
            </Big>
            <PiHDrainBar
              value={outageUnavail ? MAX_OUTAGES : outageCust}
              max={MAX_OUTAGES}
              height={36}
            />
          </div>
        }
      />
    );
  }, [data.outages, errors.outages]);

  // 11 Conflict pulse
  const conflictTile = useMemo(() => {
    const conflictData: any = data.conflict;
    const conflictCount = conflictData?.count ?? null;
    const conflictLabelTxt = conflictCount == null ? "—" : conflictCount > 200 ? "HIGH" : conflictCount > 100 ? "ELEVATED" : "LOW";
    const conflictSev: PiSeverity = conflictCount == null ? "green" : conflictCount > 200 ? "red" : conflictCount > 100 ? "yellow" : "green";
    const topRegions: [string, number][] = conflictData?.byRegion
      ? (Object.entries(conflictData.byRegion as Record<string, number>).sort((a, b) => b[1] - a[1]).slice(0, 3)) : [];
    const topTypes: [string, number][] = conflictData?.byType
      ? Object.entries(conflictData.byType as Record<string, number>).filter(([k]) => k.toLowerCase() !== "other").sort((a, b) => b[1] - a[1]).slice(0, 3)
      : [];
    const topRegion = topRegions[0]?.[0] ?? null;
    const topType = topTypes[0]?.[0] ?? null;
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
    const status = statusFor("conflict", data, errors);
    return (
      <PiTile status={status} label="CONFLICT PULSE · 7D" num="11" wide sev={conflictSev}
        footer={`gdelt 7d · ${conflictCount?.toLocaleString() ?? "—"} articles · top region: ${(topRegion || "—").toLowerCase()} · theme: ${(topType || "—").toLowerCase()}`}
        body={
          <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", justifyContent: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <Big size={64} color="var(--red)" glow="var(--red-glow)">
                  {conflictLabelTxt}
                </Big>
                {conflictDelta != null && (
                  <span className="pi-c-red" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 16 }}>
                    ↑ {Math.abs(conflictDelta)}%
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 18, fontFamily: "JetBrains Mono, monospace", fontSize: 11, letterSpacing: "0.08em" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 120 }}>
                  <span className="pi-c-dim" style={{ fontSize: 9, letterSpacing: "0.18em" }}>TOP REGIONS</span>
                  {topRegions.length === 0 ? (
                    <span className="pi-c-dim">—</span>
                  ) : topRegions.map(([name, n]) => (
                    <span key={name} className="pi-c-red" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                      <span className="pi-c-dim">{n}</span>
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 110 }}>
                  <span className="pi-c-dim" style={{ fontSize: 9, letterSpacing: "0.18em" }}>TOP THEMES</span>
                  {topTypes.length === 0 ? (
                    <span className="pi-c-dim">—</span>
                  ) : topTypes.map(([name, n]) => (
                    <span key={name} className="pi-c-red" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ textTransform: "uppercase" }}>{name}</span>
                      <span className="pi-c-dim">{n}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <PiAreaChart data={conflictSeries} width={392} height={70} color="var(--red)" />
          </div>
        }
      />
    );
  }, [data.conflict, errors.conflict]);

  // 12 Quakes
  const quakesTile = useMemo(() => {
    const quakesArr: any[] = (data.quakes as any[]) || [];
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
    const status = statusFor("quakes", data, errors);
    return (
      <PiTile status={status} label="QUAKES · 7D MAX" num="12" sev={quakeSev}
        footer={`${largestPlace ? largestPlace.toLowerCase() : `${quakesArr.length} events`}${largestHrsAgo != null ? ` · ${largestHrsAgo}h` : ""}`}
        body={
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <PiQuakeProfile magnitude={largestMag ?? 0} width={140} height={56}
              color={quakeSev === "red" ? "var(--red)" : quakeSev === "yellow" ? "var(--yellow)" : "var(--green)"} />
            <Big size={64} color={quakeSev === "red" ? "var(--red)" : quakeSev === "yellow" ? "var(--yellow)" : "var(--green)"}
              glow={quakeSev === "red" ? "var(--red-glow)" : "var(--yellow-glow)"}>
              {largestMag != null ? `M${largestMag.toFixed(1)}` : "—"}
            </Big>
          </div>
        }
      />
    );
  }, [data.quakes, errors.quakes]);

  // 13 Headlines
  const headlinesTile = useMemo(() => {
    const headlinesData: any = data.headlines;
    const headlineCount: number = headlinesData?.items?.length ?? 0;
    const headlinesBars: number[] = (() => {
      if (!headlinesData?.items) return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      const buckets = Array.from({ length: 10 }, () => 0);
      headlinesData.items.forEach((_it: any, i: number) => { buckets[i % 10] += 1; });
      return buckets;
    })();
    const status = statusFor("headlines", data, errors);
    return (
      <PiTile status={status} label="HEADLINES · 6H" num="13" sev="green"
        footer="last 6h · gdelt curated"
        body={
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <Big size={92} color="var(--green)" glow="var(--green-glow)">{status === "ok" ? headlineCount : "—"}</Big>
            <PiHistogram data={headlinesBars} width={120} height={32} color="var(--green)" />
          </div>
        }
      />
    );
  }, [data.headlines, errors.headlines]);

  // 14 Internet
  const internetTile = useMemo(() => {
    const internetData: any = data.internet;
    const internetUnconfigured = internetData?.notConfigured;
    const trafficDelta: number | null = internetData?.trafficDeltaPct ?? null;
    const internetSev: PiSeverity =
      internetUnconfigured ? "green" :
        trafficDelta == null ? "green" :
          Math.abs(trafficDelta) > 15 ? "yellow" : "green";
    const internetLabel = internetUnconfigured ? "—" :
      trafficDelta == null ? "OK" :
        Math.abs(trafficDelta) > 15 ? "DEGRADED" : "OK";
    const status = statusFor("internet", data, errors);
    return (
      <PiTile status={status} label="INTERNET HEALTH" num="14" sev={internetSev}
        bgImage={piClockBg} bgPosition="center center" bgFlip bgSize="cover"
        footer={`cloudflare · ${trafficDelta != null ? `${trafficDelta > 0 ? "+" : ""}${trafficDelta.toFixed(1)}%` : "no anomaly"}`}
        body={
          <div style={{ display: "flex", width: "100%", justifyContent: "flex-end" }}>
            <div style={{ width: "33.333%", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, transform: "translateX(-30px)" }}>
              <Big size={78} color="var(--green)" glow="var(--green-glow)">{internetLabel}</Big>
              <PiPulseLine width={180} height={30} color="var(--green)" />
            </div>
          </div>
        }
      />
    );
  }, [data.internet, errors.internet]);

  // 15 Disasters
  const disastersTile = useMemo(() => {
    const gdacsArr: any[] = (data.gdacs as any[]) || [];
    const redCount = gdacsArr.filter((e: any) => (e.properties?.alertlevel || "").toLowerCase() === "red").length;
    const orangeCount = gdacsArr.filter((e: any) => (e.properties?.alertlevel || "").toLowerCase() === "orange").length;
    const disasterSev: PiSeverity = redCount > 0 ? "red" : "orange";
    const pins = gdacsArr.slice(0, 6).map((e: any, i: number) => {
      const lvl = (e.properties?.alertlevel || "").toLowerCase();
      const c = lvl === "red" ? PI_COLORS.RED : lvl === "orange" ? PI_COLORS.ORANGE : PI_COLORS.YELLOW;
      const angles = [0.25, 0.65, 0.45, 0.75, 0.35, 0.55];
      const ys = [0.3, 0.5, 0.45, 0.6, 0.7, 0.4];
      return { x: angles[i] ?? 0.5, y: ys[i] ?? 0.5, color: c };
    });
    const status = statusFor("gdacs", data, errors);
    return (
      <PiTile status={status} label="GLOBAL DIS" num="15" sev={disasterSev}
        footer={`${gdacsArr.length} active · gdacs`}
        body={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <PiGlobe size={85} pins={pins} color="var(--orange)" />
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 22, lineHeight: 1.4, letterSpacing: "0.1em" }}>
              <div className="pi-c-red">● {redCount} RED</div>
              <div className="pi-c-orange">● {orangeCount} ORANGE</div>
            </div>
          </div>
        }
      />
    );
  }, [data.gdacs, errors.gdacs]);

  // 16 Kp
  const kpTile = useMemo(() => {
    const kpArr: any[] = (data.kp as any[]) || [];
    const latestKp: number | null = kpArr.length > 0 ? kpArr[kpArr.length - 1].kp : null;
    const kpSev: PiSeverity = latestKp == null ? "blue" : latestKp >= 7 ? "red" : latestKp >= 5 ? "yellow" : "blue";
    const kpLabel = latestKp == null ? "—" : latestKp < 3 ? "QUIET" : latestKp < 5 ? "UNSETTLED" : latestKp < 7 ? "STORM" : "SEVERE";
    const status = statusFor("kp", data, errors);
    return (
      <PiTile status={status} label="SPACE WX · KP" num="16" sev={kpSev}
        footer={`kp ${latestKp != null ? latestKp.toFixed(1) : "—"} · noaa swpc · geomagnetic`}
        body={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <PiKpField kp={latestKp} size={120} color={kpSev === "red" ? "var(--red)" : kpSev === "yellow" ? "var(--yellow)" : "var(--blue)"} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
              <Big size={64} color={kpSev === "red" ? "var(--red)" : kpSev === "yellow" ? "var(--yellow)" : "var(--blue)"}
                glow={kpSev === "red" ? "var(--red-glow)" : kpSev === "yellow" ? "var(--yellow-glow)" : "var(--blue-glow)"}>
                {latestKp != null ? latestKp.toFixed(1) : "—"}
              </Big>
              <span className={`pi-pill ${kpSev === "red" ? "pi-c-red" : kpSev === "yellow" ? "pi-c-yellow" : "pi-c-blue"}`}>{kpLabel}</span>
            </div>
          </div>
        }
      />
    );
  }, [data.kp, errors.kp]);

  // 17 SYSTEM :: CLOCK — owns its own 1s tick via Pi3BigClock, isolated from grid.
  const errCount = Object.keys(errors).length;
  const clockTile = useMemo(() => (
    <PiTile label="SYSTEM :: CLOCK" num="17" wide sev="green"
      footer={`all services nominal · uptime ${errCount === 0 ? "ok" : `${errCount} feeds down`}`}
      body={<Pi3BigClock dateStr={dateStr} dowStr={dowStr} />}
    />
  ), [errCount, dateStr, dowStr]);

  // Ticker — static text from latest headlines payload.
  const ticker = useMemo(() => {
    const items: any[] = (data.headlines as any)?.items ?? [];
    const titles = items
      .slice(0, 10)
      .map((it: any) => String(it?.title || it?.headline || it?.name || "").trim())
      .filter(Boolean);
    return titles.length ? titles.join("  ::  ") : "AWAITING HEADLINE FEED";
  }, [data.headlines]);

  return (
    <div className="pi-root pi3-static">
      <div className="pi-stage" ref={stageRef}>
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
            <Pi3Clock tzAbbr={tzAbbr} />
          </div>
        </div>

        {/* Tile grid — 5×4, identical to /pi */}
        <div className="pi-grid">
          {/* Row 1 */}
          {weatherTile}
          {localAlertsTile}
          {moonTile}
          {airTile}
          {severeRadarTile}

          {/* Row 2 */}
          {hwoTile}
          {fuelTile}
          {stressTile}
          {natTile}
          {gridTile}

          {/* Row 3 */}
          {outagesTile}
          {conflictTile}
          {quakesTile}
          {headlinesTile}

          {/* Row 4 */}
          {internetTile}
          {disastersTile}
          {kpTile}
          {clockTile}
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
    </div>
  );
};

export default Pi3;
