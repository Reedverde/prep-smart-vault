import { Panel, StatBox, ContextBox } from "@/components/Panel";
import { InfoTip, PanelSkeleton, PanelError, RefreshButton, UpdatedAgo } from "@/components/PanelKit";
import { useNationalAlerts } from "@/hooks/useDataSources";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from "recharts";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip as LTooltip } from "react-leaflet";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import "leaflet/dist/leaflet.css";

const eventColor = (event: string) => {
  const e = event.toLowerCase();
  if (e.includes("tornado") || e.includes("warning")) return "hsl(var(--severity-critical))";
  if (e.includes("watch")) return "hsl(var(--severity-severe))";
  if (e.includes("advisory")) return "hsl(var(--severity-moderate))";
  return "hsl(var(--accent))";
};

const resolveColor = (cssVar: string): string => {
  if (typeof window === "undefined") return cssVar;
  const match = cssVar.match(/--[\w-]+/);
  if (!match) return cssVar;
  const v = getComputedStyle(document.documentElement).getPropertyValue(match[0]).trim();
  return v ? `hsl(${v})` : cssVar;
};

// State name → USPS code map for joining GeoJSON to NWS areaDesc state codes.
const STATE_NAME_TO_USPS: Record<string, string> = {
  "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
  "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
  "District of Columbia": "DC", "Florida": "FL", "Georgia": "GA", "Hawaii": "HI",
  "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
  "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME",
  "Maryland": "MD", "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN",
  "Mississippi": "MS", "Missouri": "MO", "Montana": "MT", "Nebraska": "NE",
  "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM",
  "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH",
  "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI",
  "South Carolina": "SC", "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX",
  "Utah": "UT", "Vermont": "VT", "Virginia": "VA", "Washington": "WA",
  "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY", "Puerto Rico": "PR",
};

// Color a state by alert count using semantic severity tokens.
const heatColor = (count: number): { fill: string; opacity: number } => {
  if (count <= 0) return { fill: "transparent", opacity: 0 };
  if (count <= 10) return { fill: resolveColor("hsl(var(--severity-low))"), opacity: 0.35 };
  if (count <= 30) return { fill: resolveColor("hsl(var(--severity-moderate))"), opacity: 0.4 };
  if (count <= 60) return { fill: resolveColor("hsl(var(--severity-severe))"), opacity: 0.45 };
  return { fill: resolveColor("hsl(var(--severity-critical))"), opacity: 0.55 };
};

