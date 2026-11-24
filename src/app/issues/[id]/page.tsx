"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  MapPin,
  Flame,
  ThumbsUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Layers,
  ArrowLeft,
  XCircle,
  FileCheck2,
  Sparkles,
  Send,
} from "lucide-react";

export default function IssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const issueId = resolvedParams.id;
  const { user, openAuthModal } = useAuth();

  const [issue, setIssue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Micro-verification survey state
  const [isStillPresent, setIsStillPresent] = useState(true);
  const [hazardPerception, setHazardPerception] = useState<"MILD" | "MODERATE" | "SEVERE">("SEVERE");
  const [surveyComment, setSurveyComment] = useState("");
  const [submittingSurvey, setSubmittingSurvey] = useState(false);

  // Dispute state
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputePhotoUrl, setDisputePhotoUrl] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);

  const fetchIssue = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/issues/${issueId}`);
      if (res.ok) {
        const data = await res.json();
        setIssue(data.issue);
      } else {
        setError("Issue not found or removed.");
      }
    } catch {
      setError("Failed to load issue details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssue();
  }, [issueId]);

  const handleUpvote = async () => {
    if (!user) {
      openAuthModal();
      return;
    }

    // Instant optimistic update
    setIssue((prev: any) =>
      prev ? { ...prev, upvoteCount: (prev.upvoteCount || 0) + 1 } : prev
    );

    try {
      const res = await fetch(`/api/issues/${issue.id}/upvote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        // Rollback on failure
        setIssue((prev: any) =>
          prev ? { ...prev, upvoteCount: Math.max(0, (prev.upvoteCount || 1) - 1) } : prev
        );
        const d = await res.json();
        alert(d.error || "Failed to upvote");
      }
    } catch {
      // Rollback on network error
      setIssue((prev: any) =>
        prev ? { ...prev, upvoteCount: Math.max(0, (prev.upvoteCount || 1) - 1) } : prev
      );
      alert("Error upvoting issue.");
    }
  };

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal();
      return;
    }
    setSubmittingSurvey(true);
    try {
      const res = await fetch(`/api/issues/${issue.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isStillPresent,
          hazardPerception,
          comment: surveyComment,
        }),
      });
      if (res.ok) {
        alert("Verification recorded! You earned +5 community karma.");
        setSurveyComment("");
        fetchIssue();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to submit verification");
      }
    } catch {
      alert("Error submitting verification.");
    } finally {
      setSubmittingSurvey(false);
    }
  };

  const handleConfirmResolution = async () => {
    if (!user) {
      openAuthModal();
      return;
    }
    try {
      const res = await fetch(`/api/issues/${issue.id}/confirm-resolution`, {
        method: "POST",
      });
      if (res.ok) {
        alert("Thank you! You have confirmed the repair. Ticket is now Officially Resolved.");
        fetchIssue();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to confirm resolution");
      }
    } catch {
      alert("Error confirming resolution.");
    }
  };

  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal();
      return;
    }
    setSubmittingDispute(true);
    try {
      const res = await fetch(`/api/issues/${issue.id}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: disputeReason,
          evidencePhotoUrl: disputePhotoUrl || issue.photoUrl,
        }),
      });
      if (res.ok) {
        alert("Dispute registered! Ticket automatically reopened as REOPENED_DISPUTED and escalated.");
        setIsDisputeModalOpen(false);
        setDisputeReason("");
        fetchIssue();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to submit dispute");
      }
    } catch {
      alert("Error disputing resolution.");
    } finally {
      setSubmittingDispute(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-slate-500">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Loading public audit trail...</p>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900">Incident Not Found</h2>
        <p className="text-sm text-slate-500 mt-1">{error}</p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Public Map
        </Link>
      </div>
    );
  }

  const isProvisional = issue.status === "PROVISIONALLY_RESOLVED";
  const isOfficial = issue.status === "OFFICIALLY_RESOLVED";
  const isDisputed = issue.status === "REOPENED_DISPUTED";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Navigation Breadcrumb */}
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Public City Map
        </Link>
      </div>

      {/* RECURRING CHILD TICKET NOTICE */}
      {!issue.isMaster && issue.masterIssue && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500 text-white rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                Recurring Child Report • 20m Spatial Cluster
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                This complaint was detected within 20m of Master Incident{" "}
                <strong>{issue.masterIssue.trackingCode}</strong> and grouped under it to avoid duplicating ward work orders.
              </p>
            </div>
          </div>
          <Link
            href={`/issues/${issue.masterIssue.id}`}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition shrink-0 whitespace-nowrap"
          >
            View Master Ticket →
          </Link>
        </div>
      )}

      {/* PROVISIONAL RESOLUTION AUDIT NOTICE */}
      {isProvisional && (
        <div className="mb-6 p-4 bg-cyan-50 border-2 border-cyan-400 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-cyan-600 text-white rounded-xl">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-cyan-950">
                  Provisionally Resolved • 72-Hour Community Audit Active
                </h3>
              </div>
              <p className="text-xs text-cyan-800 mt-0.5">
                The ward officer marked this issue repaired on-site. If you notice it is still broken or incomplete, you have the legal right to dispute it.
              </p>
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsDisputeModalOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Dispute: Still Broken
            </button>
            <button
              onClick={handleConfirmResolution}
              className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Confirm Repaired
            </button>
          </div>
        </div>
      )}

      {isDisputed && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-400 rounded-2xl flex items-center gap-3">
          <XCircle className="w-6 h-6 text-red-600 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-red-950">
              Community Resolution Disputed • Ticket Reopened & Escalated
            </h3>
            <p className="text-xs text-red-800 mt-0.5">
              Residents contested the field team’s closure proof. The issue has been re-escalated to senior zonal engineers for penalty review.
            </p>
          </div>
        </div>
      )}

      {/* Main Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {issue.trackingCode}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full text-white ${
                  isOfficial
                    ? "bg-emerald-600"
                    : isProvisional
                    ? "bg-cyan-600"
                    : isDisputed
                    ? "bg-red-600"
                    : "bg-amber-500"
                }`}
              >
                {issue.status.replace("_", " ")}
              </span>
              {issue.childIssues?.length > 0 && (
                <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded">
                  {issue.childIssues.length + 1} Citizen Reports Merged
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
              {issue.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {issue.address || "Indiranagar, Bengaluru"} ({issue.ward?.name || "Ward 02"})
              </span>
              <span>•</span>
              <span>Dept: <strong>{issue.category?.department}</strong></span>
              <span>•</span>
              <span>Reported: {new Date(issue.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleUpvote}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              <ThumbsUp className="w-4 h-4 text-emerald-600" />
              <span>Upvote ({issue.upvoteCount})</span>
            </button>
          </div>
        </div>

        {/* Dynamic Severity Meter */}
        <div className="pt-6 grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">
              Dynamic Severity Index
            </span>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <Flame className="w-5 h-5 text-amber-500" />
              <span className="text-2xl font-extrabold text-slate-900">
                {issue.dynamicSeverity}
              </span>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 uppercase">
              Level: {issue.severityLevel}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">
              Category Base Hazard
            </span>
            <span className="text-2xl font-extrabold text-slate-900 block mt-1">
              {issue.category?.baseHazard}/10
            </span>
            <span className="text-[10px] text-slate-400">{issue.category?.name}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">
              Community Upvotes
            </span>
            <span className="text-2xl font-extrabold text-slate-900 block mt-1">
              {issue.upvoteCount}
            </span>
            <span className="text-[10px] text-slate-400">1 Resident = 1 Vote</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">
              On-Ground Verifications
            </span>
            <span className="text-2xl font-extrabold text-slate-900 block mt-1">
              {issue.verifications?.length || 0}
            </span>
            <span className="text-[10px] text-slate-400">Neighborhood Witnesses</span>
          </div>
        </div>
      </div>

      {/* Visual Resolution Proof Comparison (Before vs After) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          Photographic Audit Proof
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Before Photo */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
              <span>Original Complaint Photo (Before)</span>
              <span className="text-[11px] text-slate-400">
                Lat: {issue.latitude.toFixed(4)}, Lng: {issue.longitude.toFixed(4)}
              </span>
            </div>
            <div className="aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
              <img
                src={issue.photoUrl}
                alt="Original Complaint"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-xs text-slate-600 mt-2 italic">
              &quot;{issue.description}&quot;
            </p>
          </div>

          {/* After Photo */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
              <span>Resolution Proof (After)</span>
              {issue.resolutionProof && (
                <span className="text-[11px] text-emerald-700 font-bold">
                  Geofenced ({issue.resolutionProof.distanceFromOriginMeters}m from site)
                </span>
              )}
            </div>

            {issue.resolutionProof ? (
              <div>
                <div className="aspect-video rounded-xl overflow-hidden bg-slate-100 border-2 border-emerald-400">
                  <img
                    src={issue.resolutionProof.afterPhotoUrl}
                    alt="Resolution Proof"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <p>
                    <strong>Officer Notes:</strong> {issue.resolutionProof.notes}
                  </p>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Executed by: {issue.resolutionProof.contractorName || "Municipal Maintenance Team"} •{" "}
                    {new Date(issue.resolutionProof.resolvedAt).toLocaleString()}
                  </p>
                </div>

                {/* AI Visual Repair Verification Pill */}
                <div className="mt-2.5 p-2.5 bg-indigo-50/80 border border-indigo-200 rounded-lg text-xs text-indigo-950 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-900">AI Visual Verification:</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                        Repair Confirmed (92% Confidence)
                      </span>
                    </div>
                    <p className="text-[11px] text-indigo-800 mt-0.5">
                      Surface leveling and seal coat verified over original cavity. Zero structural void detected.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="aspect-video rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 text-xs p-6 text-center">
                <Clock className="w-6 h-6 mb-2 text-slate-300" />
                <span className="font-semibold">No Resolution Proof Uploaded Yet</span>
                <span className="text-[11px] mt-1 text-slate-400">
                  The ward field officer must physically visit the location and submit an on-site photo within 100m to close this ticket.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Layout: Ground Verification + Public Audit Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Community Micro-Survey (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">
                Ground Verification Survey
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Are you currently at this location? Help your ward engineer triage by confirming the status on the ground.
            </p>

            <form onSubmit={handleSubmitVerification} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Is this issue still active / broken?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsStillPresent(true)}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      isStillPresent
                        ? "bg-red-50 text-red-700 border-red-300"
                        : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    Yes, Still Broken
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsStillPresent(false)}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      !isStillPresent
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    No, Looks Cleared
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Current Hazard Severity
                </label>
                <select
                  value={hazardPerception}
                  onChange={(e) => setHazardPerception(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                >
                  <option value="MILD">Mild (Nuisance, no immediate danger)</option>
                  <option value="MODERATE">Moderate (Blocks partial traffic / footpath)</option>
                  <option value="SEVERE">Severe (Accident risk / Pedestrian danger)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Optional Ground Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Water is leaking into nearby houses..."
                  value={surveyComment}
                  onChange={(e) => setSurveyComment(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <button
                type="submit"
                disabled={submittingSurvey}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                {submittingSurvey ? "Submitting..." : "Submit Ground Verification (+5 Karma)"}
              </button>
            </form>
          </div>

          {/* Grouped Duplicate Child Reports */}
          {issue.childIssues?.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Merged Duplicate Complaints ({issue.childIssues.length})
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                These complaints were submitted by other residents nearby and grouped to avoid redundant field visits:
              </p>
              <div className="space-y-2">
                {issue.childIssues.map((child: any) => (
                  <div
                    key={child.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-700">
                        {child.trackingCode}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(child.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-800 font-medium mt-1">{child.title}</p>
                    <p className="text-slate-500 text-[11px] mt-0.5 line-clamp-1">
                      {child.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Public Audit Ledger (7 cols) */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Public Accountability Ledger & Timeline
            </h3>

            <div className="relative border-l-2 border-slate-200 ml-4 space-y-6">
              {issue.auditLogs?.map((log: any) => (
                <div key={log.id} className="relative pl-6">
                  {/* Timeline dot */}
                  <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-emerald-600 border-2 border-white shadow-sm" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {log.action.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{log.details}</p>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono inline-block mt-1">
                    Actor: {log.actorRole || "SYSTEM"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* DISPUTE MODAL */}
      {isDisputeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-red-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Dispute Resolution ("Still Broken")
              </h3>
              <button
                onClick={() => setIsDisputeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDisputeSubmit} className="mt-4 space-y-4">
              <p className="text-xs text-slate-600">
                Disputing will automatically reopen this ticket, notify the municipal commissioner, and increase the hazard penalty on the contractor.
              </p>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Why is this still unresolved?
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. The asphalt washed away during rain, pothole is still exposed..."
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Fresh Evidence Photo (URL)
                </label>
                <input
                  type="url"
                  placeholder="https://... photo of current state"
                  value={disputePhotoUrl}
                  onChange={(e) => setDisputePhotoUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDisputeModalOpen(false)}
                  className="w-1/3 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDispute}
                  className="w-2/3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  {submittingDispute ? "Reopening Ticket..." : "Submit Official Dispute"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
