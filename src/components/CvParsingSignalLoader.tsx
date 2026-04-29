import { useEffect, useId, useMemo, useState } from "react";
import {
  DEFAULT_CV_PARSING_HEADING_LOCKUP,
  DEFAULT_CV_PARSING_STATUS_LINES
} from "../lib/mock-cv-parsing-signals";
import type { CvParsingHeadingLockup } from "../lib/mock-cv-parsing-signals";

const STATUS_INTERVAL_MS = 3400;
const STATUS_EXIT_MS = 220;

export interface CvParsingSignalLoaderProps {
  candidateName?: string;
  heading?: CvParsingHeadingLockup;
  onSkip?: () => void;
  skipDisabled?: boolean;
  skipLabel?: string;
  statusLines?: readonly string[];
  transitionState?: "idle" | "exiting";
  className?: string;
}

function usePrefersReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = (): void => {
      setReducedMotion(mediaQuery.matches);
    };

    update();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
      return () => {
        mediaQuery.removeEventListener("change", update);
      };
    }

    mediaQuery.addListener(update);
    return () => {
      mediaQuery.removeListener(update);
    };
  }, []);

  return reducedMotion;
}

function normalizeLines(values: readonly string[] | undefined, fallback: readonly string[]): string[] {
  const resolved = values?.length ? values : fallback;
  const seen = new Set<string>();

  return resolved
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => {
      const normalizedValue = value.toLowerCase();

      if (seen.has(normalizedValue)) {
        return false;
      }

      seen.add(normalizedValue);
      return true;
    });
}

function normalizeHeading(
  heading: CvParsingHeadingLockup | undefined,
  fallback: CvParsingHeadingLockup
): CvParsingHeadingLockup {
  const resolvedHeading = heading ?? fallback;
  const normalizedEyebrow = resolvedHeading.eyebrow?.trim() ?? fallback.eyebrow?.trim() ?? "";

  return {
    eyebrow: normalizedEyebrow,
    title: resolvedHeading.title.trim() || fallback.title,
    support: resolvedHeading.support.trim() || fallback.support
  };
}

export function CvParsingSignalLoader({
  candidateName,
  heading,
  onSkip,
  skipDisabled = false,
  skipLabel = "Skip",
  statusLines,
  transitionState = "idle",
  className
}: CvParsingSignalLoaderProps): JSX.Element {
  const headingId = useId();
  const supportId = useId();
  const summaryId = useId();
  const prefersReducedMotion = usePrefersReducedMotion();
  const resolvedHeading = useMemo(
    () => normalizeHeading(heading, DEFAULT_CV_PARSING_HEADING_LOCKUP),
    [heading]
  );
  const resolvedStatusLines = useMemo(
    () => normalizeLines(statusLines, DEFAULT_CV_PARSING_STATUS_LINES),
    [statusLines]
  );
  const [statusIndex, setStatusIndex] = useState(0);
  const [statusPhase, setStatusPhase] = useState<"settled" | "exiting">("settled");

  useEffect(() => {
    if (prefersReducedMotion || resolvedStatusLines.length <= 1) {
      setStatusIndex(0);
      setStatusPhase("settled");
      return;
    }

    let transitionTimeout = 0;
    const interval = window.setInterval(() => {
      setStatusPhase("exiting");

      transitionTimeout = window.setTimeout(() => {
        setStatusIndex((currentIndex) => (currentIndex + 1) % resolvedStatusLines.length);
        setStatusPhase("settled");
      }, STATUS_EXIT_MS);
    }, STATUS_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(transitionTimeout);
    };
  }, [prefersReducedMotion, resolvedStatusLines.length]);

  const currentStatusLine =
    resolvedStatusLines[statusIndex % Math.max(1, resolvedStatusLines.length)] ??
    DEFAULT_CV_PARSING_STATUS_LINES[0];
  const accessibleSummary = candidateName
    ? `Analyzing ${candidateName}'s resume and preparing the application profile.`
    : "Analyzing your resume and preparing your application profile.";

  return (
    <section
      aria-describedby={`${supportId} ${summaryId}`}
      aria-labelledby={headingId}
      className={["cv-signal-loader", className].filter(Boolean).join(" ")}
      data-motion-mode={prefersReducedMotion ? "reduced" : "full"}
      data-transition-state={transitionState}
    >
      <div className="cv-signal-loader__chrome">
        <button
          className="button button--ghost cv-signal-loader__skip"
          disabled={skipDisabled}
          onClick={onSkip}
          type="button"
        >
          {skipLabel}
        </button>
      </div>

      <header className="cv-signal-loader__header">
        {resolvedHeading.eyebrow ? <p className="cv-signal-loader__eyebrow">{resolvedHeading.eyebrow}</p> : null}
        <div className="cv-signal-loader__lockup">
          <h1 className="cv-signal-loader__title" id={headingId}>
            {resolvedHeading.title}
          </h1>
          <p className="cv-signal-loader__support" id={supportId}>
            {resolvedHeading.support}
          </p>
        </div>
      </header>

      <div className="cv-signal-loader__stage">
        <div className="cv-signal-loader__ambient" aria-hidden="true">
          <span className="cv-signal-loader__ambient-glow cv-signal-loader__ambient-glow--one" />
          <span className="cv-signal-loader__ambient-glow cv-signal-loader__ambient-glow--two" />
        </div>

        <div aria-hidden="true" className="cv-signal-loader__analysis-core">
          <div className="cv-signal-loader__analysis-halo">
            <span className="cv-signal-loader__ring-pulse" />
            <span className="cv-signal-loader__loader-comet" />

            <svg
              className="cv-signal-loader__loader-ring"
              focusable="false"
              viewBox="0 0 100 100"
            >
              <circle className="cv-signal-loader__loader-track" cx="50" cy="50" r="47" />
            </svg>

            <article className="cv-signal-loader__document">
              <span className="cv-signal-loader__document-scan" />
              <div className="cv-signal-loader__document-header">
                <span className="cv-signal-loader__document-mark">
                  <img alt="" src="/brand/ditto-mark.svg" />
                  <span className="cv-signal-loader__mark-shimmer" />
                </span>
                <span className="cv-signal-loader__document-id-line" />
              </div>

              <div className="cv-signal-loader__document-body">
                <span className="cv-signal-loader__document-line cv-signal-loader__document-line--wide" />
                <span className="cv-signal-loader__document-line cv-signal-loader__document-line--active" />
                <span className="cv-signal-loader__document-line cv-signal-loader__document-line--short" />
                <span className="cv-signal-loader__document-block" />
                <span className="cv-signal-loader__document-line cv-signal-loader__document-line--medium" />
                <span className="cv-signal-loader__document-line cv-signal-loader__document-line--short" />
              </div>
            </article>
          </div>
        </div>
      </div>

      <p className="sr-only" id={summaryId}>
        {accessibleSummary}
      </p>

      <div aria-hidden="true" className="cv-signal-loader__status">
        <div className="cv-signal-loader__status-row">
          <span className="cv-signal-loader__status-dot" />
          <span className="cv-signal-loader__status-viewport">
            <span
              className="cv-signal-loader__status-line"
              data-phase={statusPhase}
              key={currentStatusLine}
            >
              {currentStatusLine}
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}
