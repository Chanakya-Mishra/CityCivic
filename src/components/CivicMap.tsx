"use client";

import dynamic from "next/dynamic";
import React from "react";
import type { MapMarkerItem } from "./CivicMapInner";

const CivicMapInner = dynamic(() => import("./CivicMapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[450px] bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">Initializing Interactive Geospatial Map...</span>
      </div>
    </div>
  ),
});

export interface CivicMapProps {
  markers: MapMarkerItem[];
  selectedMarkerId?: string | null;
  center?: [number, number];
  zoom?: number;
  onMarkerClick?: (marker: MapMarkerItem) => void;
}

export function CivicMap(props: CivicMapProps) {
  return <CivicMapInner {...props} />;
}
