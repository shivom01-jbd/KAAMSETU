/** ~1.1 km precision. Used for every stored or shared coordinate. */
export const roundCoord = (n: number) => Math.round(n * 100) / 100;

export const INDIA_BOUNDS = { latMin: 6, latMax: 38, lngMin: 68, lngMax: 98 } as const;

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(bLat - aLat) / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLng - aLng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

/** Manual location entry without any external geocoder. */
export const cities = [
  { name: "Lucknow", lat: 26.85, lng: 80.95 },
  { name: "Kanpur", lat: 26.45, lng: 80.33 },
  { name: "Varanasi", lat: 25.32, lng: 82.97 },
  { name: "Prayagraj", lat: 25.44, lng: 81.85 },
  { name: "Agra", lat: 27.18, lng: 78.02 },
  { name: "Noida", lat: 28.54, lng: 77.39 },
  { name: "Delhi", lat: 28.61, lng: 77.21 },
  { name: "Gurugram", lat: 28.46, lng: 77.03 },
  { name: "Jaipur", lat: 26.91, lng: 75.79 },
  { name: "Indore", lat: 22.72, lng: 75.86 },
  { name: "Bhopal", lat: 23.26, lng: 77.41 },
  { name: "Mumbai", lat: 19.08, lng: 72.88 },
  { name: "Pune", lat: 18.52, lng: 73.86 },
  { name: "Ahmedabad", lat: 23.02, lng: 72.57 },
  { name: "Surat", lat: 21.17, lng: 72.83 },
  { name: "Nagpur", lat: 21.15, lng: 79.09 },
  { name: "Hyderabad", lat: 17.39, lng: 78.49 },
  { name: "Bengaluru", lat: 12.97, lng: 77.59 },
  { name: "Chennai", lat: 13.08, lng: 80.27 },
  { name: "Kolkata", lat: 22.57, lng: 88.36 },
  { name: "Patna", lat: 25.59, lng: 85.14 },
  { name: "Chandigarh", lat: 30.73, lng: 76.78 },
] as const;
