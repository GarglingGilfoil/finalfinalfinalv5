import { useEffect, useState } from "react";
import { getJobView } from "../api/jobs";
import { ApplicationStepShell } from "../components/ApplicationStepShell";
import {
  ResumeUploadGuardCard,
  ResumeUploadSection
} from "../components/ResumeUploadSection";
import type {
  CandidateResumeState,
  CandidateSession,
  PrototypeResumeRecord
} from "../contracts/application";
import type { JobViewData } from "../contracts/job-view";
import { readPrototypeSession } from "../lib/prototype-auth";
import {
  readOrCreatePrototypeResumeState,
  savePrototypeResumeState
} from "../lib/prototype-resume";
import {
  buildApplicationAuthPath,
  buildApplicationParsingPath,
  buildJobViewPath
} from "../lib/router";

interface ApplicationUploadPageProps {
  jobId: string;
}

type LoadState = "loading" | "ready" | "missing";

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
          <p className="section-kicker">Unavailable</p>
          <h1>Application step not available</h1>
          <p className="muted-copy">
            We couldn’t resolve the role for this application step.
          </p>
        </section>
      </ApplicationStepShell>
    </div>
  );
}

function GuardState({ job }: { job: JobViewData }): JSX.Element {
  return (
    <div className="job-view__shell">
      <ApplicationStepShell>
        <ResumeUploadGuardCard
          authHref={buildApplicationAuthPath(job.id, "signin")}
          backHref={buildJobViewPath(job.id)}
          job={job}
        />
      </ApplicationStepShell>
    </div>
  );
}

function ReadyState({
  initialResumeState,
  job,
  session
}: {
  initialResumeState: CandidateResumeState;
  job: JobViewData;
  session: CandidateSession | null;
}): JSX.Element {
  const [resumeState, setResumeState] = useState<CandidateResumeState>(initialResumeState);

  useEffect(() => {
    setResumeState(initialResumeState);
  }, [initialResumeState]);

  if (!session) {
    return <GuardState job={job} />;
  }

  const updateResumeState = (nextState: CandidateResumeState): void => {
    setResumeState(nextState);
    savePrototypeResumeState(session.email, nextState);
  };

  const handleContinue = (resume: PrototypeResumeRecord): void => {
    const nextState: CandidateResumeState = {
      resumes: resumeState.resumes,
      selectedResumeId: resume.id
    };

    updateResumeState(nextState);
    window.location.assign(buildApplicationParsingPath(job.id));
  };

  return (
    <div className="job-view__shell">
      <ApplicationStepShell>
        <ResumeUploadSection
          backHref={buildJobViewPath(job.id)}
          job={job}
          onContinue={handleContinue}
          onResumeStateChange={updateResumeState}
          resumeState={resumeState}
          session={session}
        />
      </ApplicationStepShell>
    </div>
  );
}

export function ApplicationUploadPage({ jobId }: ApplicationUploadPageProps): JSX.Element {
  const [state, setState] = useState<LoadState>("loading");
  const [job, setJob] = useState<JobViewData | null>(null);
  const [session, setSession] = useState<CandidateSession | null>(null);
  const [resumeState, setResumeState] = useState<CandidateResumeState>({
    resumes: [],
    selectedResumeId: null
  });

  useEffect(() => {
    let cancelled = false;

    setState("loading");
    setJob(null);

    const prototypeSession = readPrototypeSession();
    setSession(prototypeSession);

    if (prototypeSession) {
      setResumeState(readOrCreatePrototypeResumeState(prototypeSession));
    } else {
      setResumeState({
        resumes: [],
        selectedResumeId: null
      });
    }

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

  return <ReadyState initialResumeState={resumeState} job={job} session={session} />;
}
