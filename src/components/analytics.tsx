import Script from "next/script";

// ID de medición GA4 de misescorts.com (es público: viaja en el HTML igual).
const GA_ID = "G-EHSVM19BSY";

/**
 * Google Analytics 4 (gtag.js). Solo carga en producción para no mezclar
 * tráfico de desarrollo en las métricas. Las navegaciones SPA del App Router
 * las registra solo la "medición mejorada" de GA4 (detecta cambios de la
 * History API), activada por defecto en la propiedad.
 */
export function Analytics() {
  if (process.env.NODE_ENV !== "production") return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-gtag" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
    </>
  );
}
