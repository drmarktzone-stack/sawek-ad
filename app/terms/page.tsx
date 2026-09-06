import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { marketingMetadata } from "@/lib/seo";

export const metadata: Metadata = marketingMetadata({
  path: "/terms",
  title: "SAWEK AD — תנאי שימוש / Terms",
  description:
    "Terms of use for SAWEK AD: Free and Pro pricing, refunds when Pro is paid, no invented ROAS, PLAN-only media. For local businesses in Israel.",
});

export default function TermsRoute() {
  return <LegalPage kind="terms" />;
}
