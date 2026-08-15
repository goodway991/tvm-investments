export type CountryOption = {
  code: string;
  name: string;
  timeZone: string;
};

/** Major countries / territories with a default IANA zone. Time zone picker lists every zone. */
export const COUNTRIES: CountryOption[] = [
  { code: "US", name: "United States", timeZone: "America/New_York" },
  { code: "CA", name: "Canada", timeZone: "America/Toronto" },
  { code: "MX", name: "Mexico", timeZone: "America/Mexico_City" },
  { code: "GT", name: "Guatemala", timeZone: "America/Guatemala" },
  { code: "HN", name: "Honduras", timeZone: "America/Tegucigalpa" },
  { code: "SV", name: "El Salvador", timeZone: "America/El_Salvador" },
  { code: "NI", name: "Nicaragua", timeZone: "America/Managua" },
  { code: "CR", name: "Costa Rica", timeZone: "America/Costa_Rica" },
  { code: "PA", name: "Panama", timeZone: "America/Panama" },
  { code: "CU", name: "Cuba", timeZone: "America/Havana" },
  { code: "DO", name: "Dominican Republic", timeZone: "America/Santo_Domingo" },
  { code: "PR", name: "Puerto Rico", timeZone: "America/Puerto_Rico" },
  { code: "JM", name: "Jamaica", timeZone: "America/Jamaica" },
  { code: "TT", name: "Trinidad and Tobago", timeZone: "America/Port_of_Spain" },
  { code: "BS", name: "Bahamas", timeZone: "America/Nassau" },
  { code: "BB", name: "Barbados", timeZone: "America/Barbados" },
  { code: "HT", name: "Haiti", timeZone: "America/Port-au-Prince" },
  { code: "BR", name: "Brazil", timeZone: "America/Sao_Paulo" },
  { code: "AR", name: "Argentina", timeZone: "America/Argentina/Buenos_Aires" },
  { code: "CL", name: "Chile", timeZone: "America/Santiago" },
  { code: "CO", name: "Colombia", timeZone: "America/Bogota" },
  { code: "PE", name: "Peru", timeZone: "America/Lima" },
  { code: "VE", name: "Venezuela", timeZone: "America/Caracas" },
  { code: "EC", name: "Ecuador", timeZone: "America/Guayaquil" },
  { code: "BO", name: "Bolivia", timeZone: "America/La_Paz" },
  { code: "PY", name: "Paraguay", timeZone: "America/Asuncion" },
  { code: "UY", name: "Uruguay", timeZone: "America/Montevideo" },
  { code: "GY", name: "Guyana", timeZone: "America/Guyana" },
  { code: "SR", name: "Suriname", timeZone: "America/Paramaribo" },
  { code: "GB", name: "United Kingdom", timeZone: "Europe/London" },
  { code: "IE", name: "Ireland", timeZone: "Europe/Dublin" },
  { code: "FR", name: "France", timeZone: "Europe/Paris" },
  { code: "DE", name: "Germany", timeZone: "Europe/Berlin" },
  { code: "IT", name: "Italy", timeZone: "Europe/Rome" },
  { code: "ES", name: "Spain", timeZone: "Europe/Madrid" },
  { code: "PT", name: "Portugal", timeZone: "Europe/Lisbon" },
  { code: "NL", name: "Netherlands", timeZone: "Europe/Amsterdam" },
  { code: "BE", name: "Belgium", timeZone: "Europe/Brussels" },
  { code: "LU", name: "Luxembourg", timeZone: "Europe/Luxembourg" },
  { code: "CH", name: "Switzerland", timeZone: "Europe/Zurich" },
  { code: "AT", name: "Austria", timeZone: "Europe/Vienna" },
  { code: "SE", name: "Sweden", timeZone: "Europe/Stockholm" },
  { code: "NO", name: "Norway", timeZone: "Europe/Oslo" },
  { code: "DK", name: "Denmark", timeZone: "Europe/Copenhagen" },
  { code: "FI", name: "Finland", timeZone: "Europe/Helsinki" },
  { code: "IS", name: "Iceland", timeZone: "Atlantic/Reykjavik" },
  { code: "PL", name: "Poland", timeZone: "Europe/Warsaw" },
  { code: "CZ", name: "Czechia", timeZone: "Europe/Prague" },
  { code: "SK", name: "Slovakia", timeZone: "Europe/Bratislava" },
  { code: "HU", name: "Hungary", timeZone: "Europe/Budapest" },
  { code: "RO", name: "Romania", timeZone: "Europe/Bucharest" },
  { code: "BG", name: "Bulgaria", timeZone: "Europe/Sofia" },
  { code: "GR", name: "Greece", timeZone: "Europe/Athens" },
  { code: "HR", name: "Croatia", timeZone: "Europe/Zagreb" },
  { code: "SI", name: "Slovenia", timeZone: "Europe/Ljubljana" },
  { code: "RS", name: "Serbia", timeZone: "Europe/Belgrade" },
  { code: "BA", name: "Bosnia and Herzegovina", timeZone: "Europe/Sarajevo" },
  { code: "ME", name: "Montenegro", timeZone: "Europe/Podgorica" },
  { code: "MK", name: "North Macedonia", timeZone: "Europe/Skopje" },
  { code: "AL", name: "Albania", timeZone: "Europe/Tirane" },
  { code: "UA", name: "Ukraine", timeZone: "Europe/Kyiv" },
  { code: "MD", name: "Moldova", timeZone: "Europe/Chisinau" },
  { code: "BY", name: "Belarus", timeZone: "Europe/Minsk" },
  { code: "LT", name: "Lithuania", timeZone: "Europe/Vilnius" },
  { code: "LV", name: "Latvia", timeZone: "Europe/Riga" },
  { code: "EE", name: "Estonia", timeZone: "Europe/Tallinn" },
  { code: "RU", name: "Russia", timeZone: "Europe/Moscow" },
  { code: "TR", name: "Turkey", timeZone: "Europe/Istanbul" },
  { code: "CY", name: "Cyprus", timeZone: "Asia/Nicosia" },
  { code: "MT", name: "Malta", timeZone: "Europe/Malta" },
  { code: "IL", name: "Israel", timeZone: "Asia/Jerusalem" },
  { code: "PS", name: "Palestine", timeZone: "Asia/Gaza" },
  { code: "JO", name: "Jordan", timeZone: "Asia/Amman" },
  { code: "LB", name: "Lebanon", timeZone: "Asia/Beirut" },
  { code: "SY", name: "Syria", timeZone: "Asia/Damascus" },
  { code: "IQ", name: "Iraq", timeZone: "Asia/Baghdad" },
  { code: "IR", name: "Iran", timeZone: "Asia/Tehran" },
  { code: "SA", name: "Saudi Arabia", timeZone: "Asia/Riyadh" },
  { code: "AE", name: "United Arab Emirates", timeZone: "Asia/Dubai" },
  { code: "QA", name: "Qatar", timeZone: "Asia/Qatar" },
  { code: "KW", name: "Kuwait", timeZone: "Asia/Kuwait" },
  { code: "BH", name: "Bahrain", timeZone: "Asia/Bahrain" },
  { code: "OM", name: "Oman", timeZone: "Asia/Muscat" },
  { code: "YE", name: "Yemen", timeZone: "Asia/Aden" },
  { code: "EG", name: "Egypt", timeZone: "Africa/Cairo" },
  { code: "LY", name: "Libya", timeZone: "Africa/Tripoli" },
  { code: "TN", name: "Tunisia", timeZone: "Africa/Tunis" },
  { code: "DZ", name: "Algeria", timeZone: "Africa/Algiers" },
  { code: "MA", name: "Morocco", timeZone: "Africa/Casablanca" },
  { code: "SD", name: "Sudan", timeZone: "Africa/Khartoum" },
  { code: "ET", name: "Ethiopia", timeZone: "Africa/Addis_Ababa" },
  { code: "KE", name: "Kenya", timeZone: "Africa/Nairobi" },
  { code: "UG", name: "Uganda", timeZone: "Africa/Kampala" },
  { code: "TZ", name: "Tanzania", timeZone: "Africa/Dar_es_Salaam" },
  { code: "RW", name: "Rwanda", timeZone: "Africa/Kigali" },
  { code: "NG", name: "Nigeria", timeZone: "Africa/Lagos" },
  { code: "GH", name: "Ghana", timeZone: "Africa/Accra" },
  { code: "CI", name: "Côte d’Ivoire", timeZone: "Africa/Abidjan" },
  { code: "SN", name: "Senegal", timeZone: "Africa/Dakar" },
  { code: "CM", name: "Cameroon", timeZone: "Africa/Douala" },
  { code: "CD", name: "DR Congo", timeZone: "Africa/Kinshasa" },
  { code: "CG", name: "Republic of the Congo", timeZone: "Africa/Brazzaville" },
  { code: "AO", name: "Angola", timeZone: "Africa/Luanda" },
  { code: "ZA", name: "South Africa", timeZone: "Africa/Johannesburg" },
  { code: "NA", name: "Namibia", timeZone: "Africa/Windhoek" },
  { code: "BW", name: "Botswana", timeZone: "Africa/Gaborone" },
  { code: "ZW", name: "Zimbabwe", timeZone: "Africa/Harare" },
  { code: "ZM", name: "Zambia", timeZone: "Africa/Lusaka" },
  { code: "MZ", name: "Mozambique", timeZone: "Africa/Maputo" },
  { code: "MU", name: "Mauritius", timeZone: "Indian/Mauritius" },
  { code: "IN", name: "India", timeZone: "Asia/Kolkata" },
  { code: "PK", name: "Pakistan", timeZone: "Asia/Karachi" },
  { code: "BD", name: "Bangladesh", timeZone: "Asia/Dhaka" },
  { code: "LK", name: "Sri Lanka", timeZone: "Asia/Colombo" },
  { code: "NP", name: "Nepal", timeZone: "Asia/Kathmandu" },
  { code: "BT", name: "Bhutan", timeZone: "Asia/Thimphu" },
  { code: "AF", name: "Afghanistan", timeZone: "Asia/Kabul" },
  { code: "CN", name: "China", timeZone: "Asia/Shanghai" },
  { code: "HK", name: "Hong Kong", timeZone: "Asia/Hong_Kong" },
  { code: "MO", name: "Macau", timeZone: "Asia/Macau" },
  { code: "TW", name: "Taiwan", timeZone: "Asia/Taipei" },
  { code: "JP", name: "Japan", timeZone: "Asia/Tokyo" },
  { code: "KR", name: "South Korea", timeZone: "Asia/Seoul" },
  { code: "KP", name: "North Korea", timeZone: "Asia/Pyongyang" },
  { code: "MN", name: "Mongolia", timeZone: "Asia/Ulaanbaatar" },
  { code: "VN", name: "Vietnam", timeZone: "Asia/Ho_Chi_Minh" },
  { code: "TH", name: "Thailand", timeZone: "Asia/Bangkok" },
  { code: "KH", name: "Cambodia", timeZone: "Asia/Phnom_Penh" },
  { code: "LA", name: "Laos", timeZone: "Asia/Vientiane" },
  { code: "MM", name: "Myanmar", timeZone: "Asia/Yangon" },
  { code: "MY", name: "Malaysia", timeZone: "Asia/Kuala_Lumpur" },
  { code: "SG", name: "Singapore", timeZone: "Asia/Singapore" },
  { code: "ID", name: "Indonesia", timeZone: "Asia/Jakarta" },
  { code: "PH", name: "Philippines", timeZone: "Asia/Manila" },
  { code: "BN", name: "Brunei", timeZone: "Asia/Brunei" },
  { code: "AU", name: "Australia", timeZone: "Australia/Sydney" },
  { code: "NZ", name: "New Zealand", timeZone: "Pacific/Auckland" },
  { code: "PG", name: "Papua New Guinea", timeZone: "Pacific/Port_Moresby" },
  { code: "FJ", name: "Fiji", timeZone: "Pacific/Fiji" },
  { code: "WS", name: "Samoa", timeZone: "Pacific/Apia" },
  { code: "TO", name: "Tonga", timeZone: "Pacific/Tongatapu" },
  { code: "NC", name: "New Caledonia", timeZone: "Pacific/Noumea" },
  { code: "PF", name: "French Polynesia", timeZone: "Pacific/Tahiti" },
  { code: "GU", name: "Guam", timeZone: "Pacific/Guam" },
  { code: "KZ", name: "Kazakhstan", timeZone: "Asia/Almaty" },
  { code: "UZ", name: "Uzbekistan", timeZone: "Asia/Tashkent" },
  { code: "TM", name: "Turkmenistan", timeZone: "Asia/Ashgabat" },
  { code: "KG", name: "Kyrgyzstan", timeZone: "Asia/Bishkek" },
  { code: "TJ", name: "Tajikistan", timeZone: "Asia/Dushanbe" },
  { code: "GE", name: "Georgia", timeZone: "Asia/Tbilisi" },
  { code: "AM", name: "Armenia", timeZone: "Asia/Yerevan" },
  { code: "AZ", name: "Azerbaijan", timeZone: "Asia/Baku" },
];

