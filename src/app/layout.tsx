import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { AuthModal } from "@/components/AuthModal";

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
          <main className="flex-1">{children}</main>
          <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src="/logo-icon.png"
                  alt="CityCivic Icon"
                  className="w-6 h-6 object-contain"
                  loading="lazy"
                  decoding="async"
                />
                <div>
                  <p className="font-semibold text-slate-800">
                    CityCivic Open Civic Platform
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Resolving Urban Issues Together • Spatial Deduplication & Public Audit
                  </p>
                </div>
              </div>
              <p className="text-slate-400 text-center sm:text-right">
                Affecting Urban Residents, Ward Field Officers & Local Municipal Corporations
              </p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
