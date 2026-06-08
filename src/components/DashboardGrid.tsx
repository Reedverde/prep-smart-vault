import { Fragment, ReactNode } from "react";
import { Play } from "lucide-react";
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
import { EnergyCostsPanel } from "@/components/panels/EnergyCostsPanel";
import { FinancialStressPanel } from "@/components/panels/FinancialStressPanel";
import { PowerOutagesPanel } from "@/components/panels/PowerOutagesPanel";
import { InternetHealthPanel } from "@/components/panels/InternetHealthPanel";
import { MoonPhasePanel } from "@/components/panels/MoonPhasePanel";
import { SectionBoundary } from "@/components/errors/SectionBoundary";
import { PanelTileBoundary } from "@/components/errors/TileBoundary";

const debugRows =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("debug") === "rows";

const labelClass =
  "font-mono text-[10px] tracking-[0.2em] text-dim mb-1 uppercase";

interface DashboardGridProps {
  lat: number;
  lng: number;
  refreshMin: number;
  locationName: string;
  extraHeaderNote?: ReactNode;
  showScannerButton?: boolean;
}

export const DashboardGrid = ({
  lat,
  lng,
  refreshMin,
  locationName,
  extraHeaderNote,
  showScannerButton = true,
}: DashboardGridProps) => {
  const refreshMs = refreshMin * 60 * 1000;

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
        <MoonPhasePanel key="moon" lat={lat} lng={lng} />,
      ],
    },
    {
      label: "MARKETS & INFRASTRUCTURE",
      panels: [
        <EnergyCostsPanel key="energy" refreshMs={60 * 60 * 1000} />,
        <FinancialStressPanel key="fred" refreshMs={60 * 60 * 1000} />,
        <PowerOutagesPanel key="outages" refreshMs={5 * 60 * 1000} />,
      ],
    },
    {
      label: "NATIONAL",
      panels: [
        <NationalPanel key="national" refreshMs={refreshMs} lat={lat} lng={lng} />,
        <GridStatusPanel key="grid" refreshMs={refreshMs} />,
        <EarthquakesPanel key="quakes" refreshMs={refreshMs} lat={lat} lng={lng} />,
      ],
    },
    {
      label: "NEWS & INTERNET",
      panels: [
        <GlobalHeadlinesPanel key="headlines" refreshMs={refreshMs} />,
        <ConflictPulsePanel key="conflict" refreshMs={refreshMs} />,
        <InternetHealthPanel key="cf" refreshMs={15 * 60 * 1000} />,
      ],
    },
    {
      label: "WORLD & SPACE",
      panels: [
        <ActiveDisastersPanel key="disasters" refreshMs={refreshMs} />,
        <SpaceWeatherPanel key="space" refreshMs={refreshMs} />,
        <NasaPanel key="nasa" refreshMs={refreshMs} />,
      ],
    },
    {
      label: "SYSTEM",
      panels: [<SystemHealthPanel key="system" refreshMin={refreshMin} />],
    },
  ];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs">
        <span className="text-primary">■</span>
        <span className="text-foreground uppercase tracking-wider">{locationName}</span>
        <span className="text-dim">·</span>
        <span className="text-dim uppercase tracking-wider">
          {lat.toFixed(3)}, {lng.toFixed(3)} · refresh {refreshMin} min
        </span>
        {extraHeaderNote && (
          <>
            <span className="text-dim">·</span>
            <span className="text-dim uppercase tracking-wider">{extraHeaderNote}</span>
          </>
        )}
        {showScannerButton && (
          <a
            href="https://www.broadcastify.com/listen/feed/33610"
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded border border-accent/60 text-accent font-mono text-[11px] uppercase tracking-wider hover:bg-accent/10 transition-colors"
          >
            <Play className="h-3 w-3 fill-current" /> Local Scanner · Tune In
          </a>
        )}
      </div>

      <SectionBoundary variant="panel">
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
                {g.panels.map((p) => (
                  <PanelTileBoundary key={p.key ?? Math.random()} label={String(p.key ?? "panel")}>
                    {p}
                  </PanelTileBoundary>
                ))}
              </div>
            </Fragment>
          ))}
        </div>
      </SectionBoundary>
    </>
  );
};
