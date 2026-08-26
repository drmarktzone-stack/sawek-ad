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
  title: "SAWEK AD — ساويك / סאווק",
  description:
    "SAWEK AD: RTL campaign studio with a 4-step wizard, five Gemini agents, and HE/AR/EN copy — OmniAd engine, OptiBrain medical desk. No invented leads or testimonials.",
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
