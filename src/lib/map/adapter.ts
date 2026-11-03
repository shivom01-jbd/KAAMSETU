/**
 * Map provider boundary. Pages and components depend only on these types.
 * Add a provider by implementing a component with MapViewProps and registering it in
 * src/components/map/results-map.tsx. Providers today: "none" (default) and "maplibre".
 */
export type MapPoint = { id: string; lat: number; lng: number; label: string; available: boolean };
export type MapViewProps = {
  points: MapPoint[];
  center?: { lat: number; lng: number };
  styleUrl: string;
};
export type MapProviderId = "none" | "maplibre";

export function getMapProvider(): MapProviderId {
  return process.env.NEXT_PUBLIC_MAP_PROVIDER === "maplibre" ? "maplibre" : "none";
}
export const mapStyleUrl = () => process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "";
