// /pi — Operations-room single-screen dashboard for kiosk / Raspberry Pi displays.
// Public route, no auth, fixed location, no chrome. Reuses every existing data hook
// (no edge function changes). 5×4 tile grid with 3 wide tiles + corner-bracketed
// frame, scrolling ticker, and CRT scanline overlay — locked to mockup spec.

import { useEffect, useState, useMemo, type ReactNode } from "react";
import { format } from "date-fns";
import { PublicTopNav } from "@/components/PublicTopNav";
import { PiTile, type PiSeverity } from "@/components/PiTile";
import { WeatherIcon, iconForForecast } from "@/components/WeatherIcon";
import {
  PiDial,
  PiSegmentedBar,
  PiCenteredBar,
  PiFillBar,
  PiStackedBar,
  PiHeatStrip,
  PI_COLORS,
} from "@/components/PiViz";
import { getMoonPhase } from "@/lib/moonPhase";
import pipboy from "@/assets/pipboy.jpg";
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

// Fixed default location, mirrors /live.
const LOCATION = {
  name: "NEW CASTLE PA",
  lat: 41.0034,
  lng: -80.347,
  timezone: "America/New_York",
};

// Polling intervals — same cadence as /live (silent background refresh).
const FAST = 5 * 60 * 1000;
const STD = 10 * 60 * 1000;
const SLOW = 60 * 60 * 1000;