export function flagFromCode(code: string) {
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(
    ...[...code].map((letter) => 0x1f1e6 - 65 + letter.charCodeAt(0)),
  );
}

export function countryByCode(code: string) {
  return COUNTRIES.find((country) => country.code === code);
}

export function listTimeZones(): string[] {
  try {
    const supported = (
      Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }
    ).supportedValuesOf?.("timeZone");
    if (supported?.length) return supported;
  } catch {
    /* older engines */
  }
  return Array.from(new Set(COUNTRIES.map((country) => country.timeZone))).sort();
}

export function isValidCountry(code: string) {
  return COUNTRIES.some((country) => country.code === code);
}

export function isValidTimeZone(zone: string) {
  if (!zone || zone.length > 64) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: zone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function zoneClock(timeZone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "long",
  }).formatToParts(now);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: Number(map.hour),
    minute: Number(map.minute),
    weekday: map.weekday,
    ymd: `${map.year}-${map.month}-${map.day}`,
  };
}

export function guessLocale() {
  const timeZone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
  const locale = Intl.DateTimeFormat().resolvedOptions().locale || "en-US";
  const region = locale.split("-").pop()?.toUpperCase() || "";
  const country =
    COUNTRIES.find((row) => row.code === region) ||
    COUNTRIES.find((row) => row.timeZone === timeZone) ||
    COUNTRIES[0];
  return { country: country.code, timeZone };
}
