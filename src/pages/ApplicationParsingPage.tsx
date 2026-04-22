import { useEffect, useMemo, useRef, useState } from "react";
import { getJobView } from "../api/jobs";
import { ApplicationStepShell } from "../components/ApplicationStepShell";
import type {
  CandidateResumeState,
  CandidateSession,
  PrototypeResumeRecord
} from "../contracts/application";
import type { JobViewData } from "../contracts/job-view";
import { readPrototypeSession } from "../lib/prototype-auth";
import {
  buildPrototypeCareerHistoryState,
  savePrototypeCareerHistoryState
} from "../lib/prototype-career-history";
import { readPrototypeResumeState } from "../lib/prototype-resume";
import {
  buildApplicationAuthPath,
  buildApplicationCareerHistoryPath,
  buildApplicationUploadPath,
  buildJobViewPath
} from "../lib/router";

interface ApplicationParsingPageProps {
  jobId: string;
}

type LoadState = "loading" | "ready" | "missing";
type ParsingPhase = "intro" | "extracting" | "complete" | "exiting";
type ParsingFrameKind = "scan" | "extract" | "almost" | "complete";

interface SourceRow {
  id: string;
  section: string;
  title: string;
  detail: string;
}

interface ParsingFrame {
  id: string;
  kind: ParsingFrameKind;
  kicker: string;
  title: string;
  subtitle: string;
  status: string;
  rowIndex: number | null;
  resolvedCount: number;
}

const SOURCE_ROWS: readonly SourceRow[] = [
  {
    id: "experience",
    section: "Experience",
    title: "Senior Engineer @ Takealot",
    detail: "Platform engineering and product delivery"
  },
  {
    id: "education",
    section: "Education",
    title: "BCom Degree @ UCT",
    detail: "Commerce and business qualification"
  },
  {
    id: "profile",
    section: "Profile",
    title: "Career timeline and supporting details",
    detail: "Locations, dates, and role context"
  }
] as const;

const PARSING_FRAMES: readonly ParsingFrame[] = [
  {
    id: "scan",
    kind: "scan",
    kicker: "Parsing",
    title: "Analyzing your CV",
    subtitle: "Looking for meaningful experience, education, and profile details.",
    status: "Analyzing your CV",
    rowIndex: null,
    resolvedCount: 0
  },
  {
    id: "experience",
    kind: "extract",
    kicker: "Experience",
    title: "Senior Engineer @ Takealot",
    subtitle: "Work experience recognised from your resume.",
    status: "Extracting work experience",
    rowIndex: 0,
    resolvedCount: 1
  },
  {
    id: "education",
    kind: "extract",
    kicker: "Education",
    title: "BCom Degree @ UCT",
    subtitle: "Qualification recognised and prepared for review.",
    status: "Extracting education",
    rowIndex: 1,
    resolvedCount: 2
  },
  {
    id: "almost-done",
    kind: "almost",
    kicker: "Preparing",
    title: "Almost done",
    subtitle: "Organising everything into your editable career history.",
    status: "Almost done",
    rowIndex: 2,
    resolvedCount: 3
  },
  {
    id: "complete",
    kind: "complete",
    kicker: "Ready",
    title: "All set!",
    subtitle: "Opening your career history editor now.",
    status: "All set!",
    rowIndex: null,
    resolvedCount: 3
  }
] as const;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
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

function LoadingState(): JSX.Element {
  return (
    <div className="job-view__shell">
      <ApplicationStepShell>
        <div className="application-step__panel surface-card skeleton skeleton--sheet" />
      </ApplicationStepShell>
    </div>
  );
}

