import { Fragment, useEffect } from "react";
import { PublicTopNav } from "@/components/PublicTopNav";
import { WeatherPanel } from "@/components/panels/WeatherPanel";
import { AlertsPanel } from "@/components/panels/AlertsPanel";
import { EarthquakesPanel } from "@/components/panels/EarthquakesPanel";
import { SpaceWeatherPanel } from "@/components/panels/SpaceWeatherPanel";
import { AirQualityPanel } from "@/components/panels/AirQualityPanel";
import { NationalPanel } from "@/components/panels/NationalPanel";
import { ConflictPulsePanel } from "@/components/panels/ConflictPulsePanel";
import { ActiveDisastersPanel } from "@/components/panels/ActiveDisastersPanel";
import { SystemHealthPanel } from "@/components/panels/SystemHealthPanel";
import { NasaPanel } from "@/components/panels/NasaPanel";
import { GridStatusPanel } from "@/components/panels/GridStatusPanel";
import { GlobalHeadlinesPanel } from "@/components/panels/GlobalHeadlinesPanel";
import { SevereRadarPanel } from "@/components/panels/SevereRadarPanel";
import { HazardousOutlookPanel } from "@/components/panels/HazardousOutlookPanel";
import { ScannerAudioPanel } from "@/components/panels/ScannerAudioPanel";
import { FuelPricesPanel } from "@/components/panels/FuelPricesPanel";
import { FinancialStressPanel } from "@/components/panels/FinancialStressPanel";
import { PowerOutagesPanel } from "@/components/panels/PowerOutagesPanel";
import { InternetHealthPanel } from "@/components/panels/InternetHealthPanel";

// Public read-only dashboard. No auth required. Uses fixed default location.
const PUBLIC_SETTINGS = {
  location_name: "New Castle, PA",
  latitude: 41.0034,
  longitude: -80.347,
  timezone: "America/New_York",
  refresh_interval_min: 10,
};

const debugRows = new URLSearchParams(window.location.search).get("debug") === "rows";

const labelClass =
  "font-mono text-[10px] tracking-[0.2em] text-dim mb-1 uppercase";

const Live = () => {
  const { latitude: lat, longitude: lng, refresh_interval_min, location_name, timezone } = PUBLIC_SETTINGS;
  const refreshMs = refresh_interval_min * 60 * 1000;

  useEffect(() => {
    document.title = `PrepPi Live · ${location_name}`;
    const desc = "Live read-only situational awareness dashboard: weather, alerts, earthquakes, space weather, air quality, and global signals.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);
  }, [location_name]);

  const groups: { label: string; panels: JSX.Element[] }[] = [
    {
      label: "LOCAL",
      panels: [
        <WeatherPanel key="weather" lat={lat} lng={lng} refreshMs={refreshMs} />,
        <AlertsPanel key="alerts" lat={lat} lng={lng} refreshMs={refreshMs} />,
        <AirQualityPanel key="aq" lat={lat} lng={lng} refreshMs={refreshMs} />,
      ],
    },
    {
      label: "NEWS + NATIONAL",
      panels: [
        <GlobalHeadlinesPanel key="headlines" refreshMs={refreshMs} />,
        <NationalPanel key="national" refreshMs={refreshMs} lat={lat} lng={lng} />,
        <GridStatusPanel key="grid" refreshMs={refreshMs} />,
      ],
    },
    {
      label: "WORLD",
      panels: [
        <EarthquakesPanel key="quakes" refreshMs={refreshMs} lat={lat} lng={lng} />,
        <ActiveDisastersPanel key="disasters" refreshMs={refreshMs} />,
        <ConflictPulsePanel key="conflict" refreshMs={refreshMs} />,
      ],
    },
    {
      label: "SPACE + SYSTEM",
      panels: [
        <SpaceWeatherPanel key="space" refreshMs={refreshMs} />,
        <NasaPanel key="nasa" refreshMs={refreshMs} />,
        <SystemHealthPanel key="system" refreshMin={refresh_interval_min} />,
      ],
    },
    {
      label: "LOCAL WEATHER DEEP DIVE",
      panels: [
        <SevereRadarPanel key="radar" lat={lat} lng={lng} refreshMs={5 * 60 * 1000} />,
        <HazardousOutlookPanel key="hwo" lat={lat} lng={lng} refreshMs={30 * 60 * 1000} />,
        <ScannerAudioPanel key="scanner" />,
      ],
    },
    {
      label: "MARKETS & INFRASTRUCTURE",
      panels: [
        <FuelPricesPanel key="fuel" refreshMs={60 * 60 * 1000} />,
        <FinancialStressPanel key="fred" refreshMs={60 * 60 * 1000} />,
        <PowerOutagesPanel key="outages" refreshMs={5 * 60 * 1000} />,
      ],
    },
    {
      label: "INTERNET & COMMS",
      panels: [
        <InternetHealthPanel key="cf" refreshMs={15 * 60 * 1000} />,
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicTopNav locationName={location_name} timezone={timezone} />
      <main className="flex-1 px-4 md:px-6 py-6 max-w-[1600px] w-full mx-auto">
        <h1 className="sr-only">PrepPi Live — Public Situational Awareness Dashboard</h1>
        <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs">
          <span className="text-primary">■</span>
          <span className="text-foreground uppercase tracking-wider">{location_name}</span>
          <span className="text-dim">·</span>
          <span className="text-dim uppercase tracking-wider">
            {lat.toFixed(3)}, {lng.toFixed(3)} · refresh {refresh_interval_min} min
          </span>
          <span className="text-dim">·</span>
          <span className="text-dim uppercase tracking-wider">read-only public view</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:block gap-4 xl:gap-0">
          {groups.map((g) => (
            <Fragment key={g.label}>
              <div className={`${labelClass} md:col-span-2 xl:hidden mt-2 first:mt-0`}>
                {g.label}
              </div>
              {debugRows && (
                <div className={`${labelClass} hidden xl:block`}>{g.label}</div>
              )}
              <div className="contents xl:grid xl:grid-cols-3 xl:gap-4 xl:auto-rows-fr xl:mb-4">
                {g.panels}
              </div>
            </Fragment>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Live;
