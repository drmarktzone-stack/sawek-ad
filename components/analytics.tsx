import Script from "next/script";

/** Optional, env-gated. No ID → nothing is loaded. No fake tracking. */
export function Analytics() {
  const ga = (process.env.NEXT_PUBLIC_GA_ID ?? "").trim();
  const plausible = (process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? "").trim();
  if (!ga && !plausible) return null;
  return (
    <>
      {ga ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga)}`} strategy="afterInteractive" />
          <Script id="sawek-ga" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga.replace(/'/g, "")}');`}
          </Script>
        </>
      ) : null}
      {plausible ? (
        <Script
          defer
          data-domain={plausible}
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      ) : null}
    </>
  );
}
