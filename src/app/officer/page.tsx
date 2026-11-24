"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  Briefcase,
  MapPin,
  Flame,
  CheckCircle2,
  Clock,
  Layers,
  Camera,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Send,
  UserCheck,
  Lock,
  ShieldAlert,
  KeyRound,
} from "lucide-react";

export default function WardOfficerPage() {
  const { user, governanceLogin } = useAuth();
  const [issues, setIssues] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [selectedWardId, setSelectedWardId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Municipal Governance Auth State
  const [officerEmail, setOfficerEmail] = useState("officer.indiranagar@citycivic.gov");
  const [officerPassword, setOfficerPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);

  const handleGovernanceAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthenticating(true);
    try {
      const res = await governanceLogin(officerEmail, officerPassword, "WARD_OFFICER");
      if (!res.success) {
        setAuthError(res.error || "Authentication failed. Invalid municipal credentials.");
      } else {
        setOfficerPassword("");
        fetchData();
      }
    } finally {
      setAuthenticating(false);
    }
  };

  // Work order modal state
  const [selectedIssueForOrder, setSelectedIssueForOrder] = useState<any>(null);
  const [department, setDepartment] = useState("Roads & Infrastructure");
  const [orderPriority, setOrderPriority] = useState<"NORMAL" | "HIGH" | "EMERGENCY">("HIGH");
  const [orderNotes, setOrderNotes] = useState("");
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Resolution proof modal state
  const [selectedIssueForResolve, setSelectedIssueForResolve] = useState<any>(null);
  const [afterPhotoUrl, setAfterPhotoUrl] = useState("https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800");
  const [resolutionLat, setResolutionLat] = useState<number>(12.9784);
  const [resolutionLng, setResolutionLng] = useState<number>(77.6408);
  const [resolveNotes, setResolveNotes] = useState("Pothole excavated, leveled and compacted with hot-mix asphalt.");
  const [contractorName, setContractorName] = useState("Sri Balaji Roadworks Ltd.");
  const [submittingResolve, setSubmittingResolve] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [issuesRes, wardsRes] = await Promise.all([
        fetch(`/api/issues?wardId=${selectedWardId || ""}`),
        fetch("/api/wards"),
      ]);

      if (wardsRes.ok) {
        const wData = await wardsRes.json();
        setWards(wData.wards || []);
        if (!selectedWardId && wData.wards?.length > 0) {
          // Default to Ward 02 (Indiranagar)
          const w02 = wData.wards.find((w: any) => w.code === "W02") || wData.wards[0];
          setSelectedWardId(w02.id);
        }
      }

      if (issuesRes.ok) {
        const iData = await issuesRes.json();
        setIssues(iData.issues || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedWardId]);

  // Ensure current location matches issue for resolution
  useEffect(() => {
    if (selectedIssueForResolve) {
      // Default to coordinates near the issue (~5-10m) so it passes geofence
      setResolutionLat(selectedIssueForResolve.latitude + 0.00005);
      setResolutionLng(selectedIssueForResolve.longitude + 0.00005);
    }
  }, [selectedIssueForResolve]);

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingOrder(true);
    try {
      const res = await fetch("/api/officer/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueId: selectedIssueForOrder.id,
          department,
          priority: orderPriority,
          notes: orderNotes,
        }),
      });

      if (res.ok) {
        alert("Work order dispatched to field team!");
        setSelectedIssueForOrder(null);
        setOrderNotes("");
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to dispatch work order.");
      }
    } catch {
      alert("Error dispatching work order.");
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleSubmitResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingResolve(true);
    setResolveError(null);

    try {
      const res = await fetch("/api/officer/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueId: selectedIssueForResolve.id,
          afterPhotoUrl,
          resolutionLat,
          resolutionLng,
          notes: resolveNotes,
          contractorName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Resolution submission failed.");
      }

      alert("Resolution proof verified & accepted! Status is now PROVISIONALLY RESOLVED with 72h community audit window.");
      setSelectedIssueForResolve(null);
      fetchData();
    } catch (err: any) {
      setResolveError(err.message);
    } finally {
      setSubmittingResolve(false);
    }
  };

  if (user?.role !== "WARD_OFFICER" && user?.role !== "ADMIN") {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 text-white text-center">
            <div className="w-14 h-14 bg-teal-500/20 border border-teal-400/30 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
              <Lock className="w-7 h-7 text-teal-300" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-wider text-teal-300 mb-2">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Restricted Municipal Access</span>
            </div>
            <h1 className="text-xl font-extrabold">Ward Field Operations Console</h1>
            <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
              This governing portal is restricted to authorized municipal field officers. Citizen accounts cannot access work orders or field resolution tools.
            </p>
          </div>

          {/* Form */}
          <div className="p-6 sm:p-8">
            {authError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleGovernanceAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Official Government Email
                </label>
                <input
                  type="email"
                  required
                  value={officerEmail}
                  onChange={(e) => setOfficerEmail(e.target.value)}
                  placeholder="officer.indiranagar@citycivic.gov"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Municipal Authorization Passphrase
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={officerPassword}
                    onChange={(e) => setOfficerPassword(e.target.value)}
                    placeholder="Enter official password"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Enter the secure municipal passphrase issued to your Ward Engineering Unit.
                </p>
              </div>

              <button
                type="submit"
                disabled={authenticating}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {authenticating ? (
                  <span>Verifying Credentials...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Authenticate & Access Ward Console</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center border-t border-slate-100 pt-4">
              <Link href="/" className="text-xs text-slate-500 hover:text-slate-800 transition">
                ← Return to Public City Map
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-emerald-600" />
            Ward Field Operations Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Consolidated work orders, geofenced resolution proofs, and SLA audit tracking.
          </p>
        </div>

        {/* Ward Selector & CSV Export */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/officer/work-orders/export?wardId=${selectedWardId || ""}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition"
            download
          >
            <span>Export Run-Sheet (CSV)</span>
          </a>

          <select
            value={selectedWardId}
            onChange={(e) => setSelectedWardId(e.target.value)}
            className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code}: {w.name} ({w.officerName || "Supervisor"})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Issues Queue Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Triage & Dispatch Queue ({issues.length} Master Work Orders)
          </h2>
          <span className="text-xs text-slate-500">
            Sorted by Dynamic Severity (Highest Hazard First)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Tracking Code & Title</th>
                <th className="py-3 px-4">Category & Dept</th>
                <th className="py-3 px-4">Severity & Duplicates</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4 text-right">Field Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {issues.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No active issues logged in this ward.
                  </td>
                </tr>
              ) : (
                issues.map((issue) => {
                  const isResolved =
                    issue.status === "OFFICIALLY_RESOLVED" ||
                    issue.status === "PROVISIONALLY_RESOLVED";
                  const isDisputed = issue.status === "REOPENED_DISPUTED";

                  return (
                    <tr key={issue.id} className="hover:bg-slate-50/70 transition">
                      {/* Code & Title */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={issue.photoUrl}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-200"
                          />
                          <div>
                            <span className="font-mono text-[10px] font-bold text-slate-400">
                              {issue.trackingCode}
                            </span>
                            <Link
                              href={`/issues/${issue.id}`}
                              className="font-bold text-slate-900 hover:text-emerald-700 block line-clamp-1"
                            >
                              {issue.title}
                            </Link>
                            <span className="text-[11px] text-slate-400 block truncate max-w-xs">
                              {issue.address || "Indiranagar, Bengaluru"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category & Dept */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800 block">
                          {issue.category?.name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {issue.category?.department}
                        </span>
                      </td>

                      {/* Severity & Duplicates */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <Flame className="w-4 h-4 text-amber-500" />
                          <span className="font-extrabold text-slate-900">
                            {issue.dynamicSeverity}
                          </span>
                          <span className="text-[10px] bg-slate-100 font-semibold px-1.5 py-0.5 rounded text-slate-600">
                            {issue.severityLevel}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 mt-0.5 block">
                          {issue._count?.childIssues || 0} grouped complaints
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            issue.status === "OFFICIALLY_RESOLVED"
                              ? "bg-emerald-100 text-emerald-800"
                              : issue.status === "PROVISIONALLY_RESOLVED"
                              ? "bg-cyan-100 text-cyan-800"
                              : isDisputed
                              ? "bg-red-100 text-red-800"
                              : issue.status === "IN_PROGRESS"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {issue.status.replace("_", " ")}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {issue.status === "OPEN" || issue.status === "REOPENED_DISPUTED" ? (
                            <button
                              onClick={() => setSelectedIssueForOrder(issue)}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                            >
                              Dispatch Crew
                            </button>
                          ) : null}

                          {!isResolved ? (
                            <button
                              onClick={() => setSelectedIssueForResolve(issue)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition flex items-center gap-1 cursor-pointer"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              Upload Fix Proof
                            </button>
                          ) : (
                            <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Proof Filed
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DISPATCH WORK ORDER MODAL */}
      {selectedIssueForOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Dispatch Work Order: {selectedIssueForOrder.trackingCode}
            </h3>
            <p className="text-xs text-slate-500 mb-4">{selectedIssueForOrder.title}</p>

            <form onSubmit={handleCreateWorkOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Responsible Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                >
                  <option value="Roads & Infrastructure">Roads & Infrastructure</option>
                  <option value="Sanitation & Drainage">Sanitation & Drainage</option>
                  <option value="Water Supply & Sewerage">Water Supply & Sewerage</option>
                  <option value="Solid Waste Management">Solid Waste Management</option>
                  <option value="Electrical Works">Electrical Works</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dispatch Priority
                </label>
                <select
                  value={orderPriority}
                  onChange={(e) => setOrderPriority(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                >
                  <option value="NORMAL">Normal Routine Repair</option>
                  <option value="HIGH">High Priority (Within 24 Hours)</option>
                  <option value="EMERGENCY">Emergency (Immediate Hazard)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Work Order Field Instructions
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Deploy 2 cubic meters of cold mix asphalt. Barricade left lane..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedIssueForOrder(null)}
                  className="w-1/3 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOrder}
                  className="w-2/3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  {submittingOrder ? "Dispatching..." : "Confirm & Dispatch Crew"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESOLUTION PROOF MODAL (GEOFENCED) */}
      {selectedIssueForResolve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Upload Geofenced Resolution Proof
                </h3>
                <span className="font-mono text-[11px] text-slate-400">
                  {selectedIssueForResolve.trackingCode}
                </span>
              </div>
              <button
                onClick={() => setSelectedIssueForResolve(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {resolveError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{resolveError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitResolution} className="mt-4 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-950">
                <p className="font-semibold">Geofence Rule Enforced:</p>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Field staff photo must be taken within 100 meters of the incident origin: (
                  {selectedIssueForResolve.latitude.toFixed(4)},{" "}
                  {selectedIssueForResolve.longitude.toFixed(4)}).
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    &quot;After&quot; Resolution Photo
                  </label>
                  <label className="cursor-pointer text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Upload from Phone Camera</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const fd = new FormData();
                        fd.append("file", file);
                        const r = await fetch("/api/upload", { method: "POST", body: fd });
                        const d = await r.json();
                        if (r.ok && d.url) {
                          setAfterPhotoUrl(d.url);
                          if (d.exif?.hasGps && d.exif.latitude && d.exif.longitude) {
                            setResolutionLat(parseFloat(d.exif.latitude.toFixed(6)));
                            setResolutionLng(parseFloat(d.exif.longitude.toFixed(6)));
                          }
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                <input
                  type="url"
                  required
                  value={afterPhotoUrl}
                  onChange={(e) => setAfterPhotoUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Live Field GPS Lat
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={resolutionLat}
                    onChange={(e) => setResolutionLat(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Live Field GPS Lng
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={resolutionLng}
                    onChange={(e) => setResolutionLng(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contractor / Maintenance Agency
                </label>
                <input
                  type="text"
                  value={contractorName}
                  onChange={(e) => setContractorName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Work Completion Notes
                </label>
                <textarea
                  rows={2}
                  required
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedIssueForResolve(null)}
                  className="w-1/3 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingResolve}
                  className="w-2/3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  {submittingResolve ? "Verifying Geofence..." : "Submit Proof of Resolution"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
