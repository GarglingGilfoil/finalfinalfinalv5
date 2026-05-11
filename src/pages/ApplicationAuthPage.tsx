import { useEffect, useState } from "react";
import { getJobView, readJobView } from "../api/jobs";
import { ApplicationUnavailableState } from "../components/ApplicationGuardStates";
import { useApplicationRouteTransition } from "../hooks/useApplicationRouteTransition";
import { getNextApplicationPath } from "../lib/applicationGuards";
import { buildPrototypeSession, readPrototypeSession, savePrototypeSession } from "../lib/prototype-auth";
import {
  buildApplicationAuthPath,
  buildApplicationUploadPath,
  getSafeAuthNextPath,
  isCanonicalAuthMode,
  navigateTo
} from "../lib/router";
import type { ApplicationAuthMode, AuthProvider } from "../contracts/application";
import type { JobViewData } from "../contracts/job-view";
import { ApplicationAuthShell } from "../components/ApplicationAuthShell";
import { ApplicationForgotPasswordForm } from "../components/ApplicationForgotPasswordForm";
import { ApplicationSetNewPasswordForm } from "../components/ApplicationSetNewPasswordForm";
import { ApplicationSignInForm } from "../components/ApplicationSignInForm";
import { ApplicationSignUpForm } from "../components/ApplicationSignUpForm";

interface ApplicationAuthPageProps {
  initialMode: ApplicationAuthMode;
  jobId: string;
}

type LoadState = "loading" | "ready" | "missing";

interface AuthSuccessInput {
  email: string;
  firstName?: string;
  lastName?: string;
  provider: AuthProvider;
  entryMode: "signin" | "signup";
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
    <ApplicationUnavailableState
      copy="The role may have moved, expired, or is no longer available."
      title="Application not available"
    />
  );
}

function resolveSafeAuthDestination(jobId: string): string {
  const safeNext = getSafeAuthNextPath(window.location.search);

  if (!safeNext) {
    return getNextApplicationPath(jobId);
  }

  if (safeNext.startsWith(`/jobs/${jobId}/apply/`)) {
    return getNextApplicationPath(jobId);
  }

  return safeNext;
}

function ReadyState({
  initialMode,
  job,
  jobId
}: {
  initialMode: ApplicationAuthMode;
  job: JobViewData;
  jobId: string;
}): JSX.Element {
  const [mode, setMode] = useState<ApplicationAuthMode>(initialMode);
  const { transitionTo } = useApplicationRouteTransition();

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (isCanonicalAuthMode(window.location.search)) {
      return;
    }

    navigateTo(
      buildApplicationAuthPath(jobId, initialMode, {
        next: getSafeAuthNextPath(window.location.search)
      }),
      { replace: true }
    );
  }, [initialMode, jobId]);

  useEffect(() => {
    if (initialMode !== "signin" && initialMode !== "signup") {
      return;
    }

    if (!readPrototypeSession()) {
      return;
    }

    transitionTo(resolveSafeAuthDestination(job.id), {
      direction: "forward",
      replace: true,
      source: "guard-recovery"
    });
  }, [initialMode, job.id, transitionTo]);

  useEffect(() => {
    const handlePopState = (): void => {
      const searchMode = new URLSearchParams(window.location.search).get("mode");

      if (
        searchMode === "signup" ||
        searchMode === "forgot-password" ||
        searchMode === "set-new-password"
      ) {
        setMode(searchMode);
        return;
      }

      setMode("signin");
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const updateMode = (nextMode: ApplicationAuthMode): void => {
    setMode(nextMode);
    navigateTo(
      buildApplicationAuthPath(jobId, nextMode, {
        next: getSafeAuthNextPath(window.location.search)
      })
    );
  };

  const handleAuthSuccess = async (input: AuthSuccessInput): Promise<void> => {
    const session = buildPrototypeSession(input);
    savePrototypeSession(session);
    transitionTo(resolveSafeAuthDestination(jobId), {
      direction: "forward",
      source: "auth-complete"
    });
  };

  return (
    <div className="job-view__shell">
      <ApplicationAuthShell job={job} mode={mode}>
        {mode === "signin" ? (
          <ApplicationSignInForm
            job={job}
            onAuthSuccess={handleAuthSuccess}
            onModeChange={updateMode}
          />
        ) : null}

        {mode === "signup" ? (
          <ApplicationSignUpForm
            job={job}
            onAuthSuccess={handleAuthSuccess}
            onModeChange={updateMode}
          />
        ) : null}

        {mode === "forgot-password" ? (
          <ApplicationForgotPasswordForm onModeChange={updateMode} />
        ) : null}

        {mode === "set-new-password" ? (
          <ApplicationSetNewPasswordForm onModeChange={updateMode} />
        ) : null}
      </ApplicationAuthShell>
    </div>
  );
}

export function ApplicationAuthPage({
  initialMode,
  jobId
}: ApplicationAuthPageProps): JSX.Element {
  const initialJob = readJobView(jobId);
  const [state, setState] = useState<LoadState>(() => (initialJob ? "ready" : "loading"));
  const [job, setJob] = useState<JobViewData | null>(initialJob);

  useEffect(() => {
    let cancelled = false;
    const cachedJob = readJobView(jobId);

    setJob(cachedJob);
    setState(cachedJob ? "ready" : "loading");

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

  return <ReadyState initialMode={initialMode} job={job} jobId={jobId} />;
}
