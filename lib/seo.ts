import type { Metadata } from "next";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  OG_IMAGE_PATH,
  SITE_NAME,
  absoluteUrl,
  siteUrl,
} from "./site";

export function marketingMetadata(opts: {
  path: string;
  title?: string;
  description?: string;
}): Metadata {
  const title = opts.title ?? DEFAULT_TITLE;
  const description = opts.description ?? DEFAULT_DESCRIPTION;
  const url = absoluteUrl(opts.path);
  const image = {
    url: OG_IMAGE_PATH,
    width: 1536,
    height: 1024,
    alt: `${SITE_NAME} — סאווק · سوِّق إعلانك بنفسك`,
  };
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "he_IL",
      alternateLocale: ["ar", "en_US"],
      type: "website",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE_PATH],
    },
  };
}

export function rootMetadata(): Metadata {
  return {
    metadataBase: new URL(siteUrl()),
    ...marketingMetadata({ path: "/" }),
    applicationName: SITE_NAME,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: SITE_NAME,
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
}
