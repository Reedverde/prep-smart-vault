import { Panel, StatBox, ContextBox } from "@/components/Panel";
import { InfoTip, PanelSkeleton, PanelError, RefreshButton, UpdatedAgo } from "@/components/PanelKit";
import { useNationalAlerts } from "@/hooks/useDataSources";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from "recharts";

const eventColor = (event: string) => {
  const e = event.toLowerCase();
  if (e.includes("tornado") || e.includes("warning")) return "hsl(var(--severity-critical))";
  if (e.includes("watch")) return "hsl(var(--severity-severe))";
  if (e.includes("advisory")) return "hsl(var(--severity-moderate))";
  return "hsl(var(--accent))";
};

export const NationalPanel = ({ refreshMs }: { refreshMs: number }) => {
  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useNationalAlerts(refreshMs);

  const features = data || [];
  const total = features.length;
  const sev = features.filter((f: any) => ["Severe", "Extreme"].includes(f.properties.severity)).length;

  const counts: Record<string, number> = {};
  features.forEach((f: any) => {
    const e = f.properties.event;
    counts[e] = (counts[e] || 0) + 1;
  });
  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([event, count]) => ({ event: event.length > 22 ? event.slice(0, 20) + "…" : event, count }));

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

          <ContextBox>Top event types currently active across the United States.</ContextBox>
          <UpdatedAgo date={dataUpdatedAt ? new Date(dataUpdatedAt) : undefined} />
        </div>
      )}
    </Panel>
  );
};
