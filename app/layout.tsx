import type { Metadata, Viewport } from "next";
import { Cairo, Heebo } from "next/font/google";
import { I18nProvider } from "@/components/i18n-provider";
import { Footer, Header } from "@/components/header";
import { AuthProvider } from "@/components/auth-provider";
import { PwaRegister } from "@/components/pwa-install-hint";
import "./globals.css";

const heebo = Heebo({
  subsets: ["latin", "hebrew"],
  variable: "--font-heebo",
  display: "swap",
});

const cairo = Cairo({
  subsets: ["latin", "arabic"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SAWEK AD — سوِّق إعلانك بنفسك / סאווק",
  description:
    "SAWEK AD: paste a business website, get finished ads for Facebook, Instagram, TikTok and WhatsApp in Hebrew and Arabic, plus a landing page and download. No invented ROAS.",
  manifest: "/manifest.webmanifest",
  applicationName: "SAWEK AD",
  appleWebApp: {
    capable: true,
    title: "SAWEK AD",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1B2A4A",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="he"
      dir="rtl"
      suppressHydrationWarning
      className={`${heebo.variable} ${cairo.variable} h-full antialiased`}
    >
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#1B2A4A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var q=new URLSearchParams(location.search).get("lang");var s=localStorage.getItem("omniad-locale");var l=(q==="ar"||q==="he"||q==="en")?q:(s==="ar"||s==="he"||s==="en")?s:"he";document.documentElement.lang=l;document.documentElement.dir=l==="en"?"ltr":"rtl";if(!q){var u=new URL(location.href);u.searchParams.set("lang",l);history.replaceState(history.state,"",u.pathname+u.search+u.hash);}localStorage.setItem("omniad-locale",l);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <AuthProvider>
          <I18nProvider>
            <PwaRegister />
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
