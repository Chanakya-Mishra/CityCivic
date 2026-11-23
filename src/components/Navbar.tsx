"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  MapPin,
  AlertTriangle,
  Briefcase,
  BarChart3,
  Award,
  UserCheck,
  Shield,
  Sparkles,
  LogOut,
  LogIn,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { user, openAuthModal, switchPersona, logout } = useAuth();

  const navItems = [
    { href: "/", label: "Public City Map", icon: MapPin },
    { href: "/report", label: "Report Issue", icon: AlertTriangle },
    { href: "/officer", label: "Ward Console", icon: Briefcase },
    { href: "/admin", label: "City Analytics", icon: BarChart3 },
    { href: "/leaderboard", label: "Leaderboard", icon: Award },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 text-lg tracking-tight">CityCivic</span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded-md">LIVE</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium -mt-1 hidden sm:block">
                Geotagged • Deduplicated • Publicly Verified
              </p>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Persona Switcher & User Profile */}
          <div className="flex items-center gap-2.5">
            {/* Quick Demo Switcher */}
            <div className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
              <button
                onClick={() => switchPersona("CITIZEN")}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  user?.role === "CITIZEN" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
                title="Switch to Resident perspective"
              >
                Resident
              </button>
              <button
                onClick={() => switchPersona("WARD_OFFICER")}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  user?.role === "WARD_OFFICER" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
                title="Switch to Ward 02 Officer (Indiranagar)"
              >
                Ward Officer
              </button>
              <button
                onClick={() => switchPersona("ADMIN")}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  user?.role === "ADMIN" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
                title="Switch to City Commissioner Admin"
              >
                City Admin
              </button>
            </div>

            {/* User chip or Login button */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-xs font-semibold text-slate-800">{user.name || user.email.split("@")[0]}</span>
                    {user.role === "WARD_OFFICER" && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-medium">Officer</span>
                    )}
                    {user.role === "ADMIN" && (
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-medium">Admin</span>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-1 text-[11px] text-slate-500">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>{user.karma || 10} karma</span>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={openAuthModal}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Verify Citizen</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden overflow-x-auto gap-2 py-2 border-t border-slate-100 text-xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap font-medium ${
                  isActive ? "bg-slate-900 text-white" : "text-slate-600 bg-slate-50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
