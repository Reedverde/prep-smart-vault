import { Panel, StatBox, ContextBox } from "@/components/Panel";
import { InfoTip, PanelSkeleton, PanelError, RefreshButton, UpdatedAgo } from "@/components/PanelKit";
import { useEarthquakes } from "@/hooks/useDataSources";
import { BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer } from "recharts";
import { formatDistanceToNow, startOfDay, format } from "date-fns";
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip as LTooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const magBucket = (mag: number) => (mag >= 5 ? "M5+" : mag >= 4 ? "M4-5" : "M2.5-4");
const magColor = (mag: number) =>
  mag >= 5 ? "hsl(var(--severity-critical))" : mag >= 4 ? "hsl(var(--severity-moderate))" : "hsl(var(--dim))";
const magRadius = (mag: number) => (mag >= 5 ? 7 : mag >= 4 ? 5 : 3);

// Resolve hsl(var(--token)) to a concrete color string Leaflet/SVG can use.
const resolveColor = (cssVar: string): string => {
  if (typeof window === "undefined") return cssVar;
  const match = cssVar.match(/--[\w-]+/);
  if (!match) return cssVar;
  const v = getComputedStyle(document.documentElement).getPropertyValue(match[0]).trim();
  return v ? `hsl(${v})` : cssVar;
};

export const EarthquakesPanel = ({ refreshMs, lat, lng }: { refreshMs: number; lat: number; lng: number }) => {
  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useEarthquakes(refreshMs);

  const events = data || [];
  const total = events.length;
  const largest = events.reduce((m: number, e: any) => Math.max(m, e.properties.mag || 0), 0);

  // Build daily buckets for past 7 days
  const today = startOfDay(new Date());
  const daily: Record<string, { day: string; "M2.5-4": number; "M4-5": number; "M5+": number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const k = format(d, "MM/dd");
    daily[k] = { day: k, "M2.5-4": 0, "M4-5": 0, "M5+": 0 };
  }
  events.forEach((e: any) => {
    const k = format(new Date(e.properties.time), "MM/dd");
    if (daily[k]) (daily[k] as any)[magBucket(e.properties.mag)]++;
  });
  const chartData = Object.values(daily);

  const recent = [...events]
    .sort((a: any, b: any) => b.properties.time - a.properties.time)
    .slice(0, 5);

  const primary = resolveColor("hsl(var(--primary))");

  return (
    <Panel
      title="Earthquakes · 7d"
      source="USGS"
      sourceUrl="https://earthquake.usgs.gov/earthquakes/map/"
      action={
        <>
          <InfoTip>All M2.5+ quakes globally in past 7 days. M2.5-4 felt locally · M4-6 moderate · M6+ structural damage possible.</InfoTip>
          <RefreshButton onClick={() => refetch()} loading={isFetching} />
        </>
      }
    >
      {isLoading ? (
        <PanelSkeleton rows={4} />
      ) : error ? (
        <PanelError message="Could not load USGS data" onRetry={() => refetch()} />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <StatBox label="Total M2.5+" value={total} hint="past 7 days" />
            <StatBox
              label="Largest"
              value={largest.toFixed(1)}
              unit="M"
              hint={largest >= 5 ? "Significant" : largest >= 4 ? "Moderate" : "Minor"}
            />
          </div>

          {/* Map */}
          <div className="h-[200px] rounded-md overflow-hidden border border-border/60 bg-inset">
            <MapContainer
              center={[lat, lng]}
              zoom={2}
              scrollWheelZoom={false}
              worldCopyJump
              style={{ height: "100%", width: "100%", background: "hsl(var(--inset))" }}
              attributionControl={false}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                subdomains={["a", "b", "c", "d"]}
              />
              {events.map((e: any) => {
                const [lng2, lat2] = e.geometry?.coordinates || [];
                if (!Number.isFinite(lat2) || !Number.isFinite(lng2)) return null;
                const mag = e.properties.mag || 0;
                const color = magColor(mag);
                return (
                  <CircleMarker
                    key={e.id}
                    center={[lat2, lng2]}
                    radius={magRadius(mag)}
                    pathOptions={{
                      color: resolveColor(color),
                      fillColor: resolveColor(color),
                      fillOpacity: 0.7,
                      weight: 1,
                      opacity: 0.9,
                    }}
                  >
                    <Popup>
                      <div className="font-mono text-[11px] leading-snug">
                        <div className="font-semibold">M{mag.toFixed(1)}</div>
                        <div>{e.properties.place}</div>
                        <a
                          href={e.properties.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 underline"
                        >
                          USGS detail ↗
                        </a>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
              {Number.isFinite(lat) && Number.isFinite(lng) && (
                <CircleMarker
                  center={[lat, lng]}
                  radius={8}
                  pathOptions={{
                    color: primary,
                    fillColor: primary,
                    fillOpacity: 0.4,
                    weight: 2,
                    opacity: 1,
                  }}
                >
                  <LTooltip>Your location</LTooltip>
                </CircleMarker>
              )}
            </MapContainer>
          </div>

          <div className="h-32 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fill: "hsl(var(--dim))", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--dim))", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <ReTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11, fontFamily: "monospace" }} />
                <Bar dataKey="M2.5-4" stackId="a" fill="hsl(var(--dim))" />
                <Bar dataKey="M4-5" stackId="a" fill="hsl(var(--severity-moderate))" />
                <Bar dataKey="M5+" stackId="a" fill="hsl(var(--severity-critical))" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-dim">Most recent</div>
            {recent.map((e: any) => (
              <a
                key={e.id}
                href={e.properties.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 py-1 hover:bg-secondary/40 rounded px-1 transition-colors"
              >
                <span
                  className="font-mono text-xs font-semibold w-10 tabular-nums"
                  style={{ color: magColor(e.properties.mag) }}
                >
                  M{e.properties.mag.toFixed(1)}
                </span>
                <span className="font-mono text-[11px] text-foreground flex-1 truncate">{e.properties.place}</span>
                <span className="font-mono text-[10px] text-dim">
                  {formatDistanceToNow(new Date(e.properties.time), { addSuffix: true })}
                </span>
              </a>
            ))}
          </div>

          <ContextBox>
            Magnitude scale: M2.5–4 felt locally · M4–6 moderate impact · M6+ potential structural damage.
          </ContextBox>
          <UpdatedAgo date={dataUpdatedAt ? new Date(dataUpdatedAt) : undefined} />
        </div>
      )}
    </Panel>
  );
};
