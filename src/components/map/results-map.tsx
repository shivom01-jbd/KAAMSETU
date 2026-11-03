"use client";

import dynamic from "next/dynamic";
import { Alert } from "@/components/ui/feedback";
import { getMapProvider, mapStyleUrl, type MapPoint } from "@/lib/map/adapter";

const MapLibreMap = dynamic(() => import("./maplibre-map"), {
  ssr: false,
  loading: () => <div className="h-96 animate-pulse rounded-(--radius-card) bg-brand-100" />,
});

export function ResultsMap({
  points,
  center,
  unavailableText,
}: {
  points: MapPoint[];
  center?: { lat: number; lng: number };
  unavailableText: string;
}) {
  const provider = getMapProvider();
  const styleUrl = mapStyleUrl();
  if (provider === "maplibre" && styleUrl)
    return <MapLibreMap points={points} center={center} styleUrl={styleUrl} />;
  return <Alert kind="info">{unavailableText}</Alert>;
}
