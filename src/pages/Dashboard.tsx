import { PageContainer } from "@/components/PageContainer";
import { useUserSettings } from "@/hooks/useUserSettings";
import { Loader2 } from "lucide-react";
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
import { Fragment } from "react";

const debugRows = new URLSearchParams(window.location.search).get("debug") === "rows";

const labelClass =
  "font-mono text-[10px] tracking-[0.2em] text-dim mb-1 uppercase";

const Dashboard = () => {
  const { settings, loading } = useUserSettings();

  if (loading || !settings) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-dim" />
        </div>
      </PageContainer>
    );
  }

  const refreshMs = (settings.refresh_interval_min || 10) * 60 * 1000;
  const { latitude: lat, longitude: lng } = settings;

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
      label: "SPACE",
      panels: [
        <SpaceWeatherPanel key="space" refreshMs={refreshMs} />,
        <NasaPanel key="nasa" refreshMs={refreshMs} />,
      ],
    },
    {
      label: "INTERNET & SYSTEM",
      panels: [
        <InternetHealthPanel key="cf" refreshMs={15 * 60 * 1000} />,
        <SystemHealthPanel key="system" refreshMin={settings.refresh_interval_min} />,
      ],
    },
  ];

  return (
    <PageContainer>
      <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs">
        <span className="text-primary">■</span>
        <span className="text-foreground uppercase tracking-wider">{settings.location_name}</span>
        <span className="text-dim">·</span>
        <span className="text-dim uppercase tracking-wider">
          {lat.toFixed(3)}, {lng.toFixed(3)} · refresh {settings.refresh_interval_min} min
        </span>
      </div>

      {/*
        Single-tree layout that adapts via CSS:
        - <md (mobile): 1-col grid, group labels render as section headers
        - md..xl-1 (tablet): 2-col grid, panels flow continuously, labels span both cols
        - xl+ (desktop): outer becomes block, inner row wrapper becomes 3-col grid with auto-rows-fr
          per group — identical to previous per-row behavior. Labels hidden unless ?debug=rows.
      */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:block gap-4 xl:gap-0">
        {groups.map((g) => (
          <Fragment key={g.label}>
            {/* Tablet + mobile label: spans both columns; hidden on desktop */}
            <div className={`${labelClass} md:col-span-2 xl:hidden mt-2 first:mt-0`}>
              {g.label}
            </div>
            {/* Desktop debug-only label */}
            {debugRows && (
              <div className={`${labelClass} hidden xl:block`}>{g.label}</div>
            )}
            {/* Row wrapper: `contents` at md so panels promote into outer 2-col grid;
                `grid` at xl restores per-row 3-col layout with equal heights */}
            <div className="contents xl:grid xl:grid-cols-3 xl:gap-4 xl:auto-rows-fr xl:mb-4">
              {g.panels}
            </div>
          </Fragment>
        ))}
      </div>
    </PageContainer>
  );
};

export default Dashboard;
