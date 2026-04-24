import { useState, useCallback } from "react";

export type GeoCoords = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

export const useGeolocation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentPosition = useCallback((): Promise<GeoCoords> => {
    return new Promise((resolve, reject) => {
      if (!("geolocation" in navigator)) {
        const msg = "Geolocation is not supported by this device";
        setError(msg);
        reject(new Error(msg));
        return;
      }

      setLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLoading(false);
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        (err) => {
          setLoading(false);
          let msg = "Could not get location";
          if (err.code === err.PERMISSION_DENIED) {
            msg = "Location permission denied. Enable it in your browser settings.";
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            msg = "Location unavailable on this device.";
          } else if (err.code === err.TIMEOUT) {
            msg = "Location request timed out.";
          }
          setError(msg);
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
      );
    });
  }, []);

  return { getCurrentPosition, loading, error };
};
