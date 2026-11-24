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
  const { user, openRoleModal } = useAuth();
  const [issues, setIssues] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [selectedWardId, setSelectedWardId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const isOfficer = user?.role === "WARD_OFFICER" || user?.role === "ADMIN";

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
    if (!isOfficer) {
      alert("Read-Only Mode: Resident accounts cannot dispatch work orders. Ward Officer authorization required.");
      return;
    }
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
    if (!isOfficer) {
      alert("Read-Only Mode: Resident accounts cannot resolve issues. Ward Officer authorization required.");
      return;
    }
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

  // Stats for the active ward
  const activeCount = issues.filter((i) => i.status !== "OFFICIALLY_RESOLVED").length;
  const criticalCount = issues.filter((i) => i.dynamicSeverity >= 7).length;
  const provisionalCount = issues.filter((i) => i.status === "PROVISIONALLY_RESOLVED").length;
  const disputedCount = issues.filter((i) => i.status === "REOPENED_DISPUTED").length;

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
          {isOfficer ? (
            <a
              href={`/api/officer/work-orders/export?wardId=${selectedWardId || ""}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition"
              download
            >
              <span>Export Run-Sheet (CSV)</span>
            </a>
          ) : null}

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

      {/* Transparency / Officer Mode Banner */}
      {!isOfficer ? (
        <div className="mb-6 p-4 sm:p-5 bg-gradient-to-r from-emerald-50/80 via-slate-50 to-teal-50/50 border border-teal-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 bg-teal-100 rounded-xl text-teal-700 shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-teal-950 uppercase tracking-wider">
                  Public Ward Field Operations Oversight
                </span>
                <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full border border-teal-200">
                  Read-Only Mode
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                Citizens can transparently monitor ward work orders, contractor repair assignments, and GPS resolution proofs. Modifying work orders, dispatching crews, and uploading official closure proofs are restricted to authorized Ward Officers.
              </p>
            </div>
          </div>
          <button
            onClick={() => openRoleModal("WARD_OFFICER")}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Officer Sign In</span>
          </button>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  Ward Field Officer Mode Active
                </span>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                  Officer Authorized
                </span>
              </div>
              <p className="text-xs text-emerald-800 mt-0.5">
                Logged in as {user?.name || user?.email} with authority to issue field work orders and submit verified GPS completion proofs.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ward Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Ward Tickets</span>
          <span className="text-2xl font-extrabold text-slate-900 block mt-1">{activeCount}</span>
          <span className="text-[11px] text-slate-400">Awaiting or undergoing repair</span>
        </div>
        <div className="bg-white rounded-2xl border border-amber-200 p-4 shadow-xs bg-amber-50/30">
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">High / Critical Hazard</span>
          <span className="text-2xl font-extrabold text-amber-700 block mt-1">{criticalCount}</span>
          <span className="text-[11px] text-amber-700">Dynamic severity &ge; 7</span>
        </div>
        <div className="bg-white rounded-2xl border border-teal-200 p-4 shadow-xs bg-teal-50/30">
          <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">Provisionally Solved</span>
          <span className="text-2xl font-extrabold text-teal-700 block mt-1">{provisionalCount}</span>
          <span className="text-[11px] text-teal-700">In 72h community audit</span>
        </div>
        <div className="bg-white rounded-2xl border border-red-200 p-4 shadow-xs bg-red-50/30">
          <span className="text-xs font-bold text-red-800 uppercase tracking-wider">Disputed by Residents</span>
          <span className="text-2xl font-extrabold text-red-700 block mt-1">{disputedCount}</span>
          <span className="text-[11px] text-red-700">Requires re-investigation</span>
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
                          {isOfficer ? (
                            <>
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
                            </>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              {issue.status === "OPEN" || issue.status === "REOPENED_DISPUTED" ? (
                                <button
                                  onClick={() => openRoleModal("WARD_OFFICER")}
                                  title="Sign in as Ward Officer to dispatch crew"
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg text-xs transition flex items-center gap-1 cursor-pointer"
                                >
                                  <Lock className="w-3 h-3 text-slate-400" />
                                  <span>Dispatch</span>
                                </button>
                              ) : null}

                              {!isResolved ? (
                                <button
                                  onClick={() => openRoleModal("WARD_OFFICER")}
                                  title="Sign in as Ward Officer to upload fix proof"
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg text-xs transition flex items-center gap-1 cursor-pointer"
                                >
                                  <Lock className="w-3 h-3 text-slate-400" />
                                  <span>Resolve</span>
                                </button>
                              ) : (
                                <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Proof Filed
                                </span>
                              )}
                            </div>
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
            {!isOfficer ? (
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">Ward Officer Authorization Required</h3>
                <p className="text-xs text-slate-500 mb-5">
                  You are browsing the Ward Console in resident oversight mode. Dispatching work orders and assigning municipal field crews are restricted to authorized Ward Officers.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedIssueForOrder(null)}
                    className="w-1/2 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIssueForOrder(null);
                      openRoleModal("WARD_OFFICER");
                    }}
                    className="w-1/2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                  >
                    Officer Sign In
                  </button>
                </div>
              </div>
            ) : (
              <>
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
          </>
        )}
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

        {!isOfficer ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Ward Officer Authorization Required</h3>
            <p className="text-xs text-slate-500 mb-5">
              You are browsing the Ward Console in resident oversight mode. Uploading official geofenced resolution proofs and marking issues resolved are restricted to authorized Ward Officers.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedIssueForResolve(null)}
                className="w-1/2 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedIssueForResolve(null);
                  openRoleModal("WARD_OFFICER");
                }}
                className="w-1/2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
              >
                Officer Sign In
              </button>
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  )}
    </div>
  );
}
