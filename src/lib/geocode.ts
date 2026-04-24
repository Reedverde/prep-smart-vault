// Reverse geocoding via OpenStreetMap Nominatim (no API key required).
// Respect their usage policy: <1 req/sec, identify the app via Referer.
// https://operations.osmfoundation.org/policies/nominatim/

export type ReverseGeocodeResult = {
  name: string;
  timezone?: string;
};

export const reverseGeocode = async (
  lat: number,
  lng: number,
): Promise<ReverseGeocodeResult> => {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
    String(lat),
  )}&lon=${encodeURIComponent(String(lng))}&zoom=10&addressdetails=1`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Reverse geocode failed (${res.status})`);
  }

  const data = await res.json();
  const a = data?.address ?? {};
  const city =
    a.city || a.town || a.village || a.hamlet || a.suburb || a.county || "";
  const region = a.state_code || a.state || a.region || "";
  const country = a.country_code ? a.country_code.toUpperCase() : a.country || "";

  let name = "";
  if (city && region) name = `${city}, ${region}`;
  else if (city) name = country ? `${city}, ${country}` : city;
  else if (region) name = country ? `${region}, ${country}` : region;
  else name = data?.display_name?.split(",").slice(0, 2).join(",").trim() || "Unknown";

  return { name };
};

export const detectBrowserTimezone = (): string | undefined => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
};