function MissingState(): JSX.Element {
  return (
    <div className="job-view__shell">
      <ApplicationStepShell>
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
      <ApplicationStepShell>
        <section className="application-step__panel application-step__guard surface-card surface-card--section">
          <h1>Continue your application</h1>
          <p className="muted-copy">Sign in before we build your career history for {job.title}.</p>
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
      <ApplicationStepShell>
        <section className="application-step__panel application-step__guard surface-card surface-card--section">
          <h1>Resume required</h1>
          <p className="muted-copy">Upload a resume before we build your career history for {job.title}.</p>
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

function SourceDocumentCard({
  activeRow,
  phase,
  resolvedCount,
  resume
}: {
  activeRow: number | null;
  phase: ParsingPhase;
  resolvedCount: number;
  resume: PrototypeResumeRecord;
}): JSX.Element {
  const getRowState = (index: number): string => {
    if (activeRow === index && phase !== "complete") {
      return "is-active";
    }

    if (index < resolvedCount || phase === "complete") {
      return "is-processed";
    }

    return "";
  };

  return (
    <article className="career-parsing-focused__source" aria-label={`Uploaded resume ${resume.fileName}`}>
      <div className="career-parsing-focused__card-topline">
        <span className="career-parsing-focused__card-badge">CV</span>
        <p>{resume.fileName}</p>
      </div>

      <div className="career-parsing-focused__source-paper">
        <div className="career-parsing-focused__source-paper-header">
          <div>
            <strong>Resume snapshot</strong>
            <p>Review-ready details being pulled into your career history.</p>
          </div>
          <span className="career-parsing-focused__source-paper-chip">Profile</span>
        </div>

        <div
          className={[
            "career-parsing-focused__document",
            phase === "intro" || phase === "extracting" ? "is-busy" : ""
          ]
            .filter(Boolean)
            .join(" ")}
          aria-hidden="true"
        >
          {SOURCE_ROWS.map((row, index) => (
            <section className="career-parsing-focused__document-section" key={row.id}>
              <span className="career-parsing-focused__document-kicker">{row.section}</span>
              <div className={["career-parsing-focused__source-row", getRowState(index)].filter(Boolean).join(" ")}>
                <strong>{row.title}</strong>
                <span>{row.detail}</span>
              </div>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}

function FocusCard({ frame }: { frame: ParsingFrame }): JSX.Element {
  return (
    <article
      key={frame.id}
      className={[
        "career-parsing-focused__focus-card",
        `career-parsing-focused__focus-card--${frame.kind}`
      ].join(" ")}
      aria-live="polite"
    >
      <div
        className={[
          "career-parsing-focused__focus-graphic",
          `career-parsing-focused__focus-graphic--${frame.kind}`
        ].join(" ")}
        aria-hidden="true"
      >
        <span />
        <span />
        <span />
      </div>

      <div className="career-parsing-focused__focus-copy">
        <span className="career-parsing-focused__focus-kicker">{frame.kicker}</span>
        <strong>{frame.title}</strong>
        <p>{frame.subtitle}</p>
      </div>
    </article>
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
  const [frameIndex, setFrameIndex] = useState(0);
  const [phase, setPhase] = useState<ParsingPhase>("intro");
  const hasNavigatedRef = useRef(false);

  const selectedResume = useMemo(
    () =>
      resumeState?.resumes.find((resume) => resume.id === resumeState.selectedResumeId) ??
      resumeState?.resumes[0] ??
      null,
    [resumeState]
  );

  const historyState = useMemo(
    () => buildPrototypeCareerHistoryState(job, selectedResume?.id ?? null),
    [job, selectedResume?.id]
  );

  const navigateToHistory = (): void => {
    if (!session || !selectedResume || hasNavigatedRef.current) {
      return;
    }

    hasNavigatedRef.current = true;
    savePrototypeCareerHistoryState(session, job.id, historyState);
    window.location.assign(buildApplicationCareerHistoryPath(job.id));
  };

  useEffect(() => {
    if (!session || !selectedResume) {
      return;
    }

    savePrototypeCareerHistoryState(session, job.id, historyState);
  }, [historyState, job.id, selectedResume, session]);

  useEffect(() => {
    if (!session || !selectedResume) {
      return;
    }

    const timings = prefersReducedMotion
      ? {
          intro: 260,
          extract: 380,
          almost: 300,
          complete: 280,
          exit: 180
        }
      : {
          intro: 460,
          extract: 700,
          almost: 520,
          complete: 420,
          exit: 220
        };

    let cancelled = false;
    hasNavigatedRef.current = false;

    const runSequence = async (): Promise<void> => {
      setPhase("intro");
      setFrameIndex(0);

      await wait(timings.intro);
      if (cancelled || hasNavigatedRef.current) {
        return;
      }

      setPhase("extracting");
      setFrameIndex(1);

      await wait(timings.extract);
      if (cancelled || hasNavigatedRef.current) {
        return;
      }

      setFrameIndex(2);

      await wait(timings.extract);
      if (cancelled || hasNavigatedRef.current) {
        return;
      }

      setFrameIndex(3);

      await wait(timings.almost);
      if (cancelled || hasNavigatedRef.current) {
        return;
      }

      setPhase("complete");
      setFrameIndex(4);

      await wait(timings.complete);
      if (cancelled || hasNavigatedRef.current) {
        return;
      }

      setPhase("exiting");

      await wait(timings.exit);
      if (cancelled || hasNavigatedRef.current) {
        return;
      }

      navigateToHistory();
    };

    runSequence();

    return () => {
      cancelled = true;
    };
  }, [historyState, job.id, prefersReducedMotion, selectedResume, session]);

  if (!session) {
    return <SessionGuard job={job} />;
  }

  if (!selectedResume) {
    return <MissingResumeState job={job} />;
  }

  const frame = PARSING_FRAMES[frameIndex];

  return (
    <div className="job-view__shell">
      <ApplicationStepShell>
        <section
          className={[
            "application-step__panel",
            "career-parsing-focused",
            "surface-card",
            phase === "exiting" ? "is-exiting" : ""
          ]
            .filter(Boolean)
            .join(" ")}
          aria-labelledby="career-parsing-heading"
        >
          <div className="career-parsing-focused__chrome">
            <button className="button button--ghost career-parsing-focused__skip" onClick={navigateToHistory} type="button">
              Skip
            </button>
          </div>

          <header className="career-parsing-focused__intro">
            <h1 id="career-parsing-heading">Building your career history</h1>
            <p>
              We’re pulling out your roles, companies, dates, and experience so you can review and
              edit everything next.
            </p>
          </header>

          <div className="career-parsing-focused__module" data-phase={phase} data-frame={frame.kind}>
            <div className="career-parsing-focused__stack">
              <SourceDocumentCard
                activeRow={frame.rowIndex}
                phase={phase}
                resolvedCount={frame.resolvedCount}
                resume={selectedResume}
              />
              <FocusCard frame={frame} />
            </div>
          </div>

          <div className="career-parsing-focused__status" aria-live="polite">
            <p className={phase === "complete" ? "is-complete" : undefined}>{frame.status}</p>
          </div>

          <p className="career-parsing-focused__reassurance">
            Next, you’ll review your career history before continuing.
          </p>
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
