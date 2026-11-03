"use client";

import { useState } from "react";
import { cities, roundCoord } from "@/lib/geo";

export type LocationText = {
  city: string;
  pick: string;
  useMine: string;
  locating: string;
  denied: string;
  unsupported: string;
  selected: string;
};

/** Location permission is requested only when the person presses the button. Coordinates are rounded on the device. */
export function LocationPicker({
  latName,
  lngName,
  initialLat,
  initialLng,
  text,
}: {
  latName: string;
  lngName: string;
  initialLat?: number;
  initialLng?: number;
  text: LocationText;
}) {
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({
    lat: initialLat,
    lng: initialLng,
  });
  const [status, setStatus] = useState<"idle" | "locating" | "denied" | "unsupported">("idle");
  const [city, setCity] = useState("");

  function onCity(name: string) {
    setCity(name);
    const c = cities.find((x) => x.name === name);
    setCoords(c ? { lat: c.lat, lng: c.lng } : {});
  }
  function useMine() {
    if (!("geolocation" in navigator)) return setStatus("unsupported");
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: roundCoord(pos.coords.latitude), lng: roundCoord(pos.coords.longitude) });
        setCity("");
        setStatus("idle");
      },
      () => setStatus("denied"),
      { maximumAge: 600_000, timeout: 10_000 },
    );
  }
  return (
    <div className="space-y-2">
      <label htmlFor={`${latName}-city`} className="text-sm font-medium text-navy-900">
        {text.city}
      </label>
      <select
        id={`${latName}-city`}
        value={city}
        onChange={(e) => onCity(e.target.value)}
        className="min-h-12 w-full rounded-xl border border-line bg-white px-3"
      >
        <option value="">{text.pick}</option>
        {cities.map((c) => (
          <option key={c.name} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={useMine}
        disabled={status === "locating"}
        className="min-h-12 w-full rounded-xl border border-line bg-white font-semibold text-navy-900 disabled:opacity-60"
      >
        {status === "locating" ? text.locating : text.useMine}
      </button>
      <input type="hidden" name={latName} value={coords.lat ?? ""} />
      <input type="hidden" name={lngName} value={coords.lng ?? ""} />
      <p role="status" className="text-sm text-muted">
        {status === "denied"
          ? text.denied
          : status === "unsupported"
            ? text.unsupported
            : coords.lat != null
              ? `${text.selected}: ${coords.lat}, ${coords.lng}`
              : ""}
      </p>
    </div>
  );
}
