import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import LoadingScreen from "@/components/LoadingScreen";
import PwaBoot from "@/components/pwa/PwaBoot";

export const metadata: Metadata = {
  title: "ComicBooksGeo - Georgian Literature Reimagined",
  description: "Classic Georgian literature transformed into beautiful digital comic books.",
  applicationName: "ComicBooksGeo",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ComicBooksGeo",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#080c14",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ka" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <LoadingScreen />
        <PwaBoot />
        <ThemeProvider>
          <AuthProvider>
            <LanguageProvider>
              {children}
            </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
