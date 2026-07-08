import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import ThemeInit from "@/components/ThemeInit";
import SwRegister from "@/components/SwRegister";

export const metadata: Metadata = {
  title: "Medication Tracker",
  description: "Theo dõi uống thuốc, phát bệnh và tái khám",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Thuốc" },
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <ThemeInit />
        <SwRegister />
        <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col pb-24">
          <main className="flex-1 px-4 pt-4">{children}</main>
        </div>
        <Nav />
      </body>
    </html>
  );
}
