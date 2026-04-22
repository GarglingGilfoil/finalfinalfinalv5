import { useMemo, useState } from "react";
import type { JobViewData } from "../contracts/job-view";

interface EmployerContextPanelProps {
  job: JobViewData;
  message?: string;
}

function getCompanyMonogram(companyName: string): string {
  const parts = companyName
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return "CO";
}

export function EmployerContextPanel({
  job,
  message = "Sign in or create an account to continue your application."
}: EmployerContextPanelProps): JSX.Element {
  const [hasImageError, setHasImageError] = useState(false);
  const monogram = useMemo(() => getCompanyMonogram(job.companyName), [job.companyName]);
  const hasLogo = Boolean(job.companyLogoUrl) && !hasImageError;
  const showFallback = !hasLogo;

  const logoLayers = (
    <>
      {hasLogo ? (
        <span
          aria-hidden={showFallback}
          className="application-context__logo-layer application-context__logo-layer--image"
        >
          <img
            alt={`${job.companyName} logo`}
            onError={() => {
              setHasImageError(true);
            }}
            src={job.companyLogoUrl ?? undefined}
          />
        </span>
      ) : null}

      <span
        aria-hidden={!showFallback}
        className="application-context__logo-layer application-context__logo-layer--fallback"
      >
        <span className="application-context__logo-monogram">{monogram}</span>
      </span>
    </>
  );

  return (
    <section className="application-context">
      <p className="application-context__eyebrow">Applying to</p>

      <div className="application-context__identity">
        <div
          className={[
            "application-context__logo-button",
            "application-context__logo-button--static",
            showFallback ? "is-fallback" : "is-logo"
          ]
            .filter(Boolean)
            .join(" ")}
          role="img"
          aria-label={`${job.companyName} ${showFallback ? "fallback logo" : "logo"}`}
        >
          {logoLayers}
        </div>

        <div className="application-context__copy">
          <h1>{job.title}</h1>
          <p className="application-context__supporting-line">
            <span className="application-context__company">{job.companyName}</span>
            <span aria-hidden="true">·</span>
            <span>{job.location}</span>
          </p>
        </div>
      </div>

      <p className="application-context__message">{message}</p>
    </section>
  );
}
