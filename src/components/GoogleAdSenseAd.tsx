import { useEffect, useRef } from "react";

const ADSENSE_SCRIPT_ID = "google-adsense-script";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

interface GoogleAdSenseAdProps {
  adName: string;
  className?: string;
  client: string;
  format?: string;
  fullWidthResponsive?: boolean;
  slot: string;
}

function loadAdSenseScript(client: string): void {
  if (typeof document === "undefined") {
    return;
  }

  if (document.getElementById(ADSENSE_SCRIPT_ID)) {
    return;
  }

  const script = document.createElement("script");
  script.id = ADSENSE_SCRIPT_ID;
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  script.dataset.adClient = client;

  document.head.appendChild(script);
}

export function GoogleAdSenseAd({
  adName,
  className,
  client,
  format = "auto",
  fullWidthResponsive = true,
  slot
}: GoogleAdSenseAdProps): JSX.Element {
  const hasRequestedAd = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    loadAdSenseScript(client);

    if (hasRequestedAd.current) {
      return;
    }

    hasRequestedAd.current = true;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ad blockers or local-preview restrictions should never break the page.
    }
  }, [client]);

  return (
    <aside
      aria-label={adName}
      className={["google-adsense-ad", className].filter(Boolean).join(" ")}
      data-ad-name={adName}
    >
      <span className="google-adsense-ad__label">Advertisement</span>
      <ins
        aria-hidden="true"
        className="adsbygoogle google-adsense-ad__unit"
        data-ad-client={client}
        data-ad-format={format}
        data-ad-slot={slot}
        data-full-width-responsive={fullWidthResponsive ? "true" : "false"}
        style={{ display: "block" }}
      />
    </aside>
  );
}
