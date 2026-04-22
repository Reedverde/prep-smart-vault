// Country name → ISO2 → flag emoji helper.
// Shared by GlobalHeadlinesPanel and ConflictPulsePanel.

export const COUNTRY_TO_ISO2: Record<string, string> = {
  "united states": "US", "usa": "US", "united kingdom": "GB", "uk": "GB",
  "canada": "CA", "australia": "AU", "new zealand": "NZ", "ireland": "IE",
  "france": "FR", "germany": "DE", "italy": "IT", "spain": "ES", "portugal": "PT",
  "netherlands": "NL", "belgium": "BE", "switzerland": "CH", "austria": "AT",
  "sweden": "SE", "norway": "NO", "denmark": "DK", "finland": "FI", "poland": "PL",
  "ukraine": "UA", "russia": "RU", "belarus": "BY", "turkey": "TR", "greece": "GR",
  "israel": "IL", "palestine": "PS", "iran": "IR", "iraq": "IQ", "syria": "SY",
  "lebanon": "LB", "saudi arabia": "SA", "egypt": "EG", "south africa": "ZA",
  "nigeria": "NG", "kenya": "KE", "ethiopia": "ET", "sudan": "SD",
  "china": "CN", "japan": "JP", "south korea": "KR", "north korea": "KP",
  "india": "IN", "pakistan": "PK", "bangladesh": "BD", "afghanistan": "AF",
  "indonesia": "ID", "philippines": "PH", "vietnam": "VN", "thailand": "TH",
  "malaysia": "MY", "singapore": "SG", "taiwan": "TW", "hong kong": "HK",
  "mexico": "MX", "brazil": "BR", "argentina": "AR", "chile": "CL",
  "colombia": "CO", "venezuela": "VE", "peru": "PE",
};

export const flagEmoji = (country: string): string => {
  if (!country) return "";
  const iso = COUNTRY_TO_ISO2[country.toLowerCase().trim()];
  if (!iso) return "";
  const codePoints = iso.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
};
