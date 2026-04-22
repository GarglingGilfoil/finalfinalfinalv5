import { useEffect, useMemo, useState } from "react";
import { getJobView } from "../api/jobs";
import { ApplicationStepShell } from "../components/ApplicationStepShell";
import { CompanyApplicationHeading } from "../components/ResumeUploadSection";
import type {
  CandidateCareerHistoryState,
  CandidateResumeState,
  CandidateSession,
  PrototypeCareerEntry
} from "../contracts/application";
import type { JobViewData } from "../contracts/job-view";
import { readPrototypeSession } from "../lib/prototype-auth";
import {
  buildPrototypeCareerHistoryState,
  readPrototypeCareerHistoryState,
  savePrototypeCareerHistoryState
} from "../lib/prototype-career-history";
import { readPrototypeResumeState } from "../lib/prototype-resume";
import {
  buildApplicationAuthPath,
  buildApplicationUploadPath,
  buildJobViewPath
} from "../lib/router";

interface ApplicationCareerHistoryPageProps {
  jobId: string;
}

type LoadState = "loading" | "ready" | "missing";

function formatParsedDate(value: string): string {
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
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
          <p className="muted-copy">We couldn’t resolve the role for this career history step.</p>
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
          <p className="muted-copy">Sign in before you review and edit your career history for {job.title}.</p>
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
          <p className="muted-copy">Upload a resume before you review your career history for {job.title}.</p>
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

function CareerHistoryEntryEditor({
  entry,
  index,
  onChange
}: {
  entry: PrototypeCareerEntry;
  index: number;
  onChange: (entryId: string, field: keyof PrototypeCareerEntry, value: string) => void;
}): JSX.Element {
  return (
    <article className="career-history-entry">
      <div className="career-history-entry__header">
        <span className="career-history-entry__index">Role {index + 1}</span>
        <span className="career-history-entry__state">Parsed from CV</span>
      </div>

      <div className="career-history-entry__grid">
        <label className="auth-field">
          <span className="auth-field__label">Role title</span>
          <input
            className="auth-field__input"
            onChange={(event) => {
              onChange(entry.id, "roleTitle", event.target.value);
            }}
            type="text"
            value={entry.roleTitle}
          />
        </label>

        <label className="auth-field">
          <span className="auth-field__label">Company</span>
          <input
            className="auth-field__input"
            onChange={(event) => {
              onChange(entry.id, "companyName", event.target.value);
            }}
            type="text"
            value={entry.companyName}
          />
        </label>
      </div>

      <div className="career-history-entry__grid career-history-entry__grid--secondary">
        <label className="auth-field">
          <span className="auth-field__label">Start date</span>
          <input
            className="auth-field__input"
            onChange={(event) => {
              onChange(entry.id, "startDateLabel", event.target.value);
            }}
            type="text"
            value={entry.startDateLabel}
          />
        </label>

        <label className="auth-field">
          <span className="auth-field__label">End date</span>
          <input
            className="auth-field__input"
            onChange={(event) => {
              onChange(entry.id, "endDateLabel", event.target.value);
            }}
            type="text"
            value={entry.endDateLabel}
          />
        </label>

        <label className="auth-field">
          <span className="auth-field__label">Location</span>
          <input
            className="auth-field__input"
            onChange={(event) => {
              onChange(entry.id, "location", event.target.value);
            }}
            type="text"
            value={entry.location}
          />
        </label>
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
  const selectedResume = useMemo(
    () =>
      resumeState?.resumes.find((resume) => resume.id === resumeState.selectedResumeId) ??
      resumeState?.resumes[0] ??
      null,
    [resumeState]
  );

  const [historyState, setHistoryState] = useState<CandidateCareerHistoryState | null>(null);

  useEffect(() => {
    if (!session || !selectedResume) {
      setHistoryState(null);
      return;
    }

    const existing = readPrototypeCareerHistoryState(session, job.id);
    const nextState =
      existing && existing.sourceResumeId === selectedResume.id
        ? existing
        : buildPrototypeCareerHistoryState(job, selectedResume.id);

    setHistoryState(nextState);
    savePrototypeCareerHistoryState(session, job.id, nextState);
  }, [job, selectedResume, session]);

  useEffect(() => {
    if (!session || !historyState) {
      return;
    }

    savePrototypeCareerHistoryState(session, job.id, historyState);
  }, [historyState, job.id, session]);

  if (!session) {
    return <SessionGuard job={job} />;
  }

  if (!selectedResume) {
    return <MissingResumeState job={job} />;
  }

  if (!historyState) {
    return <LoadingState />;
  }

  const handleEntryChange = (
    entryId: string,
    field: keyof PrototypeCareerEntry,
    value: string
  ): void => {
    setHistoryState((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        entries: current.entries.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                [field]: value
              }
            : entry
        )
      };
    });
  };

  return (
    <div className="job-view__shell">
      <ApplicationStepShell>
        <section className="application-step__panel career-history-card resume-upload-card surface-card">
          <header className="resume-upload-card__header">
            <p className="section-kicker">Career history</p>
            <h1>Review your work history</h1>
            <p className="resume-upload-card__lead">
              We pulled these roles from your CV. Check the details and edit anything that needs a
              tweak before you continue.
            </p>
          </header>

          <CompanyApplicationHeading job={job} session={session} />

          <div className="career-history-card__body">
            <div className="career-history-card__origin">
              <div>
                <strong>Parsed from {selectedResume.fileName}</strong>
                <p>Updated {formatParsedDate(historyState.parsedAt)} from the CV you just uploaded.</p>
              </div>
              <span className="career-history-card__origin-badge">Career history ready</span>
            </div>

            <div className="career-history-card__entries">
              {historyState.entries.map((entry, index) => (
                <CareerHistoryEntryEditor
                  entry={entry}
                  index={index}
                  key={entry.id}
                  onChange={handleEntryChange}
                />
              ))}
            </div>
          </div>

          <footer className="resume-upload-card__footer career-history-card__footer">
            <div className="resume-upload-card__footer-rule" aria-hidden="true" />
            <div className="career-history-card__footer-row">
              <p>Changes save automatically in this prototype.</p>
              <a className="button button--ghost" href={buildApplicationUploadPath(job.id)}>
                Back to resume upload
              </a>
            </div>
          </footer>
        </section>
      </ApplicationStepShell>
    </div>
  );
}

export function ApplicationCareerHistoryPage({
  jobId
}: ApplicationCareerHistoryPageProps): JSX.Element {
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
