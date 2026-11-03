"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import * as maplibregl from "maplibre-gl";
import { useEffect, useRef } from "react";
import type { MapViewProps } from "@/lib/map/adapter";

export default function MapLibreMap({ points, center, styleUrl }: MapViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const first = center ?? points[0] ?? { lat: 22.9, lng: 79.0 };
    const map = new maplibregl.Map({
      container: ref.current,
      style: styleUrl,
      center: [first.lng, first.lat],
      zoom: center || points.length ? 11 : 4,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    const markers = points.map((p) => {
      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("aria-label", p.label);
      el.style.cssText = `width:22px;height:22px;border-radius:9999px;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);background:${p.available ? "#3c9a1e" : "#5a6783"}`;
      const popup = new maplibregl.Popup({ offset: 14, closeButton: false }).setText(p.label); // setText: no HTML injection
      return new maplibregl.Marker({ element: el })
        .setLngLat([p.lng, p.lat])
        .setPopup(popup)
        .addTo(map);
    });
    return () => {
      markers.forEach((m) => m.remove());
      map.remove();
    };
  }, [points, center, styleUrl]);
  return (
    <div
      ref={ref}
      className="h-96 w-full overflow-hidden rounded-(--radius-card) border border-line"
      role="region"
      aria-label="Map"
    />
  );
}
