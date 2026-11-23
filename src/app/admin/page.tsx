"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  BarChart3,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Flame,
  Award,
  TrendingUp,
  UserCheck,
  FileSpreadsheet,
} from "lucide-react";

export default function AdminAnalyticsPage() {
  const { user, switchPersona } = useAuth();
  const [data, setData] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const [statsRes, logsRes, contRes] = await Promise.all([
          fetch("/api/admin/analytics"),
          fetch("/api/public/audit-ledger?limit=15"),
          fetch("/api/contractors"),
        ]);

        if (statsRes.ok) {
          const s = await statsRes.json();
          setData(s);
        }
        if (logsRes.ok) {
          const l = await logsRes.json();
          setLogs(l.logs || []);
        }
        if (contRes.ok) {
          const c = await contRes.json();
          setContractors(c.scorecards || []);
        }
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Aggregating city-wide municipal metrics...</p>
      </div>
    );
  }

  const overview = data?.overview || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Admin Switcher Banner */}
      {user?.role !== "ADMIN" && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <UserCheck className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-blue-950">
                Viewing as {user?.role || "GUEST"}
              </p>
              <p className="text-[11px] text-blue-700">
                Switch to Municipal Commissioner Admin to access governance metrics and contractor audit scorecards.
              </p>
            </div>
          </div>
          <button
            onClick={() => switchPersona("ADMIN")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition whitespace-nowrap cursor-pointer"
          >
            Switch to Commissioner Admin
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-blue-600" />
          Municipal Civic Operations & SLA Dashboard
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          City-wide executive metrics on complaint deduplication, contractor SLA compliance, and community audit health.
        </p>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Filed Complaints
            </span>
            <div className="p-2 bg-slate-100 rounded-xl">
              <TrendingUp className="w-4 h-4 text-slate-700" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-slate-900 block mt-2">
            {overview.totalComplaintsFiled || 0}
          </span>
          <span className="text-xs text-slate-500 mt-1 block">
            Across {overview.activeWards || 4} City Wards
          </span>
        </div>

        {/* Deduplication Efficiency */}
        <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Deduplication Rate
            </span>
            <div className="p-2 bg-emerald-100 rounded-xl">
              <Layers className="w-4 h-4 text-emerald-700" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-emerald-700 block mt-2">
            {overview.deduplicationRatePercent || 0}%
          </span>
          <span className="text-xs text-emerald-800 mt-1 block font-medium">
            {overview.duplicatesIntercepted || 0} redundant tickets merged
          </span>
        </div>

        {/* Resolved Count */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Confirmed Resolved
            </span>
            <div className="p-2 bg-emerald-100 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-slate-900 block mt-2">
            {overview.officiallyResolved || 0}
          </span>
          <span className="text-xs text-slate-500 mt-1 block">
            +{overview.provisionallyResolved || 0} in 72h audit window
          </span>
        </div>

        {/* Disputed / Penalty Strikes */}
        <div className="bg-white rounded-2xl border border-red-200 p-5 shadow-sm bg-gradient-to-br from-red-50/50 to-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-800 uppercase tracking-wider">
              Disputed Closures
            </span>
            <div className="p-2 bg-red-100 rounded-xl">
              <ShieldAlert className="w-4 h-4 text-red-600" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-red-700 block mt-2">
            {overview.currentlyDisputed || 0}
          </span>
          <span className="text-xs text-red-800 mt-1 block font-medium">
            False resolutions contested by residents
          </span>
        </div>
      </div>

      {/* Ward SLA Leaderboard Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Ward SLA Leaderboard & Contractor Accountability
            </h2>
            <p className="text-xs text-slate-500">
              Ranked by resolution percentage and community dispute strike rate.
            </p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 font-bold px-3 py-1 rounded-xl">
            Live Ward Benchmarks
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-5">Ward Name & Code</th>
                <th className="py-3.5 px-5">Lead Officer</th>
                <th className="py-3.5 px-5">Total Complaints</th>
                <th className="py-3.5 px-5">Resolved (Proof Verified)</th>
                <th className="py-3.5 px-5">Disputed Strikes</th>
                <th className="py-3.5 px-5 text-right">Resolution Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.wardPerformance?.map((w: any) => (
                <tr key={w.wardId} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-5 font-bold text-slate-900">
                    {w.code}: {w.name}
                  </td>
                  <td className="py-3.5 px-5">{w.officerName || "Ward Engineer"}</td>
                  <td className="py-3.5 px-5 font-semibold">{w.totalIssues}</td>
                  <td className="py-3.5 px-5 text-emerald-700 font-semibold">
                    {w.resolvedCount}
                  </td>
                  <td className="py-3.5 px-5">
                    {w.disputedCount > 0 ? (
                      <span className="text-red-700 font-bold bg-red-100 px-2 py-0.5 rounded">
                        {w.disputedCount} strikes
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-right font-extrabold text-slate-900">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-lg ${
                        w.resolutionRate >= 75
                          ? "bg-emerald-100 text-emerald-800"
                          : w.resolutionRate >= 50
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {w.resolutionRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contractor SLA Penalties & Liquidated Damages */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              Contractor SLA Enforcement & Community Dispute Penalties
            </h2>
            <p className="text-xs text-slate-500">
              Contractors penalized for substandard repairs disputed and reopened by local residents.
            </p>
          </div>
          <span className="text-xs bg-red-50 text-red-700 font-bold px-3 py-1 rounded-xl border border-red-200">
            Anti-Ghost Closure Safeguard
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-5">Contractor Agency</th>
                <th className="py-3.5 px-5">Total Repairs</th>
                <th className="py-3.5 px-5">Dispute Strikes</th>
                <th className="py-3.5 px-5">Pass Rate</th>
                <th className="py-3.5 px-5">Legal SLA Penalty Status</th>
                <th className="py-3.5 px-5 text-right">Liquidated Damages</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contractors.map((c: any) => (
                <tr key={c.name} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-5 font-bold text-slate-900">{c.name}</td>
                  <td className="py-3.5 px-5">{c.totalRepairs}</td>
                  <td className="py-3.5 px-5">
                    {c.strikeLevel > 0 ? (
                      <span className="text-red-700 font-bold bg-red-100 px-2 py-0.5 rounded">
                        {c.strikeLevel} Community Strikes
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                        0 Strikes
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 font-semibold text-slate-700">{c.passRatePercent}%</td>
                  <td className="py-3.5 px-5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        c.status === "BLACKLIST_RECOMMENDED"
                          ? "bg-red-600 text-white"
                          : c.status === "PROBATION"
                          ? "bg-amber-100 text-amber-800"
                          : c.status === "WATCHLIST"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {c.status.replace("_", " ")}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-xs">{c.penaltyClause}</p>
                  </td>
                  <td className="py-3.5 px-5 text-right font-extrabold text-slate-900">
                    {c.recommendedPenaltyAmount > 0 ? (
                      <span className="text-red-600">₹{c.recommendedPenaltyAmount.toLocaleString()}</span>
                    ) : (
                      <span className="text-slate-400">₹0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two Column Grid: Categories & Live Audit Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            Category Breakdown & Hazard Weights
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Distribution of complaints across municipal departments.
          </p>

          <div className="space-y-3">
            {data?.categoryBreakdown?.map((cat: any) => (
              <div key={cat.code} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-800">{cat.name}</span>
                  <span className="font-extrabold text-slate-900">{cat.count} complaints</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{cat.department}</span>
                  <span className="font-semibold text-emerald-700">
                    Base Hazard: {cat.baseHazard}/10
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Public Audit Stream (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            City-Wide Public Audit Ledger
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Immutable stream of citizen reports, officer proofs, and community verifications.
          </p>

          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-2">
            {logs.map((log: any) => (
              <div
                key={log.id}
                className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex items-start gap-3"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      {log.action.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] mt-0.5">{log.details}</p>
                  {log.issue && (
                    <Link
                      href={`/issues/${log.issue.id}`}
                      className="text-[10px] font-mono text-emerald-700 hover:underline mt-1 inline-block"
                    >
                      {log.issue.trackingCode}: {log.issue.title}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
