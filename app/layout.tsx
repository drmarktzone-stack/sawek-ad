import type { Metadata } from "next";
import { Cairo, Heebo } from "next/font/google";
import { I18nProvider } from "@/components/i18n-provider";
import { Footer, Header } from "@/components/header";
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
  title: "Ilan — אילן / إعلان",
  description:
    "Ilan (אילן / إعلان): RTL campaign builder with a 4-step wizard, five-agent HITL pipeline, and HE/AR/EN copy — OmniAd engine, AdBrain agents. No invented leads or testimonials.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="he"
      dir="rtl"
      suppressHydrationWarning
      className={`${heebo.variable} ${cairo.variable} h-full dark antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <I18nProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}
