import { useEffect, useMemo, useState } from "react";
import { getJobView } from "../api/jobs";
import { ApplicationAuthShell } from "../components/ApplicationAuthShell";
import { ApplicationStepShell } from "../components/ApplicationStepShell";
import type {
  CandidateResumeState,
  CandidateSession,
  PrototypeResumeRecord
} from "../contracts/application";
import type { JobViewData } from "../contracts/job-view";
import { readPrototypeSession } from "../lib/prototype-auth";
import { readPrototypeResumeState } from "../lib/prototype-resume";
import {
  buildApplicationAuthPath,
  buildApplicationUploadPath,
  buildJobViewPath
} from "../lib/router";

interface ApplicationConfirmPageProps {
  jobId: string;
}

type LoadState = "loading" | "ready" | "missing";

function formatFileSize(size: number): string {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function formatResumeDate(value: string): string {
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function LoadingState(): JSX.Element {
  return (
    <div className="job-view__shell">
      <section className="application-auth">
        <div className="application-auth__layout surface-card skeleton skeleton--sheet" />
      </section>
    </div>
  );
}

function MissingState(): JSX.Element {
  return (
    <div className="job-view__shell">
      <section className="job-view__stack">
        <div className="surface-card surface-card--section">
          <p className="section-kicker">Unavailable</p>
          <h1>Application step not available</h1>
          <p className="muted-copy">We couldn’t resolve this role. Return to the job page and try again.</p>
        </div>
      </section>
    </div>
  );
}

function GuardState({ job }: { job: JobViewData }): JSX.Element {
  return (
    <div className="job-view__shell">
      <ApplicationStepShell>
        <section className="application-step__panel application-step__guard surface-card surface-card--section">
          <p className="section-kicker">Sign in required</p>
          <h1>Continue your application</h1>
          <p className="muted-copy">
            Sign in or create an account before you continue with your application for {job.title}.
          </p>
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

function ResumeSummary({ resume }: { resume: PrototypeResumeRecord | null }): JSX.Element {
  if (!resume) {
    return (
      <div className="application-confirm__summary surface-card surface-card--section">
        <p className="section-kicker">Resume required</p>
        <h2>No resume selected yet</h2>
        <p className="muted-copy">
          Return to the upload step and choose a resume before you continue.
        </p>
      </div>
    );
  }

  return (
    <div className="application-confirm__summary surface-card surface-card--section">
      <p className="section-kicker">Resume linked</p>
      <h2>{resume.fileName}</h2>
      <p className="muted-copy">
        {resume.fileExtension.toUpperCase()} · {formatFileSize(resume.fileSize)} · Updated {formatResumeDate(resume.uploadedAt)}
      </p>
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
  const selectedResume = useMemo(
    () =>
      resumeState?.resumes.find((resume) => resume.id === resumeState.selectedResumeId) ?? null,
    [resumeState]
  );

  if (!session) {
    return <GuardState job={job} />;
  }

  return (
    <div className="job-view__shell">
      <ApplicationAuthShell
        contextMessage="We’ve linked your resume and are ready for the next application step."
        job={job}
      >
        <section className="resume-upload-card application-confirm-card">
          <header className="resume-upload-card__header">
            <p className="section-kicker">Application step</p>
            <h1>Career confirmation is next</h1>
            <p className="resume-upload-card__lead">
              Your profile is signed in as {session.firstName} {session.lastName} and your resume is ready for parsing.
            </p>
          </header>

          <ResumeSummary resume={selectedResume} />

          <div className="application-confirm__body surface-card surface-card--section">
            <h2>Next up</h2>
            <p className="muted-copy">
              This prototype is now ready for the parsed results and career confirmation step. The selected resume is attached to {job.title} at {job.companyName} and available for the next screen.
            </p>
          </div>

          <footer className="resume-upload-card__footer">
            <div className="resume-upload-card__footer-rule" aria-hidden="true" />
            <div className="resume-upload-card__footer-actions">
              <a className="button button--ghost" href={buildApplicationUploadPath(job.id)}>
                Back to upload
              </a>
              <a className="button button--job-primary" href={buildJobViewPath(job.id)}>
                Return to job view
              </a>
            </div>
          </footer>
        </section>
      </ApplicationAuthShell>
    </div>
  );
}

export function ApplicationConfirmPage({ jobId }: ApplicationConfirmPageProps): JSX.Element {
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
