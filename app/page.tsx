import type { Metadata } from "next";
import { HomeStudio } from "@/components/home-studio";
import { marketingMetadata } from "@/lib/seo";

export const metadata: Metadata = marketingMetadata({
  path: "/",
  title: "SAWEK AD — سوِّق إعلانك بنفسك / סאווק",
  description:
    "SAWEK AD: paste a business website, get finished ads for Facebook, Instagram, TikTok and WhatsApp in Hebrew and Arabic, plus a landing page and download. No invented ROAS.",
});

export default function HomePage() {
  return <HomeStudio />;
}
