import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { AuthModal } from "@/components/AuthModal";

export const metadata: Metadata = {
  title: "CityCivic - Geotagged Public Civic Platform",
  description:
    "A geotagged civic issue reporting application that groups duplicate complaints, prioritizes severity using community verification, and provides public resolution tracking.",
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
          <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <p>
                <strong>CityCivic Open Civic Platform</strong> • Geotagging, Deduplication & Community-Audited Resolution
              </p>
              <p className="text-slate-400">
                Affecting Urban Residents, Ward Field Officers & Local Civic Bodies
              </p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
