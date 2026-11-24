"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";

// Fix standard Leaflet default marker icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function createCustomPin(color: string, severityLevel: string) {
  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 700;
        font-size: 11px;
        border: 3px solid white;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      ">
        ${severityLevel === "CRITICAL" ? "!" : severityLevel === "HIGH" ? "▲" : "●"}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

function CenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export interface MapMarkerItem {
  id: string;
  trackingCode: string;
  title: string;
  description: string;
  status: string;
  category: string;
  department: string;
  latitude: number;
  longitude: number;
  address?: string;
  photoUrl: string;
  afterPhotoUrl?: string | null;
  dynamicSeverity: number;
  severityLevel: string;
  upvoteCount: number;
  childIssueCount: number;
  wardName: string;
  markerColor: string;
}

interface CivicMapInnerProps {
  markers: MapMarkerItem[];
  selectedMarkerId?: string | null;
  center?: [number, number];
  zoom?: number;
  onMarkerClick?: (marker: MapMarkerItem) => void;
}

export default function CivicMapInner({
  markers,
  selectedMarkerId,
  center = [12.9784, 77.6408], // Default Indiranagar / Bengaluru
  zoom = 14,
  onMarkerClick,
}: CivicMapInnerProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={true}
      className="w-full h-full min-h-[280px] sm:min-h-[360px] lg:min-h-[500px]"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CenterMap center={center} />

      {markers.map((marker) => {
        const pinIcon = createCustomPin(marker.markerColor, marker.severityLevel);

        return (
          <React.Fragment key={marker.id}>
            <Marker
              position={[marker.latitude, marker.longitude]}
              icon={pinIcon}
              eventHandlers={{
                click: () => onMarkerClick && onMarkerClick(marker),
              }}
            >
              <Popup className="civic-popup">
                <div className="p-1 max-w-xs text-slate-900">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {marker.trackingCode}
                    </span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                      style={{ backgroundColor: marker.markerColor }}
                    >
                      {marker.status.replace("_", " ")}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-slate-900 leading-snug line-clamp-1">
                    {marker.title}
                  </h4>
                  <p className="text-xs text-slate-500 mb-2">{marker.category} • {marker.wardName}</p>

                  <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 mb-2">
                    <img
                      src={marker.afterPhotoUrl || marker.photoUrl}
                      alt={marker.title}
                      className="w-full h-full object-cover"
                    />
                    {marker.afterPhotoUrl && (
                      <span className="absolute bottom-1 right-1 bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                        Resolved Proof
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="font-semibold text-slate-700">
                      Severity: <span className="font-bold">{marker.dynamicSeverity}</span>
                    </span>
                    <Link
                      href={`/issues/${marker.id}`}
                      className="text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-0.5"
                    >
                      Audit Flow <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>

            {/* If critical or high severity, show subtle danger perimeter circle */}
            {marker.severityLevel === "CRITICAL" && (
              <Circle
                center={[marker.latitude, marker.longitude]}
                radius={40}
                pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.15 }}
              />
            )}
          </React.Fragment>
        );
      })}
    </MapContainer>
  );
}
