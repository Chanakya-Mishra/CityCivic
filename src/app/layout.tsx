import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { AuthModal } from "@/components/AuthModal";
import { RoleSwitchModal } from "@/components/RoleSwitchModal";

export const metadata: Metadata = {
  metadataBase: new URL("https://citycivic.vercel.app"),
  title: "CityCivic — Resolving Urban Issues Together",
  description:
    "Next-generation civic issue tracking with spatial deduplication, tamper-proof geotags, Gemini AI vision triage, and community-audited municipal resolution.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png" },
      { url: "/logo-icon.png", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png" }],
    shortcut: ["/favicon.ico"],
  },
  openGraph: {
    title: "CityCivic — Resolving Urban Issues Together",
    description:
      "Empowering citizens and municipal engineers with real-time geotagged issue reporting, spatial deduplication, and community verification.",
    images: [{ url: "/logo-card.png", width: 344, height: 335, alt: "CityCivic Brand" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased">
        <AuthProvider>
          <Navbar />
          <AuthModal />
          <RoleSwitchModal />
          <main className="flex-1">{children}</main>
          <footer className="bg-[#0e2743] border-t border-[#1a385c] py-6 text-xs text-slate-300">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/10 p-1.5 flex items-center justify-center shrink-0 border border-white/15 backdrop-blur-sm">
                  <img
                    src="/logo-icon.png"
                    alt="CityCivic Icon"
                    className="w-full h-full object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div>
                  <p className="font-bold text-white tracking-tight">
                    CityCivic Open Civic Platform
                  </p>
                  <p className="text-[11px] text-teal-300/90 font-medium">
                    Resolving Urban Issues Together • Spatial Deduplication & Public Audit
                  </p>
                </div>
              </div>
              <p className="text-slate-400 text-center sm:text-right text-[11px]">
                Affecting Urban Residents, Ward Field Officers & Local Municipal Corporations
              </p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
