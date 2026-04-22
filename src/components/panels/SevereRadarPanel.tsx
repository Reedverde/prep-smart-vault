import { Panel } from "@/components/Panel";
import { InfoTip } from "@/components/PanelKit";
import { MapContainer, TileLayer, CircleMarker, Tooltip as LTooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const resolveColor = (cssVar: string): string => {
  if (typeof window === "undefined") return cssVar;
  const match = cssVar.match(/--[\w-]+/);
  if (!match) return cssVar;
  const v = getComputedStyle(document.documentElement).getPropertyValue(match[0]).trim();
  return v ? `hsl(${v})` : cssVar;
};

export const SevereRadarPanel = ({
  lat,
  lng,
  refreshMs,
}: {
  lat: number;
  lng: number;
  refreshMs: number;
}) => {
  // Cache-bust by remounting at the refresh interval
  const tick = Math.floor(Date.now() / Math.max(refreshMs, 60_000));
  const primary = resolveColor("hsl(var(--primary))");

  return (
    <Panel
      title="Severe Radar · NEXRAD"
      source="NWS / Iowa Mesonet"
      sourceUrl="https://mesonet.agron.iastate.edu/ogc/"
      action={
        <InfoTip>
          Live precipitation radar. Storms move ~30mph average — a cell 60mi southwest means ~2hr lead time. Green=light, yellow=moderate, orange/red=heavy/severe.
        </InfoTip>
      }
    >
      <div className="h-[280px] rounded-md overflow-hidden border border-border/60 bg-inset">
        <MapContainer
          key={tick}
          center={[lat, lng]}
          zoom={7}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%", background: "hsl(var(--inset))" }}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains={["a", "b", "c", "d"]}
          />
          <TileLayer
            url={`https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png?_=${tick}`}
            opacity={0.7}
          />
          <CircleMarker
            center={[lat, lng]}
            radius={7}
            pathOptions={{
              color: primary,
              fillColor: primary,
              fillOpacity: 0.5,
              weight: 2,
              opacity: 1,
            }}
          >
            <LTooltip>Your location</LTooltip>
          </CircleMarker>
        </MapContainer>
      </div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-dim mt-2">
        Tiles update every ~5 min · base radar mosaic
      </div>
    </Panel>
  );
};
