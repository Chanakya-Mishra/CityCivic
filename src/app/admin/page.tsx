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
  Lock,
  KeyRound,
  ShieldCheck,
} from "lucide-react";

export default function AdminAnalyticsPage() {
  const { user, governanceLogin } = useAuth();
  const [data, setData] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Municipal Admin Auth State
  const [adminEmail, setAdminEmail] = useState("admin@citycivic.gov");
  const [adminPassword, setAdminPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthenticating(true);
    try {
      const res = await governanceLogin(adminEmail, adminPassword, "ADMIN");
      if (!res.success) {
        setAuthError(res.error || "Authentication failed. Invalid administrator credentials.");
      } else {
        setAdminPassword("");
      }
    } finally {
      setAuthenticating(false);
    }
  };

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

  if (user?.role !== "ADMIN") {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 p-6 text-white text-center">
            <div className="w-14 h-14 bg-blue-500/20 border border-blue-400/30 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
              <Lock className="w-7 h-7 text-blue-300" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-wider text-blue-300 mb-2">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Municipal Executive Authorization Required</span>
            </div>
            <h1 className="text-xl font-extrabold">City Operations & SLA Dashboard</h1>
            <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
              This executive analytics suite is restricted to City Commissioners and Municipal Directors. Citizen accounts cannot access contractor discipline scorecards or internal SLA logs.
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

            <form onSubmit={handleAdminAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Executive Admin Email
                </label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@citycivic.gov"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Commissioner Authorization Passphrase
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter commissioner password"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Enter the executive passphrase issued by the Municipal Commissioner's Office.
                </p>
              </div>

              <button
                type="submit"
                disabled={authenticating}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {authenticating ? (
                  <span>Verifying Credentials...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Authenticate & Access Executive Dashboard</span>
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

  const overview = data?.overview || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

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
