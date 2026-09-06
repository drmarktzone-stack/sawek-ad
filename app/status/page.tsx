import type { Metadata } from "next";
import { GcpStatusPage } from "@/components/gcp-status-page";
import { marketingMetadata } from "@/lib/seo";

export const metadata: Metadata = marketingMetadata({
  path: "/status",
  title: "SAWEK AD — סטטוס GCP / Vertex",
  description:
    "Live Vertex / Gemini / Imagen / Translation status for SAWEK AD. No invented platform metrics.",
});

export default function StatusRoute() {
  return <GcpStatusPage />;
}
