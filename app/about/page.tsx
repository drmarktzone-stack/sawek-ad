import type { Metadata } from "next";
import { AboutPage } from "@/components/about-page";

export const metadata: Metadata = {
  title: "SAWEK AD — מה זה / אודות",
  description:
    "SAWEK AD is a CMO desk: paste a website, Facebook, or Instagram URL, get a campaign pack in Hebrew, Arabic, and English. Published facts only — no invented ROAS.",
};

export default function About() {
  return <AboutPage />;
}
