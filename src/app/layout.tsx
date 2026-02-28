import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { ArtistProvider } from "@/lib/contexts/ArtistContext";
import { Sidebar } from "@/components/Sidebar";
import { ArtistBadge } from "@/components/ArtistBadge";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Enjune Music",
  description: "Music IP Intelligence Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Suspense>
          <ArtistProvider>
            <Sidebar />
            <main className="min-h-screen pt-14 md:ml-60 md:pt-0">
              <div className="p-6">
                <ArtistBadge />
                {children}
              </div>
            </main>
          </ArtistProvider>
        </Suspense>
      </body>
    </html>
  );
}
