import { useEffect, useMemo, useRef, useState } from "react";
import { getJobView } from "../api/jobs";
import { ApplicationStepShell } from "../components/ApplicationStepShell";
import { CvParsingSignalLoader } from "../components/CvParsingSignalLoader";
import type { CandidateResumeState, CandidateSession } from "../contracts/application";
import type { JobViewData } from "../contracts/job-view";
import { buildMockCvParsingSignalLoaderModel } from "../lib/mock-cv-parsing-signals";
import { readPrototypeSession } from "../lib/prototype-auth";
import { readPrototypeResumeState } from "../lib/prototype-resume";
import {
  buildApplicationAuthPath,
  buildApplicationPersonalDetailsPath,
  buildApplicationUploadPath,
  buildJobViewPath,
  navigateTo
} from "../lib/router";

interface ApplicationParsingPageProps {
  jobId: string;
}

type LoadState = "loading" | "ready" | "missing";
type SkipTransitionState = "idle" | "handoff";

function buildCandidateName(session: CandidateSession | null): string | undefined {
  const candidateName = [session?.firstName, session?.lastName].filter(Boolean).join(" ").trim();
  return candidateName || undefined;
}

function usePrefersReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }

    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

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

function LoadingState(): JSX.Element {
  return (
    <div className="job-view__shell">
      <ApplicationStepShell ambientMode="quiet">
        <div className="application-step__panel surface-card skeleton skeleton--sheet" />
      </ApplicationStepShell>
    </div>
  );
}

function MissingState(): JSX.Element {
  return (
    <div className="job-view__shell">
      <ApplicationStepShell ambientMode="quiet">
        <section className="application-step__panel application-step__guard surface-card surface-card--section">
          <h1>Application step not available</h1>
          <p className="muted-copy">We couldn’t resolve the role for this parsing step.</p>
        </section>
      </ApplicationStepShell>
    </div>
  );
}

function SessionGuard({ job }: { job: JobViewData }): JSX.Element {
  return (
    <div className="job-view__shell">
      <ApplicationStepShell ambientMode="quiet">
        <section className="application-step__panel application-step__guard surface-card surface-card--section">
          <h1>Continue your application</h1>
          <p className="muted-copy">Sign in before we build your profile for {job.title}.</p>
          <div className="application-step__guard-actions">
            <a className="button button--job-primary" href={buildApplicationAuthPath(job.id, "signin")}>
              Go to application sign in
            </a>
            <a className="button button--ghost" href={buildJobViewPath(job.id)}>
              Back to job view
            </a>
          </div>
        </section>
      </ApplicationStepShell>
    </div>
  );
}

function MissingResumeState({ job }: { job: JobViewData }): JSX.Element {
  return (
    <div className="job-view__shell">
      <ApplicationStepShell ambientMode="quiet">
        <section className="application-step__panel application-step__guard surface-card surface-card--section">
          <h1>Resume required</h1>
          <p className="muted-copy">Upload a resume before we build your profile for {job.title}.</p>
          <div className="application-step__guard-actions">
            <a className="button button--job-primary" href={buildApplicationUploadPath(job.id)}>
              Back to resume upload
            </a>
          </div>
        </section>
      </ApplicationStepShell>
    </div>
  );
}

function ReadyState({
  job,
  resumeState,
  session
}: {
  job: JobViewData;
  resumeState: CandidateResumeState | null;
  session: CandidateSession | null;
}): JSX.Element {
  const prefersReducedMotion = usePrefersReducedMotion();
  const selectedResume =
    resumeState?.resumes.find((resume) => resume.id === resumeState.selectedResumeId) ??
    resumeState?.resumes[0] ??
    null;
  const parsingLoaderModel = useMemo(
    () =>
      buildMockCvParsingSignalLoaderModel({
        candidateName: buildCandidateName(session)
      }),
    [session]
  );
  const [skipTransitionState, setSkipTransitionState] = useState<SkipTransitionState>("idle");
  const handoffTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (handoffTimeoutRef.current !== null) {
        window.clearTimeout(handoffTimeoutRef.current);
        handoffTimeoutRef.current = null;
      }
    };
  }, []);

  if (!session) {
    return <SessionGuard job={job} />;
  }

  if (!selectedResume) {
    return <MissingResumeState job={job} />;
  }

  const handleSkip = (): void => {
    if (skipTransitionState === "handoff") {
      return;
    }

    setSkipTransitionState("handoff");

    const handoffDelay = prefersReducedMotion ? 120 : 560;
    handoffTimeoutRef.current = window.setTimeout(() => {
      navigateTo(buildApplicationPersonalDetailsPath(job.id), {
        payload: {
          transitionAt: new Date().toISOString(),
          transitionSource: "parsing-skip"
        }
      });
    }, handoffDelay);
  };

  return (
    <div className="job-view__shell">
      <ApplicationStepShell ambientMode="quiet">
        <section
          aria-busy={skipTransitionState === "handoff"}
          className="application-step__panel cv-parsing-stage"
          data-handoff-state={skipTransitionState}
          data-step-kind="parsing"
        >
          <CvParsingSignalLoader
            candidateName={parsingLoaderModel.candidateName}
            extractedSignals={parsingLoaderModel.extractedSignals}
            heading={parsingLoaderModel.heading}
            onSkip={handleSkip}
            skipDisabled={skipTransitionState === "handoff"}
            skipLabel={skipTransitionState === "handoff" ? "Opening details" : "Skip"}
            statusLines={parsingLoaderModel.statusLines}
            transitionState={skipTransitionState === "handoff" ? "exiting" : "idle"}
          />
        </section>
      </ApplicationStepShell>
    </div>
  );
}

export function ApplicationParsingPage({ jobId }: ApplicationParsingPageProps): JSX.Element {
  const [state, setState] = useState<LoadState>("loading");
  const [job, setJob] = useState<JobViewData | null>(null);
  const [session, setSession] = useState<CandidateSession | null>(null);
  const [resumeState, setResumeState] = useState<CandidateResumeState | null>(null);

  useEffect(() => {
    let cancelled = false;
    const prototypeSession = readPrototypeSession();

    setState("loading");
    setJob(null);
    setSession(prototypeSession);
    setResumeState(prototypeSession ? readPrototypeResumeState(prototypeSession.email) : null);

    getJobView(jobId).then((result) => {
      if (cancelled) {
        return;
      }

      if (!result) {
        setState("missing");
        return;
      }

      setJob(result);
      setState("ready");
    });

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  if (state === "loading") {
    return <LoadingState />;
  }

  if (state === "missing" || !job) {
    return <MissingState />;
  }

  return <ReadyState job={job} resumeState={resumeState} session={session} />;
}
