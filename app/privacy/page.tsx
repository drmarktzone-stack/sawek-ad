import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { marketingMetadata } from "@/lib/seo";

export const metadata: Metadata = marketingMetadata({
  path: "/privacy",
  title: "SAWEK AD — מדיניות פרטיות / Privacy",
  description:
    "Privacy policy for SAWEK AD: account email, campaign inputs, uploaded assets, and Google / Vertex / Supabase processors. Honest SaaS policy for local businesses in Israel.",
});

export default function PrivacyRoute() {
  return <LegalPage kind="privacy" />;
}
