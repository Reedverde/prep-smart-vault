// Moon phase calculation — Jean Meeus simplified synodic-month formula.
// Pure, no deps, ~1-day accuracy. Works offline.

const SYNODIC = 29.53058867;
// Reference new moon: 2000-01-06 18:14 UTC (JD 2451550.26)
const REF_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0);

export type MoonPhaseInfo = {
  /** 0..1 fraction through synodic cycle (0 = new, 0.5 = full) */
  phase: number;
  /** Human-readable phase name */
  name: string;
  /** 0..100 — percent of disk illuminated as seen from Earth */
  illumination: number;
  /** Unicode emoji glyph */
  emoji: string;
  /** True when the lit limb is on the right (waxing) */
  waxing: boolean;
};

export const getMoonPhase = (date: Date = new Date()): MoonPhaseInfo => {
  const days = (date.getTime() - REF_NEW_MOON_MS) / 86_400_000;
  const phase = ((days / SYNODIC) % 1 + 1) % 1;
  // Illumination = (1 - cos(2π·phase)) / 2
  const illumination = Math.round(((1 - Math.cos(2 * Math.PI * phase)) / 2) * 100);
  const waxing = phase < 0.5;

  let name: string;
  let emoji: string;
  if (phase < 0.0303 || phase >= 0.9697) {
    name = "New Moon"; emoji = "🌑";
  } else if (phase < 0.2197) {
    name = "Waxing Crescent"; emoji = "🌒";
  } else if (phase < 0.2803) {
    name = "First Quarter"; emoji = "🌓";
  } else if (phase < 0.4697) {
    name = "Waxing Gibbous"; emoji = "🌔";
  } else if (phase < 0.5303) {
    name = "Full Moon"; emoji = "🌕";
  } else if (phase < 0.7197) {
    name = "Waning Gibbous"; emoji = "🌖";
  } else if (phase < 0.7803) {
    name = "Last Quarter"; emoji = "🌗";
  } else {
    name = "Waning Crescent"; emoji = "🌘";
  }

  return { phase, name, illumination, emoji, waxing };
};
