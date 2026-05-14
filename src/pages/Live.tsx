import { useEffect } from "react";
import { PublicTopNav } from "@/components/PublicTopNav";
import { DashboardGrid } from "@/components/DashboardGrid";

// Public read-only dashboard. No auth required. Uses fixed default location.
const PUBLIC_SETTINGS = {
  location_name: "New Castle, PA",
  latitude: 41.0034,
  longitude: -80.347,
  timezone: "America/New_York",
  refresh_interval_min: 10,
};

const Live = () => {
  const { latitude: lat, longitude: lng, refresh_interval_min, location_name, timezone } = PUBLIC_SETTINGS;

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicTopNav locationName={location_name} timezone={timezone} />
      <main className="flex-1 px-4 md:px-6 py-6 max-w-[1600px] w-full mx-auto">
        <h1 className="sr-only">PrepPi Live — Public Situational Awareness Dashboard</h1>
        <DashboardGrid
          lat={lat}
          lng={lng}
          refreshMin={refresh_interval_min}
          locationName={location_name}
          extraHeaderNote="read-only public view"
        />
      </main>
    </div>
  );
};

export default Live;
