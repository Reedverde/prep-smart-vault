// Moon rise/set times — pure offline calculation.
// Uses a low-precision lunar position (Meeus, ch. 47 simplified) and scans
// altitude in 10-minute steps over a 24-hour window centered on local noon.
// Accuracy: ~±2 min, sufficient for kiosk display.

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

// Moon position in equatorial coords (RA radians, Dec radians) from JD.
// Simplified Meeus formula — good to ~0.5°.
const moonPosition = (jd: number) => {
  const T = (jd - 2451545.0) / 36525;
  // Mean longitude
  const Lp = (218.3164477 + 481267.88123421 * T) * DEG;
  // Mean elongation
  const D = (297.8501921 + 445267.1114034 * T) * DEG;
  // Sun's mean anomaly
  const M = (357.5291092 + 35999.0502909 * T) * DEG;
  // Moon's mean anomaly
  const Mp = (134.9633964 + 477198.8675055 * T) * DEG;
  // Argument of latitude
  const F = (93.272095 + 483202.0175233 * T) * DEG;

  // Ecliptic longitude (deg)
  const lon =
    Lp * RAD +
    6.289 * Math.sin(Mp) -
    1.274 * Math.sin(Mp - 2 * D) +
    0.658 * Math.sin(2 * D) -
    0.186 * Math.sin(M) -
    0.059 * Math.sin(2 * Mp - 2 * D);
  // Ecliptic latitude (deg)
  const lat =
    5.128 * Math.sin(F) +
    0.281 * Math.sin(Mp + F) -
    0.278 * Math.sin(F - Mp) -
    0.173 * Math.sin(F - 2 * D);

  const lonR = lon * DEG;
  const latR = lat * DEG;
  // Obliquity of ecliptic
  const eps = 23.4397 * DEG;
  const ra = Math.atan2(
    Math.sin(lonR) * Math.cos(eps) - Math.tan(latR) * Math.sin(eps),
    Math.cos(lonR),
  );
  const dec = Math.asin(
    Math.sin(latR) * Math.cos(eps) + Math.cos(latR) * Math.sin(eps) * Math.sin(lonR),
  );
  return { ra, dec };
};

// Greenwich mean sidereal time in radians.
const gmst = (jd: number) => {
  const T = (jd - 2451545.0) / 36525;
  let g =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T;
  g = ((g % 360) + 360) % 360;
  return g * DEG;
};

// Altitude (rad) of moon at given UTC date and observer lat/lng.
const moonAltitude = (date: Date, latDeg: number, lngDeg: number) => {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const { ra, dec } = moonPosition(jd);
  const lst = gmst(jd) + lngDeg * DEG;
  const ha = lst - ra;
  const phi = latDeg * DEG;
  const alt = Math.asin(
    Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(ha),
  );
  return alt;
};

export type MoonTimes = {
  rise: Date | null;
  set: Date | null;
  alwaysUp: boolean;
  alwaysDown: boolean;
};

// Refraction + parallax adjustment: moon "rises" when geometric altitude
// equals about -0.583° (semi-diameter + refraction).
const HORIZON = -0.583 * DEG;

// Compute next moonrise and next moonset within a 24h window starting at `from`.
export const getMoonTimes = (
  from: Date,
  latDeg: number,
  lngDeg: number,
): MoonTimes => {
  const stepMin = 10;
  const stepMs = stepMin * 60 * 1000;
  const totalSteps = (24 * 60) / stepMin;

  let prevAlt = moonAltitude(from, latDeg, lngDeg) - HORIZON;
  let rise: Date | null = null;
  let set: Date | null = null;
  let anyAbove = prevAlt > 0;
  let anyBelow = prevAlt < 0;

  for (let i = 1; i <= totalSteps; i++) {
    const t = new Date(from.getTime() + i * stepMs);
    const alt = moonAltitude(t, latDeg, lngDeg) - HORIZON;
    if (alt > 0) anyAbove = true;
    if (alt < 0) anyBelow = true;
    if (prevAlt < 0 && alt >= 0 && rise == null) {
      // Linear interp for crossing
      const frac = -prevAlt / (alt - prevAlt);
      rise = new Date(t.getTime() - stepMs + frac * stepMs);
    } else if (prevAlt > 0 && alt <= 0 && set == null) {
      const frac = prevAlt / (prevAlt - alt);
      set = new Date(t.getTime() - stepMs + frac * stepMs);
    }
    prevAlt = alt;
    if (rise && set) break;
  }

  return {
    rise,
    set,
    alwaysUp: !anyBelow,
    alwaysDown: !anyAbove,
  };
};

// Next time the moon reaches a given phase fraction (0=new, 0.5=full).
// Returns Date in the future. Coarse scan in days.
export const getNextPhase = (target: number, from: Date = new Date()): Date => {
  const SYN = 29.53058867;
  const REF = Date.UTC(2000, 0, 6, 18, 14, 0);
  const dayMs = 86400000;
  for (let d = 0; d < 35; d++) {
    const t = from.getTime() + d * dayMs;
    const phase = ((((t - REF) / dayMs) / SYN) % 1 + 1) % 1;
    const next = from.getTime() + (d + 1) * dayMs;
    const phaseNext = ((((next - REF) / dayMs) / SYN) % 1 + 1) % 1;
    // Detect crossing target (handle wrap-around)
    const crosses =
      (phase <= target && phaseNext > target) ||
      (phase > phaseNext && (target > phase || target <= phaseNext));
    if (crosses) {
      // Refine within the day
      const frac =
        target > phase
          ? (target - phase) / (phaseNext - phase || 1)
          : (target + 1 - phase) / (phaseNext + 1 - phase || 1);
      return new Date(t + frac * dayMs);
    }
  }
  return new Date(from.getTime() + SYN * dayMs);
};
