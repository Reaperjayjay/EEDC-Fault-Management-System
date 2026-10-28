import { useEffect, useRef, useState } from "react";

// How often we are willing to send a new position to the server.
const MIN_INTERVAL_MS = 15 * 1000; // at most one update every 15 seconds while moving
const MIN_DISTANCE_M = 20; // ignore tiny GPS jitter below 20 metres
const HEARTBEAT_MS = 2 * 60 * 1000; // still send every 2 minutes even if standing still

const toRad = (degrees) => (degrees * Math.PI) / 180;

// Straight-line distance between two points in metres (haversine formula).
const distanceMeters = (a, b) => {
  const earthRadius = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
};

const shouldSend = (previous, point, now) => {
  if (!previous) return true; // first reading is always sent
  const elapsed = now - previous.time;
  if (elapsed >= HEARTBEAT_MS) return true;
  return elapsed >= MIN_INTERVAL_MS && distanceMeters(previous, point) >= MIN_DISTANCE_M;
};

const friendlyError = (error) => {
  if (error.code === 1) {
    return "Location permission was denied. Allow location access in your browser site settings.";
  }
  if (error.code === 2) return "Your position is currently unavailable. Check that GPS or location services are on.";
  if (error.code === 3) return "Getting your position timed out. Trying again…";
  return error.message || "Could not get your location.";
};

/**
 * Watches the device position while `enabled` is true and calls
 * `onSend({ lat, lng, accuracy })` whenever a new position is worth saving.
 *
 * Returns { position, error, lastSentAt } so the page can show the status.
 */
export default function useLiveLocation({ enabled, onSend }) {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState("");
  const [lastSentAt, setLastSentAt] = useState(null);

  const lastSent = useRef(null);
  const sending = useRef(false);
  const onSendRef = useRef(onSend);

  // Always call the latest onSend without restarting the GPS watch.
  useEffect(() => {
    onSendRef.current = onSend;
  }, [onSend]);

  useEffect(() => {
    if (!enabled) return undefined;

    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported by this browser.");
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (reading) => {
        const point = {
          lat: reading.coords.latitude,
          lng: reading.coords.longitude,
          accuracy: reading.coords.accuracy,
        };
        setPosition(point);

        const now = Date.now();
        if (sending.current || !shouldSend(lastSent.current, point, now)) return;

        sending.current = true;
        try {
          await onSendRef.current(point);
          lastSent.current = { ...point, time: now };
          setLastSentAt(now);
          setError("");
        } catch (sendError) {
          setError(sendError.message || "Could not send your location.");
        } finally {
          sending.current = false;
        }
      },
      (geoError) => setError(friendlyError(geoError)),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      lastSent.current = null; // send immediately the next time tracking starts
    };
  }, [enabled]);

  return { position, error, lastSentAt };
}