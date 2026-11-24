"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CivicMap } from "@/components/CivicMap";
import { useAuth } from "@/context/AuthContext";
import {
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  ThumbsUp,
  Plus,
  Filter,
  Flame,
  ArrowRight,
  ShieldCheck,
  Search,
  Sparkles,
  Droplets,
  Lightbulb,
  Construction,
  Trash2,
  CheckCircle,
} from "lucide-react";

export default function HomePage() {
  const { user, openAuthModal } = useAuth();
  const [markers, setMarkers] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedWard, setSelectedWard] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>([12.9784, 77.6408]);
  const [mobileView, setMobileView] = useState<"both" | "map" | "feed">("both");

  // Fetch categories once on mount (cached)
  useEffect(() => {
    fetch("/api/categories")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.categories) setCategories(data.categories);
      })
      .catch((err) => console.warn("Failed to fetch categories:", err));
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedWard !== "ALL") params.append("wardId", selectedWard);
      if (selectedCategory !== "ALL") params.append("categoryCode", selectedCategory);
      if (selectedStatus !== "ALL") params.append("status", selectedStatus);

      const mapRes = await fetch(`/api/public/map?${params.toString()}`);
      if (mapRes.ok) {
        const mapData = await mapRes.json();
        setMarkers(mapData.markers || []);
        setWards(mapData.wards || []);

        if (selectedWard !== "ALL") {
          const ward = mapData.wards.find((w: any) => w.id === selectedWard);
          if (ward) setMapCenter([ward.centerLat, ward.centerLng]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedWard, selectedCategory, selectedStatus]);

  const handleUpvote = async (issueId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      openAuthModal();
      return;
    }

    // 1. Instant optimistic UI update (0ms perceived latency)
    setMarkers((prev) =>
      prev.map((m) =>
        m.id === issueId ? { ...m, upvoteCount: (m.upvoteCount || 0) + 1 } : m
      )
    );

    try {
      const res = await fetch(`/api/issues/${issueId}/upvote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        // Rollback on failure
        setMarkers((prev) =>
          prev.map((m) =>
            m.id === issueId ? { ...m, upvoteCount: Math.max(0, (m.upvoteCount || 1) - 1) } : m
          )
        );
        const err = await res.json();
        alert(err.error || "Failed to upvote");
      }
    } catch {
      // Rollback on network failure
      setMarkers((prev) =>
        prev.map((m) =>
          m.id === issueId ? { ...m, upvoteCount: Math.max(0, (m.upvoteCount || 1) - 1) } : m
        )
      );
      alert("Network error while registering upvote.");
    }
  };

  const filteredMarkers = markers.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.trackingCode.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q) ||
      m.wardName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Brand Hero Banner */}
      <div className="bg-gradient-to-br from-[#0c1f38] via-[#0f2b48] to-[#063e3d] rounded-2xl p-6 sm:p-8 text-white shadow-xl mb-6 relative overflow-hidden border border-teal-900/40">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-12 top-6 opacity-10 hidden md:block pointer-events-none">
          <img src="/logo-icon.png" alt="Watermark" className="w-56 h-56 object-contain" />
        </div>

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-teal-300 mb-3 border border-white/10">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Community-Verified Civic Action</span>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <img
              src="/logo-icon.png"
              alt="CityCivic"
              className="w-10 h-10 object-contain drop-shadow-md sm:w-12 sm:h-12"
            />
            <div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
                city<span className="text-teal-400">civic</span>
              </h1>
              <p className="text-[11px] sm:text-xs tracking-widest uppercase font-bold text-teal-200/90 -mt-0.5">
                Resolving Urban Issues Together
              </p>
            </div>
          </div>

          <p className="mt-2 text-slate-200 text-sm sm:text-base leading-relaxed">
            Eliminating duplicate complaints through spatial clustering, prioritizing genuine hazards through community voting, and enforcing verified photographic proof before any ticket is closed.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/report"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold rounded-xl text-sm transition shadow-lg shadow-teal-500/25"
            >
              <Plus className="w-4 h-4" />
              Report Civic Issue
            </Link>
            <Link
              href="/officer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl text-sm transition backdrop-blur-sm border border-white/10"
            >
              Ward Officer Work Orders
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white font-medium rounded-xl text-sm transition backdrop-blur-sm"
            >
              City Analytics
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Architectural Civic Pillars */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-teal-400 transition">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-900">50m Spatial Cluster</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-snug">
            Auto-merges nearby duplicate citizen reports into a single Master Ticket to stop inbox flooding.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-teal-400 transition">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
              <MapPin className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-900">Hardware GPS Lock</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-snug">
            Locked satellite coordinates & EXIF validation to eliminate fake or spoofed complaints.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-teal-400 transition">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-50 flex items-center justify-center text-cyan-700">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-900">Gemini Vision Gate</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-snug">
            Automated AI visual inspection confirms real civic damage before accepting tickets.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-teal-400 transition">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-900">72h Public Dispute</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-snug">
            Requires photographic fix proof before closing tickets, with citizen dispute protection.
          </p>
        </div>
      </div>

      {/* Filter Toolbar & Quick-Filter Chips */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-6 space-y-3">
        {/* Quick Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider shrink-0 mr-1">
            Quick Filter:
          </span>
          <button
            onClick={() => {
              setSelectedCategory("ALL");
              setSelectedStatus("ALL");
            }}
            className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition ${
              selectedCategory === "ALL" && selectedStatus === "ALL"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Incidents
          </button>
          <button
            onClick={() => {
              setSelectedCategory("POTHOLE");
              setSelectedStatus("ALL");
            }}
            className={`px-3 py-1.5 rounded-xl font-medium shrink-0 flex items-center gap-1.5 transition ${
              selectedCategory === "POTHOLE"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100"
            }`}
          >
            <Construction className="w-3.5 h-3.5" />
            <span>Potholes & Roads</span>
          </button>
          <button
            onClick={() => {
              setSelectedCategory("STREETLIGHT");
              setSelectedStatus("ALL");
            }}
            className={`px-3 py-1.5 rounded-xl font-medium shrink-0 flex items-center gap-1.5 transition ${
              selectedCategory === "STREETLIGHT"
                ? "bg-yellow-600 text-white shadow-xs"
                : "bg-yellow-50 text-yellow-800 hover:bg-yellow-100"
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Streetlights</span>
          </button>
          <button
            onClick={() => {
              setSelectedCategory("WATER_LEAK");
              setSelectedStatus("ALL");
            }}
            className={`px-3 py-1.5 rounded-xl font-medium shrink-0 flex items-center gap-1.5 transition ${
              selectedCategory === "WATER_LEAK"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-blue-50 text-blue-800 hover:bg-blue-100"
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>Water & Sewage</span>
          </button>
          <button
            onClick={() => {
              setSelectedCategory("GARBAGE");
              setSelectedStatus("ALL");
            }}
            className={`px-3 py-1.5 rounded-xl font-medium shrink-0 flex items-center gap-1.5 transition ${
              selectedCategory === "GARBAGE"
                ? "bg-emerald-700 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Sanitation</span>
          </button>
          <button
            onClick={() => {
              setSelectedCategory("ALL");
              setSelectedStatus("OFFICIALLY_RESOLVED");
            }}
            className={`px-3 py-1.5 rounded-xl font-medium shrink-0 flex items-center gap-1.5 transition ${
              selectedStatus === "OFFICIALLY_RESOLVED"
                ? "bg-teal-700 text-white shadow-xs"
                : "bg-teal-50 text-teal-800 hover:bg-teal-100"
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Verified Fixed</span>
          </button>
        </div>

        {/* Detailed Dropdowns & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search box */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by tracking code, pothole, road..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Ward Selector */}
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">All Municipal Wards</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code}: {w.name}
                </option>
              ))}
            </select>

            {/* Category Selector */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Status Selector */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="PROVISIONALLY_RESOLVED">Provisionally Resolved</option>
              <option value="REOPENED_DISPUTED">Disputed (Reopened)</option>
              <option value="OFFICIALLY_RESOLVED">Officially Resolved</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Layers className="w-4 h-4 text-teal-600" />
            <span>Showing {filteredMarkers.length} incidents</span>
          </div>
        </div>
      </div>

      {/* Mobile View Toggle Pills (< lg) */}
      <div className="flex lg:hidden bg-slate-100 p-1 rounded-xl mb-4 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setMobileView("both")}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
            mobileView === "both"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>Map & Feed</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView("map")}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
            mobileView === "map"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
          <span>Map Only</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView("feed")}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
            mobileView === "feed"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-emerald-600" />
          <span>Feed ({filteredMarkers.length})</span>
        </button>
      </div>

      {/* Main Grid: Interactive Map + Incident Cards Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Map Column (7 cols on desktop, responsive isolated on mobile) */}
        <div
          className={`lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-3 overflow-hidden flex flex-col relative lg:sticky lg:top-24 isolate ${
            mobileView === "feed" ? "hidden lg:flex" : "flex"
          } ${mobileView === "map" ? "h-[75vh]" : "h-[340px] sm:h-[460px] lg:h-[720px]"}`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs gap-2">
            <span className="font-bold text-slate-800 flex items-center gap-1.5 shrink-0">
              <MapPin className="w-4 h-4 text-emerald-600" />
              Live City GIS Map
            </span>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] text-slate-600">
              <span className="flex items-center gap-1 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Critical/Open
              </span>
              <span className="flex items-center gap-1 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> In Progress
              </span>
              <span className="flex items-center gap-1 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" /> Provisional
              </span>
              <span className="flex items-center gap-1 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Resolved
              </span>
            </div>
          </div>
          <div className="flex-1 w-full rounded-xl overflow-hidden relative">
            <CivicMap markers={filteredMarkers} center={mapCenter} zoom={13} />
          </div>
        </div>

        {/* Incidents Stream Column (5 cols on desktop, toggled or stacked on mobile) */}
        <div
          className={`lg:col-span-5 space-y-4 ${
            mobileView === "map" ? "hidden lg:block" : "block"
          }`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Neighborhood Reports</h2>
            <span className="text-xs text-slate-500">Sorted by Severity Index</span>
          </div>

          {filteredMarkers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
              <AlertTriangle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="font-semibold text-sm">No incidents match your filter</p>
              <p className="text-xs text-slate-400 mt-1">Try resetting the ward or category filters.</p>
            </div>
          ) : (
            filteredMarkers.map((issue) => {
              const isResolved =
                issue.status === "OFFICIALLY_RESOLVED" ||
                issue.status === "PROVISIONALLY_RESOLVED";
              const isDisputed = issue.status === "REOPENED_DISPUTED";

              return (
                <div
                  key={issue.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-emerald-300 transition duration-150 flex flex-col gap-3"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[11px] font-bold text-slate-500">
                          {issue.trackingCode}
                        </span>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded text-white"
                          style={{ backgroundColor: issue.markerColor }}
                        >
                          {issue.status.replace("_", " ")}
                        </span>
                        {issue.childIssueCount > 0 && (
                          <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.5 rounded border border-slate-200">
                            +{issue.childIssueCount} grouped
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/issues/${issue.id}`}
                        className="text-sm font-bold text-slate-900 hover:text-emerald-700 transition line-clamp-1"
                      >
                        {issue.title}
                      </Link>
                    </div>

                    {/* Dynamic Severity Gauge */}
                    <div className="text-right shrink-0">
                      <div className="flex items-center justify-end gap-1 text-xs font-bold text-slate-800">
                        <Flame className="w-3.5 h-3.5 text-amber-500" />
                        <span>{issue.dynamicSeverity}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">
                        {issue.severityLevel}
                      </span>
                    </div>
                  </div>

                  {/* Card Photo Thumbnails */}
                  <div className="flex gap-2">
                    <div className="relative w-1/2 aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
                      <img
                        src={issue.photoUrl}
                        alt="Initial Complaint"
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-sm text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
                        Reported Photo
                      </span>
                    </div>

                    {issue.afterPhotoUrl ? (
                      <div className="relative w-1/2 aspect-video rounded-xl overflow-hidden bg-slate-100 border border-emerald-300">
                        <img
                          src={issue.afterPhotoUrl}
                          alt="Resolution Proof"
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 left-1 bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                          Fixed Proof
                        </span>
                      </div>
                    ) : (
                      <div className="w-1/2 aspect-video rounded-xl bg-slate-50 border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 text-[11px] p-2 text-center">
                        <Clock className="w-4 h-4 mb-1" />
                        <span>Awaiting Field Repair</span>
                      </div>
                    )}
                  </div>

                  {/* Location & Department */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{issue.address || issue.wardName}</span>
                    </span>
                    <span className="shrink-0 text-slate-400 font-medium">
                      {issue.department}
                    </span>
                  </div>

                  {/* Action Bar */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={(e) => handleUpvote(issue.id, e)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-xl text-xs font-semibold transition"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>Upvote ({issue.upvoteCount})</span>
                    </button>

                    <Link
                      href={`/issues/${issue.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                    >
                      <span>Public Audit & Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
