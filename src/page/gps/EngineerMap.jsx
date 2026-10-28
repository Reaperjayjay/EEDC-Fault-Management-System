import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";
import { statusStyles } from "./gpsStyles";

const DEFAULT_CENTER = [9.0765, 7.3986]; // used when there are no engineers
const DEFAULT_ZOOM = 11;

const statusColors = {
  "En Route": "#3b82f6",
  "On Site": "#22c55e",
  Idle: "#eab308",
  Offline: "#9ca3af",
};

// Coloured dot marker (avoids Leaflet's default-icon problems with Vite)
function makeIcon(status, selected) {
  const color = statusColors[status] ?? statusColors.Offline;
  const size = selected ? 22 : 16;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);${
      selected ? "outline:4px solid rgba(59,130,246,.35);" : ""
    }"></span>`,
  });
}

// Zooms the map to fit all engineers
function FitToEngineers({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) map.setView(points[0], 14);
    else map.fitBounds(points, { padding: [40, 40] });
  }, [points, map]);
  return null;
}

// Moves to the engineer you select
function FlyToSelected({ engineer }) {
  const map = useMap();
  useEffect(() => {
    if (engineer) map.flyTo([engineer.lat, engineer.lng], Math.max(map.getZoom(), 14));
  }, [engineer, map]);
  return null;
}

// Re-measures the map when its box changes size (e.g. sidebar opens/closes)
function ResizeFix() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

export default function EngineerMap({ engineers, selectedId, onSelect }) {
  const located = useMemo(
    () => engineers.filter((e) => Number.isFinite(e.lat) && Number.isFinite(e.lng)),
    [engineers]
  );
  const points = useMemo(() => located.map((e) => [e.lat, e.lng]), [located]);
  const selected = located.find((e) => e.id === selectedId) ?? null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm text-gray-900">Live Map</h3>
        <div className="hidden items-center gap-3 text-[11px] text-gray-500 sm:flex">
          {Object.entries(statusStyles).map(([name, s]) => (
            <span key={name} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${s.dot}`} />
              {name}
            </span>
          ))}
        </div>
      </div>

      {/* "isolate" keeps Leaflet's high z-index from covering your header/sidebar */}
      <div className="relative isolate h-80 overflow-hidden rounded-xl border border-gray-200 md:h-96">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <ResizeFix />
          <FitToEngineers points={points} />
          <FlyToSelected engineer={selected} />

          {located.map((e) => (
            <Marker
              key={e.id}
              position={[e.lat, e.lng]}
              icon={makeIcon(e.status, e.id === selectedId)}
              eventHandlers={{ click: () => onSelect(e.id) }}
            >
              <Tooltip direction="top" offset={[0, -10]}>
                {e.name} · {e.status}
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>

        {located.length === 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-[500] flex justify-center">
            <span className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-500 shadow-sm">
              <MapPin className="h-3.5 w-3.5" /> No engineer locations yet
            </span>
          </div>
        )}
      </div>
    </section>
  );
}