// Bundled Texas place table, so distance never needs a paid geocoding service.
// Coordinates are city centers (about a mile of error), good enough for "how far".

export type Place = { name: string; lat: number; lng: number };

const city = (name: string, lat: number, lng: number): Place => ({ name, lat, lng });

export const places: Place[] = [
  city("McAllen", 26.2034, -98.23),
  city("Edinburg", 26.3017, -98.1633),
  city("Mission", 26.2159, -98.3253),
  city("Pharr", 26.1948, -98.1836),
  city("San Juan", 26.1895, -98.1556),
  city("Alamo", 26.1834, -98.1231),
  city("Donna", 26.1704, -98.0511),
  city("Weslaco", 26.1595, -97.9908),
  city("Mercedes", 26.1498, -97.9136),
  city("Elsa", 26.2937, -97.993),
  city("Edcouch", 26.2945, -97.9608),
  city("Progreso", 26.0951, -97.95),
  city("Hidalgo", 26.1001, -98.263),
  city("Palmview", 26.2284, -98.3786),
  city("La Joya", 26.2434, -98.4817),
  city("Peñitas", 26.2331, -98.4469),
  city("Rio Grande City", 26.3795, -98.8203),
  city("Roma", 26.4053, -99.0187),
  city("Raymondville", 26.4812, -97.7833),
  city("Harlingen", 26.1906, -97.6961),
  city("San Benito", 26.1326, -97.6311),
  city("Brownsville", 25.9017, -97.4975),
  city("Los Fresnos", 26.0734, -97.4767),
  city("Port Isabel", 26.0734, -97.2086),
  city("South Padre Island", 26.1118, -97.1681),
  city("Corpus Christi", 27.8006, -97.3964),
  city("Laredo", 27.5306, -99.4803),
  city("San Antonio", 29.4241, -98.4936),
  city("Austin", 30.2672, -97.7431),
  city("Houston", 29.7604, -95.3698),
  city("Dallas", 32.7767, -96.797),
  city("El Paso", 31.7619, -106.485),
];

const byName = new Map(places.map((p) => [fold(p.name), p]));

function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const zipCities: Record<string, string> = {};
function zips(cityName: string, list: string) {
  for (const z of list.split(" ")) zipCities[z] = cityName;
}
zips("McAllen", "78501 78502 78503 78504 78505");
zips("Alamo", "78516");
zips("Donna", "78537");
zips("Edcouch", "78538");
zips("Edinburg", "78539 78540 78541 78542");
zips("Elsa", "78543");
zips("Hidalgo", "78557");
zips("La Joya", "78560");
zips("Mission", "78572 78573 78574");
zips("Mercedes", "78570");
zips("Peñitas", "78576");
zips("Pharr", "78577");
zips("San Juan", "78589");
zips("Weslaco", "78596 78599");
zips("Harlingen", "78550 78551 78552");
zips("San Benito", "78586");
zips("Brownsville", "78520 78521 78522 78523 78526");
zips("Los Fresnos", "78566");
zips("Port Isabel", "78578");
zips("South Padre Island", "78597");
zips("Raymondville", "78580");
zips("Rio Grande City", "78582");
zips("Roma", "78584");
zips("Corpus Christi", "78401 78404 78405 78408 78410 78411 78412 78413 78414 78415 78416 78418");
zips("Laredo", "78040 78041 78043 78045 78046");
zips("El Paso", "79901 79902 79903 79904 79905 79907 79912 79924 79925 79936");

const prefixCities: Record<string, string> = {
  "785": "McAllen",
  "784": "Corpus Christi",
  "780": "Laredo",
  "782": "San Antonio",
  "787": "Austin",
  "770": "Houston",
  "771": "Houston",
  "772": "Houston",
  "752": "Dallas",
  "799": "El Paso",
};

export function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

/** Finds a place from a typed city name or 5-digit ZIP. Returns null when unknown. */
export function lookupPlace(input: string): Place | null {
  const text = input.trim();
  if (!text) return null;
  const zip = text.match(/\b(\d{5})\b/)?.[1];
  if (zip) {
    const name = zipCities[zip] ?? prefixCities[zip.slice(0, 3)];
    return name ? (byName.get(fold(name)) ?? null) : null;
  }
  const folded = fold(text.replace(/,?\s*(tx|texas)$/i, ""));
  const direct = byName.get(folded);
  if (direct) return direct;
  // "mcallen texas", "city of mcallen", "pharr tx 78577" and similar.
  for (const [name, place] of byName) {
    if (folded === name || folded.includes(name)) return place;
  }
  return null;
}

/** The bundled place closest to a coordinate, with how far away it is. */
export function nearestPlace(point: { lat: number; lng: number }): { place: Place; miles: number } {
  let best = places[0];
  let bestMiles = Infinity;
  for (const p of places) {
    const miles = haversineMiles(point, p);
    if (miles < bestMiles) {
      best = p;
      bestMiles = miles;
    }
  }
  return { place: best, miles: bestMiles };
}

/** Miles between two named places, or null when either is not in the table. */
export function milesBetween(from: { lat: number; lng: number }, cityName: string | null): number | null {
  if (!cityName) return null;
  const place = lookupPlace(cityName);
  if (!place) return null;
  return Math.round(haversineMiles(from, place));
}
