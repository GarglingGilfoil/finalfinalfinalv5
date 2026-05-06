import { useEffect, useState } from "react";
import { getJobView, readJobView } from "../api/jobs";
import { useApplicationRouteTransition } from "../hooks/useApplicationRouteTransition";
import { buildPrototypeSession, savePrototypeSession } from "../lib/prototype-auth";
import {
  buildApplicationAuthPath,
  buildApplicationUploadPath,
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
    <div className="job-view__shell">
      <section className="job-view__stack">
        <div className="surface-card surface-card--section">
          <p className="section-kicker">Unavailable</p>
          <h1>Application not available</h1>
          <p className="muted-copy">
            We couldn’t resolve the role you were trying to apply to. Return to the job
            view and try again.
          </p>
        </div>
      </section>
    </div>
  );
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
    navigateTo(buildApplicationAuthPath(jobId, nextMode));
  };

  const handleAuthSuccess = async (input: AuthSuccessInput): Promise<void> => {
    const session = buildPrototypeSession(input);
    savePrototypeSession(session);
    transitionTo(buildApplicationUploadPath(jobId), {
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
