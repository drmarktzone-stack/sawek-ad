import type { Metadata, Viewport } from "next";
import { Amiri, Cairo, Fraunces, Frank_Ruhl_Libre, Heebo } from "next/font/google";
import { I18nProvider } from "@/components/i18n-provider";
import { Footer, Header } from "@/components/header";
import { AuthProvider } from "@/components/auth-provider";
import { PwaRegister } from "@/components/pwa-install-hint";
import { Analytics } from "@/components/analytics";
import { rootMetadata } from "@/lib/seo";
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

const frankRuhl = Frank_Ruhl_Libre({
  subsets: ["latin", "hebrew"],
  variable: "--font-display-he",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display-en",
  display: "swap",
});

const amiri = Amiri({
  subsets: ["latin", "arabic"],
  weight: ["400", "700"],
  variable: "--font-display-ar",
  display: "swap",
});

export const metadata: Metadata = rootMetadata();

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#08111F" },
    { media: "(prefers-color-scheme: dark)", color: "#08111F" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="he"
      dir="rtl"
      suppressHydrationWarning
      className={`${heebo.variable} ${cairo.variable} ${frankRuhl.variable} ${fraunces.variable} ${amiri.variable} h-full antialiased`}
    >
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#08111F" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var q=new URLSearchParams(location.search).get("lang");var s=localStorage.getItem("omniad-locale");var l=(q==="ar"||q==="he"||q==="en")?q:(s==="ar"||s==="he"||s==="en")?s:"he";document.documentElement.lang=l;document.documentElement.dir=l==="en"?"ltr":"rtl";if(!q){var u=new URL(location.href);u.searchParams.set("lang",l);history.replaceState(history.state,"",u.pathname+u.search+u.hash);}localStorage.setItem("omniad-locale",l);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="flex min-h-dvh flex-col overflow-x-clip font-sans">
        <AuthProvider>
          <I18nProvider>
            <PwaRegister />
            <Analytics />
            <Header />
            <main className="flex-1 w-full min-w-0">{children}</main>
            <Footer />
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
