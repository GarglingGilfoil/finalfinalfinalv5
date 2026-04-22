import { useEffect, useState } from "react";
import { getJobView } from "../api/jobs";
import { buildPrototypeSession, savePrototypeSession } from "../lib/prototype-auth";
import {
  buildApplicationAuthPath,
  buildApplicationUploadPath
} from "../lib/router";
import type { ApplicationAuthMode, AuthProvider } from "../contracts/application";
import type { JobViewData } from "../contracts/job-view";
import { ApplicationAuthShell } from "../components/ApplicationAuthShell";
import { ApplicationForgotPasswordForm } from "../components/ApplicationForgotPasswordForm";
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

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    const handlePopState = (): void => {
      const searchMode = new URLSearchParams(window.location.search).get("mode");

      if (searchMode === "signup" || searchMode === "forgot-password") {
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
    window.history.pushState({}, "", buildApplicationAuthPath(jobId, nextMode));
  };

  const handleAuthSuccess = async (input: AuthSuccessInput): Promise<void> => {
    const session = buildPrototypeSession(input);
    savePrototypeSession(session);
    window.location.assign(buildApplicationUploadPath(jobId));
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
      </ApplicationAuthShell>
    </div>
  );
}

export function ApplicationAuthPage({
  initialMode,
  jobId
}: ApplicationAuthPageProps): JSX.Element {
  const [state, setState] = useState<LoadState>("loading");
  const [job, setJob] = useState<JobViewData | null>(null);

  useEffect(() => {
    let cancelled = false;

    setState("loading");
    setJob(null);

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