const Pi = () => {
  const showNav = new URLSearchParams(window.location.search).get("nav") === "1";

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    document.title = "PrepPi · Glance";
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

  // ============ Derived per-tile values ============
  // 01 Weather
  const tempF = weather.data?.observed?.temperatureF ?? weather.data?.period?.temperature ?? null;
  const cond =
    weather.data?.observed?.shortForecast || weather.data?.period?.shortForecast || "—";
  const windKph = weather.data?.observed?.windSpeedKph ?? null;
  const windUnit = weather.data?.observed?.windSpeedUnit ?? null;
  const windMph = (() => {
    if (windKph == null) return null;
    if (windUnit && windUnit.includes("m_s-1")) return Math.round(windKph * 2.23694);
    return Math.round(windKph * 0.621371);
  })();
  const isDay = weather.data?.period?.isDaytime ?? true;
  const wxVariant = iconForForecast(cond, isDay);
  const moon = getMoonPhase();
  const weatherTile = {
    label: "WEATHER · LOCAL",
    value: tempF != null ? `${Math.round(tempF)}°F` : "—",
    sub:
      (windMph != null ? `${cond.toLowerCase()} · wind ${windMph}mph` : cond.toLowerCase()) +
      ` · ${moon.emoji} ${moon.illumination}%`,
    sev: "info" as PiSeverity,
    icon: <WeatherIcon variant={wxVariant} size={32} />,
  };

  // 02 NWS Active Alerts (wide)
  const activeAlerts = localAlerts.data?.active ?? [];
  const maxSev = activeAlerts.reduce((m: string, a: any) => {
    const s = a.properties?.severity || "";
    if (s === "Extreme" || s === "Severe") return "alert";
    if (s === "Moderate" && m !== "alert") return "watch";
    return m;
  }, "" as string);
  const alertsCount = activeAlerts.length;
  const alertsSev: PiSeverity =
    alertsCount === 0 ? "clear" : (maxSev as PiSeverity) || "watch";
  const topEvent = activeAlerts[0]?.properties?.event;
  const alertsTile = {
    label: "NWS ACTIVE ALERTS · LOCAL",
    value: String(alertsCount),
    sub:
      alertsCount === 0
        ? "no active warnings · NWS forecast office monitoring"
        : `${topEvent || "alert"} · ${alertsCount} active in area`,
    sev: alertsSev,
    wide: true,
  };

  // 03 Air Quality
  const obs = Array.isArray(air.data) ? air.data : null;
  const maxAqi = obs ? obs.reduce((m: number, o: any) => Math.max(m, o.AQI ?? 0), 0) : null;
  const aqiSev: PiSeverity =
    maxAqi == null ? "info" : maxAqi <= 50 ? "clear" : maxAqi <= 100 ? "watch" : "alert";
  const aqiCat =
    maxAqi == null
      ? "data unavailable"
      : maxAqi <= 50
        ? "good"
        : maxAqi <= 100
          ? "moderate"
          : maxAqi <= 150
            ? "unhealthy sensitive"
            : "unhealthy";
  const airTile = {
    label: "AIR QUALITY",
    value: maxAqi != null ? String(maxAqi) : "—",
    sub: `AQI · ${aqiCat}`,
    sev: aqiSev,
    viz: (
      <PiDial
        value={maxAqi}
        min={0}
        max={300}
        zones={[
          { from: 0, to: 50, color: PI_COLORS.GREEN },
          { from: 50, to: 100, color: PI_COLORS.AMBER },
          { from: 100, to: 150, color: "#ff8c42" },
          { from: 150, to: 300, color: PI_COLORS.RED },
        ]}
      />
    ),
  };

  // 04 Severe Radar — no live cell-count hook; show static "live" indicator.
  const radarTile = {
    label: "RADAR · NEXRAD",
    value: "—",
    sub: "live tile feed · iowa mesonet",
    sev: "info" as PiSeverity,
  };

  // 05 Hazardous Outlook
  const hwoData: any = hwo.data;
  const hwoRisk = hwoData?.dayOne?.risk ?? null;
  const hwoSev: PiSeverity =
    hwoRisk === "high" || hwoRisk === "elevated"
      ? "watch"
      : hwoRisk === "watch"
        ? "watch"
        : hwoRisk === "clear"
          ? "clear"
          : "info";
  const hwoLevel = hwoRisk === "high" ? 2 : hwoRisk === "elevated" || hwoRisk === "watch" ? 1 : hwoRisk === "clear" ? 0 : -1;
  const hwoTile = {
    label: "HAZARD OUTLOOK · 7D",
    value: hwoRisk ? hwoRisk.toUpperCase() : "—",
    sub: hwoData?.office ? `nws ${hwoData.office} · routine cycle` : "awaiting outlook",
    sev: hwoSev,
    viz: hwoLevel >= 0 ? (
      <PiSegmentedBar
        width={70}
        height={10}
        cells={[
          { color: PI_COLORS.GREEN, lit: hwoLevel === 0 },
          { color: PI_COLORS.AMBER, lit: hwoLevel >= 1 },
          { color: PI_COLORS.RED, lit: hwoLevel >= 2 },
        ]}
      />
    ) : undefined,
  };

  // 06 Fuel (gasoline) + sparkline
  const fuelData: any = fuel.data;
  const gas = fuelData?.gasoline;
  const fuelSeries: number[] = gas?.series?.map((s: any) => s.value) ?? [];
  const fuelTile = {
    label: "FUEL · GASOLINE",
    value: gas?.latest != null ? `$${gas.latest.toFixed(2)}` : "—",
    sub:
      gas?.wow != null
        ? `${gas.wow >= 0 ? "+" : "−"}$${Math.abs(gas.wow).toFixed(2)} wow · padd 1b`
        : "weekly · eia",
    sev: (gas?.spike ? "watch" : gas?.latest != null ? "clear" : "info") as PiSeverity,
    spark: fuelSeries,
  };

  // 07 STLFSI
  const fredData: any = stress.data;
  const stlfsi = fredData?.stlfsi?.latest ?? null;
  const stressSev: PiSeverity =
    stlfsi == null ? "info" : stlfsi > 1 ? "alert" : stlfsi > 0 ? "watch" : "clear";
  const stressLabel =
    stlfsi == null
      ? "data unavailable"
      : stlfsi < -1
        ? "low stress"
        : stlfsi < 0
          ? "below avg stress"
          : stlfsi < 1
            ? "elevated"
            : "high stress";
  const stressTile = {
    label: "FINANCIAL STRESS",
    value: stlfsi != null ? stlfsi.toFixed(2) : "—",
    sub: `${stressLabel} · stlfsi weekly`,
    sev: stressSev,
    viz: <PiCenteredBar value={stlfsi} min={-2} max={2} sev={stressSev} width={70} />,
  };

  // 08 National Alerts
  const natFeatures = natAlerts.data || [];
  const natCount = natFeatures.length;
  const natStates = new Set<string>();
  const natByEvent: Record<string, number> = {};
  natFeatures.forEach((f: any) => {
    const codes = (f.properties?.geocode?.SAME || []).map((c: string) => c.slice(0, 2));
    codes.forEach((c: string) => natStates.add(c));
    const e = f.properties?.event;
    if (e) natByEvent[e] = (natByEvent[e] || 0) + 1;
  });
  const natTopEvents = Object.entries(natByEvent)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const natMaxEvent = natTopEvents[0]?.[1] || 1;
  const natSev: PiSeverity =
    natCount === 0 ? "clear" : natCount < 100 ? "clear" : natCount < 500 ? "watch" : "alert";
  const natTile = {
    label: "NAT'L ALERTS · US",
    value: natCount.toLocaleString(),
    sub: `active us · ${natStates.size} states`,
    sev: natSev,
    viz: natTopEvents.length > 0 ? (
      <PiHeatStrip
        width={70}
        height={12}
        cells={natTopEvents.map(([, c]) => ({ intensity: c / natMaxEvent }))}
        baseColor={natSev === "alert" ? PI_COLORS.RED : natSev === "watch" ? PI_COLORS.AMBER : PI_COLORS.GREEN}
      />
    ) : undefined,
  };

  // 09 PJM Grid Load + sparkline
  const gridData: any = grid.data;
  const gridDemand = gridData?.currentDemand;
  const gridPeak = gridData?.peak7d || gridData?.peakToday;
  const gridPct = gridDemand && gridPeak ? (gridDemand / gridPeak) * 100 : null;
  const gridSev: PiSeverity =
    gridPct == null ? "info" : gridPct > 95 ? "alert" : gridPct > 85 ? "watch" : "clear";
  const gridSeries: number[] =
    gridData?.demandTrend?.map((d: any) => d.mw).filter((v: any) => Number.isFinite(v)) ?? [];
  const gridTile = {
    label: "PJM LOAD",
    value: gridDemand ? `${(gridDemand / 1000).toFixed(1)}k` : "—",
    sub: gridPct != null ? `${gridPct.toFixed(0)}% of 7d peak` : "mw · pjm rto",
    sev: gridSev,
    spark: gridSeries.slice(-12),
    viz: gridPct != null ? <PiFillBar pct={gridPct} sev={gridSev} width={70} /> : undefined,
  };

  // 10 Power Outages
  const outageData: any = outages.data;
  const outageUnavail = outageData?.status === "unavailable";
  const outageCust = outageData?.lawrence?.customers ?? null;
  const outageSeverity = outageData?.severity;
  const outageSev: PiSeverity = outageUnavail
    ? "info"
    : outageSeverity === "widespread"
      ? "alert"
      : outageSeverity === "localized"
        ? "watch"
        : "clear";
  const outageLevel = outageUnavail
    ? -1
    : outageSeverity === "widespread"
      ? 2
      : outageSeverity === "localized"
        ? 1
        : 0;
  const outagesTile = {
    label: "POWER OUTAGES · PA",
    value: outageUnavail ? "—" : outageCust != null ? outageCust.toLocaleString() : "0",
    sub: outageUnavail
      ? "feed unavailable"
      : outageSeverity === "widespread"
        ? "widespread · firstenergy"
        : outageSeverity === "localized"
          ? "localized · firstenergy"
          : "all clear · firstenergy",
    sev: outageSev,
    viz: outageLevel >= 0 ? (
      <PiSegmentedBar
        width={70}
        height={10}
        cells={[
          { color: PI_COLORS.GREEN, lit: outageLevel === 0 },
          { color: PI_COLORS.AMBER, lit: outageLevel >= 1 },
          { color: PI_COLORS.RED, lit: outageLevel >= 2 },
        ]}
      />
    ) : undefined,
  };

  // 11 Conflict Pulse (wide) + sparkline
  const conflictData: any = conflict.data;
  const conflictCount = conflictData?.count ?? null;
  const conflictLabelTxt =
    conflictCount == null
      ? "—"
      : conflictCount > 200
        ? "HIGH"
        : conflictCount > 100
          ? "ELEVATED"
          : "LOW";
  const conflictSev: PiSeverity =
    conflictCount == null
      ? "info"
      : conflictCount > 200
        ? "alert"
        : conflictCount > 100
          ? "watch"
          : "clear";
  const topRegion =
    conflictData?.byRegion
      ? Object.entries(conflictData.byRegion as Record<string, number>).sort(
          (a, b) => b[1] - a[1],
        )[0]
      : null;
  const topType =
    conflictData?.byType
      ? Object.entries(conflictData.byType as Record<string, number>)
          .filter(([k]) => k.toLowerCase() !== "other")
          .sort((a, b) => b[1] - a[1])[0]
      : null;
  // Synthesize a sparkline from byRegion distribution as a visual texture
  const conflictSpark: number[] = conflictData?.byRegion
    ? (Object.values(conflictData.byRegion) as number[]).slice(0, 12)
    : [];
  // Region heat strip — top regions by article count
  const conflictRegionEntries: [string, number][] = conflictData?.byRegion
    ? (Object.entries(conflictData.byRegion as Record<string, number>) as [string, number][])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
    : [];
  const conflictRegionMax = conflictRegionEntries[0]?.[1] || 1;
  const conflictTile = {
    label: "CONFLICT PULSE · 7D",
    value: conflictLabelTxt,
    sub:
      conflictCount != null
        ? `${conflictCount.toLocaleString()} articles · ${topType?.[0] ?? "—"} · ${topRegion?.[0] ?? "—"}`
        : "gdelt 7d window",
    sev: conflictSev,
    wide: true,
    spark: conflictSpark,
    bgImage: pipboy,
    viz: conflictRegionEntries.length > 0 ? (
      <PiHeatStrip
        width={140}
        height={14}
        cells={conflictRegionEntries.map(([, c]) => ({ intensity: c / conflictRegionMax }))}
        baseColor={conflictSev === "alert" ? PI_COLORS.RED : conflictSev === "watch" ? PI_COLORS.AMBER : PI_COLORS.GREEN}
      />
    ) : undefined,
  };

  // 12 Earthquakes
  const quakesArr = quakes.data || [];
  const largest = quakesArr.reduce(
    (m: any, e: any) => ((e.properties?.mag ?? 0) > (m?.properties?.mag ?? 0) ? e : m),
    null as any,
  );
  const largestMag = largest?.properties?.mag ?? null;
  const largestPlace = largest?.properties?.place ?? "";
  const largestHrsAgo = largest?.properties?.time
    ? Math.round((Date.now() - largest.properties.time) / 3600000)
    : null;
  const quakeSev: PiSeverity =
    largestMag == null
      ? "info"
      : largestMag >= 6
        ? "alert"
        : largestMag >= 4
          ? "watch"
          : "clear";
  const quakesTile = {
    label: "QUAKES · 7D MAX",
    value: largestMag != null ? `M${largestMag.toFixed(1)}` : "—",
    sub:
      largestPlace
        ? `${largestPlace.toLowerCase()}${largestHrsAgo != null ? ` · ${largestHrsAgo}h` : ""}`
        : `${quakesArr.length} events · usgs`,
    sev: quakeSev,
    viz: (
      <PiDial
        value={largestMag}
        min={0}
        max={9}
        zones={[
          { from: 0, to: 4, color: PI_COLORS.GREEN },
          { from: 4, to: 6, color: PI_COLORS.AMBER },
          { from: 6, to: 9, color: PI_COLORS.RED },
        ]}
      />
    ),
  };

  // 13 Headlines
  const headlinesData: any = headlines.data;
  const headlineCount = headlinesData?.items?.length ?? null;
  const headlinesTile = {
    label: "GLOBAL HEADLINES",
    value: headlineCount != null ? String(headlineCount) : "—",
    sub: "items past window · gdelt",
    sev: "info" as PiSeverity,
  };

  // 14 Internet Health
  const internetData: any = internet.data;
  const internetUnconfigured = internetData?.notConfigured;
  const trafficDelta = internetData?.trafficDeltaPct;
  const internetSev: PiSeverity =
    internetUnconfigured
      ? "info"
      : trafficDelta == null
        ? "info"
        : Math.abs(trafficDelta) > 15
          ? "watch"
          : "clear";
  const internetTile = {
    label: "INTERNET HEALTH",
    value: internetUnconfigured
      ? "—"
      : trafficDelta == null
        ? "OK"
        : Math.abs(trafficDelta) > 15
          ? "DEGRADED"
          : "OK",
    sub: internetUnconfigured
      ? "feed unavailable"
      : trafficDelta != null
        ? `us traffic ${trafficDelta > 0 ? "+" : ""}${trafficDelta.toFixed(1)}% vs 7d`
        : "cloudflare radar",
    sev: internetSev,
    viz: !internetUnconfigured && trafficDelta != null ? (
      <PiCenteredBar value={trafficDelta} min={-30} max={30} sev={internetSev} width={70} />
    ) : undefined,
  };

  // 15 Disasters (standard width — pulses on red)
  const gdacsArr = gdacs.data || [];
  const redCount = gdacsArr.filter(
    (e: any) => (e.properties?.alertlevel || "").toLowerCase() === "red",
  ).length;
  const orangeCount = gdacsArr.filter(
    (e: any) => (e.properties?.alertlevel || "").toLowerCase() === "orange",
  ).length;
  const disasterSev: PiSeverity =
    redCount > 0 ? "alert" : orangeCount > 0 ? "watch" : "clear";
  const disastersTile = {
    label: "DISASTERS · GLOBAL",
    value: String(gdacsArr.length),
    sub: `${redCount} red · ${orangeCount} orange · gdacs`,
    sev: disasterSev,
  };

  // 16 Space Weather (Kp)
  const kpArr = kp.data || [];
  const latestKp = kpArr.length > 0 ? kpArr[kpArr.length - 1].kp : null;
  const kpSev: PiSeverity =
    latestKp == null ? "info" : latestKp >= 7 ? "alert" : latestKp >= 5 ? "watch" : "clear";
  const kpLabel =
    latestKp == null
      ? "—"
      : latestKp < 3
        ? "quiet"
        : latestKp < 5
          ? "unsettled"
          : latestKp < 7
            ? "storm"
            : "severe";
  const spaceTile = {
    label: "SPACE WX · KP",
    value: latestKp != null ? `Kp ${latestKp.toFixed(0)}` : "—",
    sub: `${kpLabel} · noaa swpc`,
    sev: kpSev,
  };

  // 17 System / Clock (wide)
  // Aggregate "everything OK" = at least one hook returned a non-error.
  const errCount = [
    weather, localAlerts, natAlerts, air, quakes, kp, gdacs, conflict, headlines,
    fuel, grid, stress, outages, internet, hwo,
  ].filter((q) => q.error).length;
  const systemSev: PiSeverity = errCount > 5 ? "watch" : "info";
  const clockStr = format(now, "HH:mm:ss");
  const dateStr = format(now, "dd-MMM-yyyy").toUpperCase();
  const tzAbbr = new Intl.DateTimeFormat("en-US", {
    timeZone: LOCATION.timezone,
    timeZoneName: "short",
  })
    .formatToParts(now)
    .find((p) => p.type === "timeZoneName")?.value ?? "";
  const systemTile = {
    label: "SYSTEM :: CLOCK",
    value: clockStr,
    sub: `${errCount === 0 ? "all services nominal" : `${errCount} feed errors`} · ${dateStr} · ${tzAbbr}`,
    sev: systemSev,
    wide: true,
  };

  // ============ Tile order — 4 rows × 5 cols, 3 wides ============
  // Row 1: Weather · Alerts(w) · Air · Radar
  // Row 2: HazOut · Fuel · STLFSI · Nat'l · PJM
  // Row 3: Outages · Conflict(w) · Quakes · Headlines
  // Row 4: Internet · Disasters · Space WX · System/Clock(w)
  const tiles: Array<{
    label: string;
    value: string;
    sub?: string;
    sev: PiSeverity;
    wide?: boolean;
    spark?: number[];
    bgImage?: string;
    icon?: ReactNode;
    num: string;
  }> = [
    // Row 1: Weather · Alerts(w) · Conflict(w) [pip-boy art]
    { ...weatherTile, num: "01" },
    { ...alertsTile, num: "02" },
    { ...conflictTile, num: "11" },
    // Row 2
    { ...hwoTile, num: "05" },
    { ...fuelTile, num: "06" },
    { ...stressTile, num: "07" },
    { ...natTile, num: "08" },
    { ...gridTile, num: "09" },
    // Row 3
    { ...outagesTile, num: "10" },
    { ...airTile, num: "03" },
    { ...radarTile, num: "04" },
    { ...quakesTile, num: "12" },
    { ...headlinesTile, num: "13" },
    // Row 4
    { ...internetTile, num: "14" },
    { ...disastersTile, num: "15" },
    { ...spaceTile, num: "16" },
    { ...systemTile, num: "17" },
  ];

  // ============ Ticker text composition ============
  const tickerSegments = useMemo(
    () =>
      [
        weatherTile.value !== "—" && `WX ${weatherTile.value} ${cond}`,
        `ALERTS ${alertsCount}`,
        airTile.value !== "—" && `AQI ${airTile.value}`,
        hwoTile.value !== "—" && `HAZARD ${hwoTile.value}`,
        fuelTile.value !== "—" && `GAS ${fuelTile.value}`,
        natTile.value !== "—" && `US ${natTile.value} ALERTS`,
        gridTile.value !== "—" && `PJM ${gridTile.value} MW`,
        outagesTile.value !== "—" && `OUTAGES ${outagesTile.value}`,
        `CONFLICT ${conflictTile.value}`,
        quakesTile.value !== "—" && `QUAKE ${quakesTile.value}`,
        `DISASTERS ${gdacsArr.length}`,
        spaceTile.value !== "—" && `SPACE ${spaceTile.value}`,
        internetTile.value !== "—" && `NET ${internetTile.value}`,
      ]
        .filter(Boolean)
        .join("  ::  "),
    [
      weatherTile.value, cond, alertsCount, airTile.value, hwoTile.value,
      fuelTile.value, natTile.value, gridTile.value, outagesTile.value,
      conflictTile.value, quakesTile.value, gdacsArr.length, spaceTile.value, internetTile.value,
    ],
  );

  const headerClock = format(now, "dd-MMM-yyyy HH:mm:ss").toUpperCase() + " " + tzAbbr;

  return (
    <>
      {showNav && <PublicTopNav locationName={LOCATION.name} timezone={LOCATION.timezone} />}
      <style>{`
        @keyframes pi-blink { 0%, 100% { opacity: 1 } 50% { opacity: 0 } }
        @keyframes pi-ticker {
          from { transform: translateX(0) }
          to { transform: translateX(-100%) }
        }
        @keyframes pi-alert-pulse {
          0%, 100% { border-left-color: #ff6b5e }
          50% { border-left-color: #ff8d83 }
        }
      `}</style>
      <div
        className="fixed inset-0 flex flex-col"
        style={
          {
            top: showNav ? 56 : 0,
            background: "#000",
            fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
            color: "var(--pi-text)",
            // Scoped CSS vars — do not leak to global theme.
            "--pi-green": "#7de38a",
            "--pi-amber": "#f4b55c",
            "--pi-red": "#ff6b5e",
            "--pi-text": "#d4e2d4",
            "--pi-text-dim": "#6a7e6a",
            "--pi-text-faint": "#3d4a3d",
            "--pi-border": "#2a3a2d",
            "--pi-bg": "#050705",
          } as React.CSSProperties
        }
      >
        {/* Inner frame with corner brackets */}
        <div
          className="absolute inset-2 pointer-events-none"
          style={{ border: "2px solid var(--pi-border)", zIndex: 2 }}
        >
          {/* 4 corner brackets */}
          <span
            className="absolute"
            style={{
              top: -2, left: -2, width: 14, height: 14,
              borderTop: "2px solid var(--pi-green)",
              borderLeft: "2px solid var(--pi-green)",
            }}
          />
          <span
            className="absolute"
            style={{
              top: -2, right: -2, width: 14, height: 14,
              borderTop: "2px solid var(--pi-green)",
              borderRight: "2px solid var(--pi-green)",
            }}
          />
          <span
            className="absolute"
            style={{
              bottom: -2, left: -2, width: 14, height: 14,
              borderBottom: "2px solid var(--pi-green)",
              borderLeft: "2px solid var(--pi-green)",
            }}
          />
          <span
            className="absolute"
            style={{
              bottom: -2, right: -2, width: 14, height: 14,
              borderBottom: "2px solid var(--pi-green)",
              borderRight: "2px solid var(--pi-green)",
            }}
          />
        </div>

        {/* Content area inside the frame */}
        <div
          className="relative flex flex-col"
          style={{ margin: 8, flex: 1, minHeight: 0, background: "var(--pi-bg)", zIndex: 1 }}
        >
          {/* Top strip */}
          <div
            className="flex items-center justify-between px-4 shrink-0"
            style={{
              height: 36,
              borderBottom: "1px solid var(--pi-border)",
              fontSize: 10,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "var(--pi-text-dim)",
              fontWeight: 500,
            }}
          >
            <div className="flex items-center gap-2">
              <span style={{ color: "var(--pi-green)" }}>PrepPi</span>
              <span>::</span>
              <span>Glance</span>
              <span
                style={{
                  display: "inline-block",
                  width: 7,
                  height: 10,
                  marginLeft: 4,
                  background: "var(--pi-green)",
                  animation: "pi-blink 1s steps(2) infinite",
                }}
              />
            </div>
            <div>NODE 001 · {LOCATION.name} · LIVE</div>
            <div style={{ color: "var(--pi-text)" }}>{headerClock}</div>
          </div>

          {/* Tile grid */}
          <div
            className="grid"
            style={{
              flex: 1,
              minHeight: 0,
              gridTemplateColumns: "repeat(5, 1fr)",
              gridAutoRows: "1fr",
              gap: 1,
              background: "var(--pi-border)",
              padding: 0,
            }}
          >
            {tiles.map((t) => (
              <PiTile
                key={t.num}
                label={t.label}
                value={t.value}
                sub={t.sub}
                sev={t.sev}
                wide={t.wide}
                num={t.num}
                spark={t.spark}
                bgImage={t.bgImage}
                icon={t.icon}
              />
            ))}
          </div>

          {/* Bottom ticker */}
          <div
            className="flex items-center shrink-0"
            style={{
              height: 44,
              borderTop: "1px solid var(--pi-border)",
              fontSize: 14,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--pi-text-dim)",
              fontWeight: 500,
              overflow: "hidden",
            }}
          >
            <div
              className="px-3 shrink-0 flex items-center gap-1.5"
              style={{
                color: "var(--pi-red)",
                borderRight: "1px solid var(--pi-border)",
                height: "100%",
              }}
            >
              <span style={{ animation: "pi-blink 1.4s ease-in-out infinite" }}>◉</span>
              <span>REC</span>
            </div>
            <div className="flex-1 overflow-hidden whitespace-nowrap relative">
              <div
                style={{
                  display: "inline-block",
                  paddingLeft: "100%",
                  animation: "pi-ticker 80s linear infinite",
                  color: "var(--pi-green)",
                }}
              >
                {tickerSegments}  ::  {tickerSegments}
              </div>
            </div>
            <div
              className="px-3 shrink-0 flex items-center gap-1.5"
              style={{
                color: "var(--pi-green)",
                borderLeft: "1px solid var(--pi-border)",
                height: "100%",
              }}
            >
              <span>UPLINK</span>
              <span style={{ letterSpacing: "0.05em" }}>▌▌▌▌</span>
            </div>
          </div>
        </div>

        {/* Scanline overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            zIndex: 5,
            background:
              "repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(0,0,0,0.18) 3px, rgba(0,0,0,0.18) 4px)",
          }}
        />
      </div>
    </>
  );
};

export default Pi;
