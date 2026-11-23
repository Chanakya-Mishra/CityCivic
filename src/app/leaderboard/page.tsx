"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Trophy,
  Award,
  Sparkles,
  ShieldCheck,
  MapPin,
  Flame,
  CheckCircle2,
  Users,
} from "lucide-react";

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((res) => res.json())
      .then((data) => setLeaderboard(data.leaderboard || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-600 to-emerald-700 rounded-2xl p-6 sm:p-8 text-white shadow-xl mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold mb-3">
          <Trophy className="w-4 h-4 text-amber-200" />
          <span>Neighborhood Civic Champions</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Citizen Karma & Audit Leaderboard
        </h1>
        <p className="mt-2 text-white/90 text-xs sm:text-sm max-w-2xl">
          Residents who actively corroborate issues, verify on-ground repairs, and audit fake closures earn community trust karma and higher verification voting power.
        </p>

        {user && (
          <div className="mt-5 inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 text-xs">
            <span>Your Active Karma:</span>
            <span className="font-extrabold text-amber-300 text-sm">
              {user.karma || 10} Points
            </span>
            <span className="text-white/60">•</span>
            <span className="text-emerald-200 font-semibold">
              {user.karma && user.karma >= 100 ? "Civic Guardian" : user.karma && user.karma >= 50 ? "Senior Auditor" : "Verified Neighbor"}
            </span>
          </div>
        )}
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Top Neighborhood Auditors & Spotters
          </h2>
          <span className="text-xs text-slate-500">Updated in Real-Time</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-5">Rank & Resident</th>
                <th className="py-3.5 px-5">Badge Tier</th>
                <th className="py-3.5 px-5">Ward</th>
                <th className="py-3.5 px-5">Reports / Verifications</th>
                <th className="py-3.5 px-5 text-right">Total Karma</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No citizen leaderboard entries yet.
                  </td>
                </tr>
              ) : (
                leaderboard.map((c, index) => {
                  const isTop3 = index < 3;
                  const rankIcon =
                    index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`;

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-50/70 transition ${
                        isTop3 ? "bg-amber-50/20" : ""
                      }`}
                    >
                      {/* Rank & Resident */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <span className="text-base font-bold w-6 text-center">{rankIcon}</span>
                          <div>
                            <span className="font-bold text-slate-900 block">{c.name}</span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {c.phoneMasked}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Badge Tier */}
                      <td className="py-3.5 px-5">
                        <span
                          className="text-[11px] font-bold px-2 py-0.5 rounded-full inline-block"
                          style={{
                            backgroundColor: `${c.badge.color}20`,
                            color: c.badge.color,
                            border: `1px solid ${c.badge.color}40`,
                          }}
                        >
                          {c.badge.title}
                        </span>
                      </td>

                      {/* Ward */}
                      <td className="py-3.5 px-5 text-slate-700 font-medium">{c.wardName}</td>

                      {/* Contributions */}
                      <td className="py-3.5 px-5">
                        <span className="text-slate-800 font-semibold">
                          {c.totalReports} reports
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          {" "}• {c.totalVerifications} ground audits
                        </span>
                      </td>

                      {/* Karma Points */}
                      <td className="py-3.5 px-5 text-right">
                        <span className="font-extrabold text-sm text-slate-900 flex items-center justify-end gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          {c.karma}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