const useUsStatesGeo = () =>
  useQuery({
    queryKey: ["us-states-geo"],
    queryFn: async () => {
      const res = await fetch(
        "https://cdn.jsdelivr.net/gh/PublicaMundi/MappingAPI@master/data/geojson/us-states.json",
      );
      if (!res.ok) throw new Error("us-states geojson failed");
      return res.json();
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });

export const NationalPanel = ({
  refreshMs,
  lat,
  lng,
}: {
  refreshMs: number;
  lat?: number;
  lng?: number;
}) => {
  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useNationalAlerts(refreshMs);
  const { data: statesGeo } = useUsStatesGeo();

  const features = data || [];
  const total = features.length;
  const sev = features.filter((f: any) => ["Severe", "Extreme"].includes(f.properties.severity)).length;

  const counts: Record<string, number> = {};
  features.forEach((f: any) => {
    const e = f.properties.event;
    counts[e] = (counts[e] || 0) + 1;
  });
  const sortedEvents = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const top = sortedEvents
    .slice(0, 7)
    .map(([event, count]) => ({ event: event.length > 22 ? event.slice(0, 20) + "…" : event, count }));
  const dominant = sortedEvents[0];

  // State tally from areaDesc (NWS format: "Allegheny, PA; Beaver, PA")
  const stateCounts: Record<string, number> = {};
  features.forEach((f: any) => {
    const desc: string = f.properties?.areaDesc || "";
    const seenStates = new Set<string>();
    desc.split(";").forEach((segment) => {
      const parts = segment.split(",").map((p) => p.trim());
      const last = parts[parts.length - 1];
      if (last && /^[A-Z]{2}$/.test(last)) seenStates.add(last);
    });
    seenStates.forEach((s) => {
      stateCounts[s] = (stateCounts[s] || 0) + 1;
    });
  });
  const topStates = Object.entries(stateCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const ratio = total > 0 ? sev / total : 0;
  let interpretation = "Normal alert volume";
  let interpretationClass = "text-severity-low";
  if (ratio > 0.4) {
    interpretation = "Major severe weather event nationwide";
    interpretationClass = "text-severity-critical";
  } else if (ratio >= 0.2) {
    interpretation = "Elevated severe weather";
    interpretationClass = "text-severity-moderate";
  }

  const primary = resolveColor("hsl(var(--primary))");
  const dim = resolveColor("hsl(var(--dim))");

  // Stable style + onEachFeature handlers for GeoJSON
  const styleFn = useMemo(
    () => (feature: any) => {
      const name = feature?.properties?.name || feature?.properties?.NAME;
      const usps = name ? STATE_NAME_TO_USPS[name] : null;
      const c = usps ? stateCounts[usps] || 0 : 0;
      const { fill, opacity } = heatColor(c);
      return {
        fillColor: fill,
        fillOpacity: opacity,
        color: dim,
        weight: 0.5,
        opacity: 0.6,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(stateCounts), dim],
  );

  const onEachFeature = (feature: any, layer: any) => {
    const name = feature?.properties?.name || feature?.properties?.NAME;
    const usps = name ? STATE_NAME_TO_USPS[name] : null;
    const c = usps ? stateCounts[usps] || 0 : 0;
    layer.bindTooltip(`${name}: ${c} alert${c === 1 ? "" : "s"}`, {
      sticky: true,
      className: "leaflet-tooltip-mono",
    });
  };

  // Force GeoJSON layer to re-render when counts change (Leaflet caches layers).
  const geoKey = useMemo(() => JSON.stringify(stateCounts), [stateCounts]);

  return (
    <Panel
      title="National · US Alerts"
      source="NWS"
      sourceUrl="https://www.weather.gov/alerts"
      action={
        <>
          <InfoTip>All active NWS alerts across the US, broken down by event type.</InfoTip>
          <RefreshButton onClick={() => refetch()} loading={isFetching} />
        </>
      }
    >
      {isLoading ? (
        <PanelSkeleton rows={4} />
      ) : error ? (
        <PanelError message="Could not load national alerts" onRetry={() => refetch()} />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <StatBox label="Total Active" value={total} hint="nationwide" />
            <StatBox label="Severe / Extreme" value={sev} hint="elevated risk" />
          </div>

          <div style={{ height: Math.max(120, top.length * 26) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="event"
                  width={130}
                  tick={{ fill: "hsl(var(--dim))", fontSize: 10, fontFamily: "monospace" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                  {top.map((d, i) => (
                    <Cell key={i} fill={eventColor(d.event)} />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="right"
                    style={{ fill: "hsl(var(--foreground))", fontSize: 10, fontFamily: "monospace" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* US Heat Map */}
          <div className="h-[240px] rounded-md overflow-hidden border border-border/60 bg-inset">
            <MapContainer
              center={[39.5, -98.35]}
              zoom={3}
              scrollWheelZoom={false}
              zoomControl={false}
              style={{ height: "100%", width: "100%", background: "hsl(var(--inset))" }}
              attributionControl={false}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                subdomains={["a", "b", "c", "d"]}
              />
              {statesGeo && (
                <GeoJSON
                  key={geoKey}
                  data={statesGeo as any}
                  style={styleFn as any}
                  onEachFeature={onEachFeature}
                />
              )}
              {Number.isFinite(lat) && Number.isFinite(lng) && (
                <CircleMarker
                  center={[lat as number, lng as number]}
                  radius={6}
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
              )}
            </MapContainer>
          </div>

          <div className="space-y-1">
            {total > 0 && (
              <div className={`font-mono text-xs font-semibold ${interpretationClass}`}>
                {interpretation}
              </div>
            )}
            {dominant && (
              <div className="font-mono text-[11px] text-dim">
                Dominant: <span className="text-foreground">{dominant[0]}</span> ({dominant[1]})
              </div>
            )}
            {topStates.length > 0 && (
              <div className="font-mono text-[11px] text-dim">
                Most active:{" "}
                {topStates.map(([s, c], i) => (
                  <span key={s}>
                    <span className="text-foreground">{s}</span> ({c})
                    {i < topStates.length - 1 ? " · " : ""}
                  </span>
                ))}
              </div>
            )}
          </div>

          <ContextBox>Top event types currently active across the United States. Map shaded by alert density per state.</ContextBox>
          <UpdatedAgo date={dataUpdatedAt ? new Date(dataUpdatedAt) : undefined} />
        </div>
      )}
    </Panel>
  );
};
