import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  name: string;
  category?: string;
  popup?: string;
}

interface LeafletMapProps {
  center: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  polyline?: [number, number][];
  fitBounds?: boolean;
  userLocation?: { lat: number; lng: number } | null;
  zoomControl?: boolean;
  className?: string;
  height?: string;
}

// Fix Leaflet default icon path issue with bundlers
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const userIcon = L.divIcon({
  className: "user-location-marker",
  html: `<div style="
    width: 16px; height: 16px;
    background: #2D6A5A;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 0 0 4px rgba(45,106,90,0.3), 0 2px 6px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

export function LeafletMap({
  center,
  zoom = 14,
  markers = [],
  polyline,
  fitBounds = false,
  userLocation,
  zoomControl = false,
  className = "",
  height = "200px",
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center,
      zoom,
      zoomControl,
      scrollWheelZoom: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Small attribution in corner
    L.control.attribution({ position: "bottomright", prefix: false })
      .addAttribution('© <a href="https://openstreetmap.org">OSM</a>')
      .addTo(map);

    mapInstanceRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update center
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(center, zoom);
    }
  }, [center[0], center[1], zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update markers
  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    markers.forEach((m) => {
      const marker = L.marker([m.lat, m.lng], { icon: defaultIcon });
      if (m.popup || m.name) {
        marker.bindPopup(
          `<div style="font-family: Inter, sans-serif; font-size: 12px;">
            <strong>${m.name}</strong>
            ${m.category ? `<br/><span style="color: #6B7280;">${m.category}</span>` : ""}
          </div>`
        );
      }
      markersLayerRef.current!.addLayer(marker);
    });
  }, [markers]);

  // Update user location
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (userMarkerRef.current) {
      mapInstanceRef.current.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }

    if (userLocation) {
      userMarkerRef.current = L.marker(
        [userLocation.lat, userLocation.lng],
        { icon: userIcon }
      ).addTo(mapInstanceRef.current);
    }
  }, [userLocation?.lat, userLocation?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // Draw polyline connecting points
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (polylineRef.current) {
      mapInstanceRef.current.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    if (polyline && polyline.length >= 2) {
      polylineRef.current = L.polyline(polyline, {
        color: "#2D6A5A",
        weight: 2.5,
        opacity: 0.7,
        dashArray: "8, 6",
      }).addTo(mapInstanceRef.current);

      if (fitBounds) {
        mapInstanceRef.current.fitBounds(polylineRef.current.getBounds(), { padding: [30, 30] });
      }
    }
  }, [polyline, fitBounds]);

  return (
    <div
      ref={mapRef}
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{ height, width: "100%" }}
    />
  );
}
