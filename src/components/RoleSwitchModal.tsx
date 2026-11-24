"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Lock,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  X,
  AlertTriangle,
} from "lucide-react";

export function RoleSwitchModal() {
  const router = useRouter();
  const { isRoleModalOpen, targetRole, closeRoleModal, switchPersona } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isRoleModalOpen) {
      setPassword("");
      setError(null);
    }
  }, [isRoleModalOpen]);

  if (!isRoleModalOpen || !targetRole) return null;

  const isOfficer = targetRole === "WARD_OFFICER";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Please enter the authorization password.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await switchPersona(targetRole, password);
      if (!res.success) {
        setError(res.error || "Authentication failed. Invalid authorization password.");
      } else {
        closeRoleModal();
        setPassword("");
        router.push(isOfficer ? "/officer" : "/admin");
      }
    } catch (err: any) {
      setError(err.message || "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div
          className={`p-6 text-white relative ${
            isOfficer
              ? "bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950"
              : "bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950"
          }`}
        >
          <button
            onClick={closeRoleModal}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                isOfficer
                  ? "bg-teal-500/20 border-teal-400/30 text-teal-300"
                  : "bg-blue-500/20 border-blue-400/30 text-blue-300"
              }`}
            >
              {isOfficer ? <ShieldAlert className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </div>
            <div>
              <div
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1 ${
                  isOfficer ? "bg-teal-500/20 text-teal-300" : "bg-blue-500/20 text-blue-300"
                }`}
              >
                <span>{isOfficer ? "Municipal Field Security" : "Executive Governance"}</span>
              </div>
              <h3 className="text-lg font-extrabold text-white">
                {isOfficer ? "Ward Officer Authentication" : "City Administrator Authorization"}
              </h3>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-2">
            {isOfficer
              ? "Enter the secure municipal passphrase issued to your Ward Engineering Unit. Resident accounts cannot access work orders or resolution tools."
              : "Enter the executive passphrase issued by the Municipal Commissioner's Office to access governance actions."}
          </p>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {isOfficer ? "Municipal Authorization Passphrase" : "Commissioner Authorization Passphrase"}
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter official password"
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 ${
                    isOfficer ? "focus:ring-teal-500" : "focus:ring-blue-500"
                  }`}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                Authorized departmental credentials required. Access attempts are audited.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={closeRoleModal}
                className="w-1/3 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !password}
                className={`w-2/3 py-2.5 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 ${
                  isOfficer
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                }`}
              >
                {submitting ? (
                  <span>Verifying Credentials...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Authenticate & Switch</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
