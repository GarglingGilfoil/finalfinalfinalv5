import { useEffect, useMemo, useState } from "react";
import { getJobView, readJobView } from "../api/jobs";
import { ApplicationUnavailableState } from "../components/ApplicationGuardStates";
import { ApplicationStepShell } from "../components/ApplicationStepShell";
import {
  ResumeUploadGuardCard,
  ResumeUploadSection
} from "../components/ResumeUploadSection";
import { useApplicationRouteTransition } from "../hooks/useApplicationRouteTransition";
import { getNextApplicationPath } from "../lib/applicationGuards";
import type {
  CandidateResumeState,
  CandidateSession,
  PrototypeResumeRecord
} from "../contracts/application";
import type { JobViewData } from "../contracts/job-view";
import {
  markPrototypeApplicationSubmitted,
  readPrototypeApplicationRecord
} from "../lib/prototype-application";
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
  return <ApplicationUnavailableState />;
}

function GuardState({ job }: { job: JobViewData }): JSX.Element {
  return (
    <div className="job-view__shell">
      <ApplicationStepShell>
        <ResumeUploadGuardCard
          authHref={buildApplicationAuthPath(job.id, "signin", {
            next: `${window.location.pathname}${window.location.search}`
          })}
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
  const { transitionTo } = useApplicationRouteTransition();

  useEffect(() => {
    setResumeState(initialResumeState);
  }, [initialResumeState]);

  const existingApplication = useMemo(
    () => (session ? readPrototypeApplicationRecord(session, job.id) : null),
    [job.id, session]
  );

  useEffect(() => {
    if (!existingApplication) {
      return;
    }

    transitionTo(getNextApplicationPath(job.id), {
      direction: "forward",
      replace: true,
      source: "guard-recovery"
    });
  }, [existingApplication, job.id, transitionTo]);

  if (!session) {
    return <GuardState job={job} />;
  }

  if (existingApplication) {
    return <LoadingState />;
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
    markPrototypeApplicationSubmitted(session, job.id, resume.id);
    transitionTo(buildApplicationParsingPath(job.id), {
      direction: "forward",
      source: "resume-upload-complete"
    });
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
  const initialJob = readJobView(jobId);
  const [state, setState] = useState<LoadState>(() => (initialJob ? "ready" : "loading"));
  const [job, setJob] = useState<JobViewData | null>(initialJob);
  const [session, setSession] = useState<CandidateSession | null>(null);
  const [resumeState, setResumeState] = useState<CandidateResumeState>({
    resumes: [],
    selectedResumeId: null
  });

  useEffect(() => {
    let cancelled = false;
    const cachedJob = readJobView(jobId);

    setJob(cachedJob);
    setState(cachedJob ? "ready" : "loading");

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
